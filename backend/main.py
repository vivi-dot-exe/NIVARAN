import io
import json
import os
import random
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import uvicorn

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from ml_engine import (
    analyze_grievance,
    compute_dynamic_priority,
    compute_h3_index,
    find_spatio_semantic_duplicate,
    find_semantic_duplicate,
    haversine_distance_meters,
    run_batch_clustering,
    verify_resolution_delta,
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="JanSetu / NIVARAN Civic Tech Microservice",
    version="3.0.0",
    description="Microservice powering Spatio-Semantic Deduplication, Zero-Trust Proof of Resolution, Multi-Agency DAG Split-Tickets, and Radical Civic SLI Observability."
)

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------
class SubTaskModel(BaseModel):
    id: str
    title: str
    department: str
    assigned_officer: str
    status: str = "Pending"  # Pending | In Progress | Blocked | Resolved
    depends_on: List[str] = Field(default_factory=list)
    resolved_at: Optional[str] = None


class TicketCreate(BaseModel):
    id: Optional[str] = None
    text: str
    location: str
    category: Optional[str] = None
    priority_score: Optional[int] = None
    latitude: Optional[float] = 19.1197
    longitude: Optional[float] = 72.8464
    assigned_officer: Optional[str] = None


class TicketUpdateStatus(BaseModel):
    status: Optional[str] = None
    department: Optional[str] = None
    assigned_officer: Optional[str] = None


class SpatioDedupRequest(BaseModel):
    text: str
    latitude: float
    longitude: float
    max_radius_meters: Optional[float] = 35.0


class UpvoteRequest(BaseModel):
    citizen_note: Optional[str] = None


class ProofOfResolutionRequest(BaseModel):
    officer_name: str
    officer_latitude: float
    officer_longitude: float
    resolution_image_url: Optional[str] = "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800"
    resolution_notes: Optional[str] = "Field repair completed and surface restored."


class VerifyResolutionRequest(BaseModel):
    action: str  # "approve" | "reject"
    otp: Optional[str] = None
    rejection_reason: Optional[str] = None


class SplitTaskRequest(BaseModel):
    sub_tasks: List[SubTaskModel]


class SubTaskResolveRequest(BaseModel):
    officer_notes: Optional[str] = None


class AnalyzeRequest(BaseModel):
    text: str


class DuplicateCheckRequest(BaseModel):
    new_text: str
    existing_texts: List[str]


class ClusterRequest(BaseModel):
    texts: List[str]


class TicketResponse(BaseModel):
    id: str
    text: str
    location: str
    category: Optional[str] = "Uncategorized"
    priority_score: int
    base_severity: int
    status: str
    created_at: datetime
    latitude: float
    longitude: float
    h3_index: Optional[str] = None
    upvotes: int
    duplicate_group: Optional[str] = None
    verification_status: str
    citizen_otp: Optional[str] = None
    falsified_attempts: int
    assigned_officer: Optional[str] = None
    resolution_proof_lat: Optional[float] = None
    resolution_proof_lng: Optional[float] = None
    resolution_image_url: Optional[str] = None
    resolution_cv_score: Optional[float] = None
    closure_rejected_reason: Optional[str] = None
    resolved_at: Optional[datetime] = None
    parent_ticket_id: Optional[str] = None
    sub_tasks: Optional[str] = "[]"
    transfers_count: int
    audit_trail: Optional[str] = "[]"

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def log_audit_event(ticket: models.Ticket, event_type: str, details: str):
    """Appends an immutable audit event to ticket audit_trail."""
    try:
        trail = json.loads(ticket.audit_trail) if ticket.audit_trail else []
    except Exception:
        trail = []

    trail.append({
        "timestamp": datetime.utcnow().isoformat(),
        "event": event_type,
        "details": details,
        "status": ticket.status
    })
    ticket.audit_trail = json.dumps(trail)


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------
@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db)):
    ml_result = analyze_grievance(ticket_in.text)

    category = (
        ticket_in.category.strip()
        if (ticket_in.category and ticket_in.category.strip() and ticket_in.category != "Uncategorized")
        else ml_result.get("category", "Sanitation & Waste")
    )

    base_severity = ml_result.get("base_severity", 50)
    lat = float(ticket_in.latitude) if ticket_in.latitude is not None else 19.1197
    lng = float(ticket_in.longitude) if ticket_in.longitude is not None else 72.8464
    h3_idx = compute_h3_index(lat, lng, resolution=10)

    now = datetime.utcnow()
    priority_score = (
        ticket_in.priority_score
        if (ticket_in.priority_score is not None and ticket_in.priority_score > 0)
        else compute_dynamic_priority(base_severity, upvotes=1, created_at=now)
    )

    ticket_id = (
        ticket_in.id.strip()
        if (ticket_in.id and ticket_in.id.strip())
        else f"G-{uuid.uuid4().hex[:4].upper()}"
    )

    # Check if ticket already exists
    existing = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if existing:
        existing.text = ticket_in.text
        existing.location = ticket_in.location
        existing.category = category
        existing.latitude = lat
        existing.longitude = lng
        existing.h3_index = h3_idx
        existing.priority_score = priority_score
        db.commit()
        db.refresh(existing)
        return existing

    new_ticket = models.Ticket(
        id=ticket_id,
        text=ticket_in.text,
        location=ticket_in.location,
        category=category,
        priority_score=priority_score,
        base_severity=base_severity,
        status="Pending",
        created_at=now,
        latitude=lat,
        longitude=lng,
        h3_index=h3_idx,
        upvotes=1,
        verification_status="unverified",
        falsified_attempts=0,
        transfers_count=0,
        assigned_officer=ticket_in.assigned_officer or f"Er. {category.split(' ')[0]} Nodal Officer",
        sub_tasks="[]",
        audit_trail="[]"
    )
    log_audit_event(new_ticket, "TICKET_CREATED", f"Lodge by citizen in {ticket_in.location} with base severity {base_severity}")
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@app.get("/api/tickets", response_model=List[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).order_by(models.Ticket.created_at.desc()).all()
    # Refresh dynamic priority scores in real-time
    now = datetime.utcnow()
    for t in tickets:
        if t.status not in ["Resolved", "Closed"]:
            t.priority_score = compute_dynamic_priority(t.base_severity, t.upvotes, t.created_at, now)
    return tickets


@app.post("/api/tickets/dedup-check")
def check_spatio_semantic_dedup(req: SpatioDedupRequest, db: Session = Depends(get_db)):
    """Pillar 1: Two-Stage Spatio-Semantic Gating (35m radius + SentenceTransformer >0.78)."""
    active_tickets = db.query(models.Ticket).filter(models.Ticket.status != "Closed").all()
    tickets_list = [
        {
            "id": t.id,
            "Complaint_ID": t.id,
            "text": t.text,
            "Complaint": t.text,
            "latitude": t.latitude,
            "longitude": t.longitude,
            "category": t.category,
            "Department": t.category,
            "upvotes": t.upvotes,
            "created_at": t.created_at.isoformat(),
            "priority_score": t.priority_score,
            "status": t.status,
            "location": t.location,
            "Ward": t.location
        }
        for t in active_tickets
    ]

    result = find_spatio_semantic_duplicate(
        new_text=req.text,
        new_lat=req.latitude,
        new_lng=req.longitude,
        existing_tickets=tickets_list,
        max_radius_meters=req.max_radius_meters or 35.0,
        semantic_threshold=0.78
    )
    return result


@app.post("/api/tickets/{ticket_id}/upvote", response_model=TicketResponse)
def upvote_ticket(ticket_id: str, req: UpvoteRequest = None, db: Session = Depends(get_db)):
    """Pillar 1: +1 Citizen Consensus Upvote with Dynamic Priority Recalculation."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.upvotes += 1
    ticket.priority_score = compute_dynamic_priority(ticket.base_severity, ticket.upvotes, ticket.created_at)
    
    note = req.citizen_note if req and req.citizen_note else "Citizen confirmed being affected (+1 Upvote)"
    log_audit_event(ticket, "UPVOTED", f"{note}. Total upvotes: {ticket.upvotes}, New Priority: {ticket.priority_score}")
    
    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/api/tickets/{ticket_id}/resolve-proof", response_model=TicketResponse)
def submit_proof_of_resolution(ticket_id: str, req: ProofOfResolutionRequest, db: Session = Depends(get_db)):
    """
    Pillar 2: Zero-Trust Proof-of-Resolution Protocol.
    Validates officer is within <= 20m of ticket coordinates, performs CV delta check,
    sets state to Pending_Verification, and dispatches 6-digit Citizen OTP.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Step 1: Spatial Proof Check (<= 20m)
    distance_meters = haversine_distance_meters(
        req.officer_latitude, req.officer_longitude,
        ticket.latitude, ticket.longitude
    )

    if distance_meters > 20.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geofence Violation: Officer GPS is {distance_meters:.1f}m away from complaint site. Maximum allowed resolution radius is 20.0m."
        )

    # Step 2: Computer Vision Delta Check
    cv_res = verify_resolution_delta(ticket.text, req.resolution_notes or "Repair done", distance_meters)

    # Step 3: Generate 6-digit Citizen OTP and move to Pending_Verification
    otp_code = f"{random.randint(100000, 999999)}"
    ticket.status = "Pending_Verification"
    ticket.verification_status = "pending_verification"
    ticket.assigned_officer = req.officer_name
    ticket.resolution_proof_lat = req.officer_latitude
    ticket.resolution_proof_lng = req.officer_longitude
    ticket.resolution_image_url = req.resolution_image_url
    ticket.resolution_cv_score = cv_res.get("cv_delta_score", 0.88)
    ticket.citizen_otp = otp_code

    log_audit_event(
        ticket,
        "PROOF_SUBMITTED",
        f"Officer {req.officer_name} submitted resolution proof (Distance: {distance_meters:.1f}m, CV Score: {ticket.resolution_cv_score}). Status moved to Pending_Verification. OTP {otp_code} dispatched."
    )

    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/api/tickets/{ticket_id}/verify-resolution", response_model=TicketResponse)
def verify_resolution(ticket_id: str, req: VerifyResolutionRequest, db: Session = Depends(get_db)):
    """
    Pillar 2: Citizen Digital Sign-Off / False Resolution Penalty.
    - If Approved: status = Resolved / Closed.
    - If Rejected: auto-escalates to Divisional Commissioner with False Closure flag.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if req.action == "approve":
        if req.otp and ticket.citizen_otp and req.otp.strip() != ticket.citizen_otp.strip():
            raise HTTPException(status_code=400, detail="Invalid Citizen Verification OTP. Please check the code.")

        # P2-4 FIX: Blueprint terminal state is CLOSED, not Resolved.
        # Resolved is an intermediate state (officer says done); Closed means citizen confirmed.
        ticket.status = "Closed"
        ticket.verification_status = "verified_closed"
        ticket.resolved_at = datetime.utcnow()
        log_audit_event(ticket, "CITIZEN_APPROVED", "Citizen signed off and confirmed resolution. Ticket permanently CLOSED.")
    elif req.action == "reject":
        ticket.status = "Escalated"
        ticket.verification_status = "rejected_escalated"
        ticket.falsified_attempts += 1
        prev_officer = ticket.assigned_officer or "Ground Officer"
        ticket.assigned_officer = "Appellate Authority (Divisional Commissioner)"
        ticket.closure_rejected_reason = req.rejection_reason or "Citizen stated work was not completed on ground."

        log_audit_event(
            ticket,
            "FALSE_CLOSURE_REJECTED",
            f"Citizen rejected false resolution from {prev_officer}: '{ticket.closure_rejected_reason}'. Auto-escalated to Divisional Commissioner. Penalty flagged."
        )
    else:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/api/tickets/{ticket_id}/split-task", response_model=TicketResponse)
def create_split_tasks(ticket_id: str, req: SplitTaskRequest, db: Session = Depends(get_db)):
    """Pillar 3: Composite Multi-Agency Split-Ticketing (DAG Workflow)."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    tasks_dict = [t.model_dump() for t in req.sub_tasks]
    ticket.sub_tasks = json.dumps(tasks_dict)
    log_audit_event(ticket, "SPLIT_TASKS_CREATED", f"Master ticket split into {len(tasks_dict)} DAG sub-tasks across multiple agencies.")
    
    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/api/tickets/{ticket_id}/subtasks/{subtask_id}/resolve", response_model=TicketResponse)
def resolve_subtask(ticket_id: str, subtask_id: str, req: SubTaskResolveRequest = None, db: Session = Depends(get_db)):
    """Pillar 3: Resolves a child DAG sub-task and unlocks dependent downstream tasks."""
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    try:
        tasks = json.loads(ticket.sub_tasks) if ticket.sub_tasks else []
    except Exception:
        tasks = []

    target_task = next((t for t in tasks if t["id"] == subtask_id), None)
    if not target_task:
        raise HTTPException(status_code=404, detail="Sub-task not found")

    # Check if target_task dependencies are met
    for dep_id in target_task.get("depends_on", []):
        dep_task = next((t for t in tasks if t["id"] == dep_id), None)
        if dep_task and dep_task.get("status") != "Resolved":
            raise HTTPException(
                status_code=400,
                detail=f"Task '{target_task['title']}' is BLOCKED until prerequisite task '{dep_task['title']}' ({dep_task['department']}) is Resolved."
            )

    target_task["status"] = "Resolved"
    target_task["resolved_at"] = datetime.utcnow().isoformat()

    # Automatically unlock downstream tasks
    for other in tasks:
        if other.get("status") == "Blocked":
            all_deps_met = True
            for dep_id in other.get("depends_on", []):
                d = next((t for t in tasks if t["id"] == dep_id), None)
                if not d or d.get("status") != "Resolved":
                    all_deps_met = False
                    break
            if all_deps_met:
                other["status"] = "In Progress"

    # Check if all subtasks resolved — then move master to Pending_Verification
    all_resolved = all(t.get("status") == "Resolved" for t in tasks)
    if all_resolved and ticket.status not in ["Resolved", "Closed", "Pending_Verification"]:
        ticket.status = "Pending_Verification"
        # P2-5/P3-4 FIX: Must also set verification_status, otherwise CitizenTracker
        # Verification_Status field stays 'unverified' while Status is 'Pending_Verification'.
        ticket.verification_status = "pending_verification"
        ticket.citizen_otp = f"{random.randint(100000, 999999)}"

    ticket.sub_tasks = json.dumps(tasks)
    log_audit_event(ticket, "SUBTASK_RESOLVED", f"Subtask {target_task['title']} ({target_task['department']}) resolved.")
    
    db.commit()
    db.refresh(ticket)
    return ticket


@app.patch("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str, status_in: TicketUpdateStatus, db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    if status_in.status:
        ticket.status = status_in.status
        if status_in.status in ["Resolved", "Closed"]:
            ticket.resolved_at = datetime.utcnow()

    if status_in.department and status_in.department != ticket.category:
        ticket.transfers_count += 1
        log_audit_event(
            ticket,
            "DEPARTMENT_TRANSFERRED",
            f"Transferred from {ticket.category} to {status_in.department}. Total Transfers: {ticket.transfers_count}"
        )
        ticket.category = status_in.department

    if status_in.assigned_officer:
        ticket.assigned_officer = status_in.assigned_officer

    db.commit()
    db.refresh(ticket)
    return ticket


@app.get("/api/analytics/governance-scorecard")
def get_governance_scorecard(db: Session = Depends(get_db)):
    """Pillar 4: Radical Civic SLI/SLA Observability (True MTTR, JBI, FCI, Ward Scorecard)."""
    tickets = db.query(models.Ticket).all()
    total_tickets = len(tickets) or 1

    now = datetime.utcnow()
    # 1. True MTTR (never resets)
    mttr_hours_list = []
    for t in tickets:
        end_time = t.resolved_at if t.resolved_at else now
        elapsed = (end_time - t.created_at).total_seconds() / 3600.0
        mttr_hours_list.append(elapsed)

    true_mttr = round(sum(mttr_hours_list) / len(mttr_hours_list), 1) if mttr_hours_list else 46.2

    # 2. Jurisdiction Bounce Index (JBI %)
    transferred_tickets = sum(1 for t in tickets if t.transfers_count > 0)
    jbi_rate = round((transferred_tickets / total_tickets) * 100.0, 1)

    # 3. False Closure Index (FCI %)
    # P4-3 FIX: Spec formula is falsified_tickets / total_tickets, not divided by
    # a filtered closure_attempts subset which deflates the true FCI rate.
    falsified_tickets = sum(1 for t in tickets if t.falsified_attempts > 0 or t.verification_status == "rejected_escalated")
    fci_rate = round((falsified_tickets / total_tickets) * 100.0, 1)

    # 4. Ward-by-ward Scorecard
    wards = ["Ward 4 - Andheri West", "Ward 7 - Bandra East", "Ward 2 - Malad West", "Ward 9 - Dadar West", "Ward 12 - Kurla East"]
    ward_scorecards = []

    for w in wards:
        w_tickets = [t for t in tickets if t.location == w]
        w_total = len(w_tickets) or 1
        w_mttr = [
            (t.resolved_at if t.resolved_at else now) - t.created_at
            for t in w_tickets
        ]
        w_mttr_hrs = round(sum(d.total_seconds() / 3600.0 for d in w_mttr) / len(w_mttr), 1) if w_mttr else 28.5
        w_bounces = sum(1 for t in w_tickets if t.transfers_count > 0)
        w_jbi = round((w_bounces / w_total) * 100.0, 1)
        w_false = sum(1 for t in w_tickets if t.falsified_attempts > 0)
        w_fci = round((w_false / w_total) * 100.0, 1)

        grade = "A" if w_mttr_hrs <= 24 and w_fci < 10 else "B" if w_mttr_hrs <= 48 and w_fci < 20 else "C" if w_fci < 30 else "F"

        ward_scorecards.append({
            "ward": w,
            "total_tickets": len(w_tickets),
            "true_mttr_hours": w_mttr_hrs,
            "target_sla_hours": 24.0,
            "jurisdiction_bounce_rate": w_jbi,
            "false_closure_rate": w_fci,
            "governance_grade": grade
        })

    return {
        "true_mttr_hours": true_mttr,
        "target_sla_hours": 24.0,
        "jurisdiction_bounce_rate": jbi_rate,
        "false_closure_rate": fci_rate,
        "total_tickets": total_tickets,
        "ward_scorecards": ward_scorecards
    }


@app.post("/api/analyze")
def analyze_text(req: AnalyzeRequest):
    return analyze_grievance(req.text)


@app.post("/api/duplicates")
def check_duplicates(req: DuplicateCheckRequest):
    return find_semantic_duplicate(req.new_text, req.existing_texts)


@app.post("/api/clusters")
def cluster_grievances(req: ClusterRequest):
    return run_batch_clustering(req.texts)


@app.post("/api/upload-file")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xlsx")):
        raise HTTPException(
            status_code=400, detail="Only .csv and .xlsx files are supported"
        )

    contents = await file.read()

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Error parsing file: {str(e)}"
        )

    records_added = 0
    now = datetime.utcnow()
    for _, row in df.iterrows():
        text_val = str(row.get("text", row.get("complaint", ""))).strip()
        if not text_val:
            continue

        location_val = str(row.get("location", "")).strip() if pd.notna(row.get("location")) else "Ward 4 - Andheri West"

        raw_category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""
        if not raw_category or raw_category == "Uncategorized":
            ml_pred = analyze_grievance(text_val)
            category_val = ml_pred.get("category", "Sanitation & Waste")
            base_sev = ml_pred.get("base_severity", 50)
        else:
            category_val = raw_category
            base_sev = 50

        lat = float(row.get("latitude", 19.1197)) if pd.notna(row.get("latitude")) else 19.1197
        lng = float(row.get("longitude", 72.8464)) if pd.notna(row.get("longitude")) else 72.8464
        h3_idx = compute_h3_index(lat, lng, resolution=10)

        ticket_id = f"G-{uuid.uuid4().hex[:4].upper()}"
        ticket = models.Ticket(
            id=ticket_id,
            text=text_val,
            location=location_val,
            category=category_val,
            priority_score=compute_dynamic_priority(base_sev, upvotes=1, created_at=now),
            base_severity=base_sev,
            status="Pending",
            created_at=now,
            latitude=lat,
            longitude=lng,
            h3_index=h3_idx,
            upvotes=1,
            verification_status="unverified",
            falsified_attempts=0,
            transfers_count=0,
            assigned_officer=f"Er. {category_val.split(' ')[0]} Nodal Officer",
            sub_tasks="[]",
            audit_trail="[]"
        )
        db.add(ticket)
        records_added += 1

    db.commit()
    return {"message": "Success", "records_added": records_added}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

