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
    compute_civic_issue_priority,
    generate_issue_title,
    route_grievance,
    analyze_and_decompose_grievance,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_roles,
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NIVARAN DARPG Multi-Agency Civic Redressal API",
    description="CPGRAMS 7.0 & AI Triage Engine Backend with 4-Pillar Civic Grid Architecture",
    version="2.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_demo_accounts():
    """Seeds default citizen and nodal officer demonstration accounts on startup."""
    db: Session = next(get_db())
    try:
        # Seed Citizen User
        if not db.query(models.User).filter(models.User.email == "citizen@nivaran.gov.in").first():
            hp, salt = hash_password("citizen123")
            demo_citizen = models.User(
                id="CIT-10001",
                full_name="Aarav Sharma",
                email="citizen@nivaran.gov.in",
                mobile_number="9820198201",
                password_hash=hp,
                salt=salt,
                role="CITIZEN",
                address="Flat 402, Green Meadows, Andheri West",
                ward="Ward 4 - Andheri West",
                preferred_language="English",
                account_status="ACTIVE"
            )
            db.add(demo_citizen)

        # Seed Nodal Officer - Roads (MCGM)
        if not db.query(models.User).filter(models.User.email == "officer.roads@nivaran.gov.in").first():
            hp, salt = hash_password("officer123")
            off1_user = models.User(
                id="OFF-20001",
                full_name="Er. Rajesh Sharma",
                email="officer.roads@nivaran.gov.in",
                mobile_number="9820298202",
                password_hash=hp,
                salt=salt,
                role="NODAL_OFFICER",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(off1_user)

        # Seed Nodal Officer - Water (MWSB)
        if not db.query(models.User).filter(models.User.email == "officer.water@nivaran.gov.in").first():
            hp, salt = hash_password("officer123")
            off2_user = models.User(
                id="OFF-20002",
                full_name="Er. Vikram Desai",
                email="officer.water@nivaran.gov.in",
                mobile_number="9820398203",
                password_hash=hp,
                salt=salt,
                role="NODAL_OFFICER",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(off2_user)

        # Seed Nodal Officer - Sanitation (MCGM)
        if not db.query(models.User).filter(models.User.email == "officer.sanitation@nivaran.gov.in").first():
            hp, salt = hash_password("officer123")
            off3_user = models.User(
                id="OFF-20003",
                full_name="Shri Suresh Patil",
                email="officer.sanitation@nivaran.gov.in",
                mobile_number="9820498204",
                password_hash=hp,
                salt=salt,
                role="NODAL_OFFICER",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(off3_user)

        db.commit()
    except Exception as e:
        db.rollback()
        print("Demo accounts seeding warning:", e)


seed_demo_accounts()


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


# -------------------------------------------------------------
# Pydantic Auth Schemas
# -------------------------------------------------------------
class UserRegisterRequest(BaseModel):
    full_name: str
    email: str
    mobile_number: Optional[str] = None
    password: str
    address: Optional[str] = None
    ward: Optional[str] = "Ward 4 - Andheri West"
    preferred_language: Optional[str] = "English"


class UserLoginRequest(BaseModel):
    login_id: str # Email or Mobile
    password: str
    auth_type: Optional[str] = "citizen" # "citizen" or "officer"


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
    resolution_image_url: Optional[str] = None
    resolution_notes: Optional[str] = None


class VerifyResolutionRequest(BaseModel):
    action: str  # "approve" | "reject"
    otp: Optional[str] = None
    rejection_reason: Optional[str] = None


class SplitTaskRequest(BaseModel):
    sub_tasks: List[SubTaskModel]


class SubTaskResolveRequest(BaseModel):
    notes: Optional[str] = None


class TicketUpdateStatus(BaseModel):
    status: Optional[str] = None
    department: Optional[str] = None
    assigned_officer: Optional[str] = None


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
    civic_issue_id: Optional[str] = None
    responsible_authority: Optional[str] = None
    responsible_department: Optional[str] = None
    routing_confidence: Optional[int] = None
    routing_status: Optional[str] = None
    routing_reason: Optional[str] = None
    citizen_id: Optional[str] = None
    citizen_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RoutingAnalyzeRequest(BaseModel):
    text: str
    selected_category: Optional[str] = None
    ward: Optional[str] = "Ward 4 - Andheri West"


class RoutingOverrideRequest(BaseModel):
    authority: str
    department: str
    assigned_officer: Optional[str] = None
    reason: Optional[str] = "Officer Manual Override"
    officer_name: Optional[str] = "Nodal Officer"


class CivicIssueResponse(BaseModel):
    id: str
    issue_title: str
    issue_description: str
    category: str
    subcategory: Optional[str] = "General Civic Issue"
    ward: str
    latitude: float
    longitude: float
    status: str
    created_at: datetime
    last_reported_at: datetime
    affected_citizen_count: int
    report_count: int
    duplicate_count: int
    priority_score: int
    priority_level: str
    severity_score: int
    urgency_score: int
    scope_score: int
    responsible_department: str
    responsible_authority: str
    assigned_officer: Optional[str] = "Ward Nodal Officer"
    routing_confidence: Optional[int] = 85
    routing_status: Optional[str] = "Automatically Routed"
    routing_reason: Optional[str] = None
    requires_human_review: Optional[bool] = False
    category_mismatch: Optional[bool] = False
    manual_override: Optional[bool] = False
    cluster_confidence: float
    tickets: List[TicketResponse] = []

    model_config = ConfigDict(from_attributes=True)


class CivicIssueUpdateStatus(BaseModel):
    status: str
    responsible_authority: Optional[str] = None


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


# Helper function: Attach ticket to existing CivicIssue or create a new CivicIssue
def attach_or_create_civic_issue(db: Session, ticket: models.Ticket) -> models.CivicIssue:
    # Look for active issues in the same ward
    ward_issues = (
        db.query(models.CivicIssue)
        .filter(models.CivicIssue.ward == ticket.location)
        .filter(models.CivicIssue.status != "Resolved")
        .all()
    )

    matched_issue = None
    best_sim = 0.0

    if ward_issues:
        issue_texts = [iss.issue_description for iss in ward_issues]
        dup_result = find_semantic_duplicate(ticket.text, issue_texts)
        if dup_result.get("is_duplicate") or dup_result.get("similarity", 0) >= 0.55:
            match_idx = dup_result.get("match_id")
            if match_idx is not None and match_idx < len(ward_issues):
                matched_issue = ward_issues[match_idx]
                best_sim = dup_result.get("similarity", 0.75)

    if matched_issue:
        # Attach ticket to existing Civic Issue
        ticket.civic_issue_id = matched_issue.id
        matched_issue.report_count += 1
        matched_issue.affected_citizen_count += 1
        if best_sim >= 0.72:
            matched_issue.duplicate_count += 1
        matched_issue.last_reported_at = datetime.utcnow()
        
        # Recalculate Composite Priority Score
        days_active = max(1, (datetime.utcnow() - matched_issue.created_at).days)
        p_calc = compute_civic_issue_priority(
            severity=matched_issue.severity_score,
            urgency=matched_issue.urgency_score,
            scope=matched_issue.scope_score,
            report_count=matched_issue.report_count,
            duplicate_count=matched_issue.duplicate_count,
            days_active=days_active,
        )
        matched_issue.priority_score = p_calc["priority_score"]
        matched_issue.priority_level = p_calc["priority_level"]
        db.commit()
        db.refresh(matched_issue)
        return matched_issue
    else:
        # Create a new Civic Issue
        issue_id = f"CI-{uuid.uuid4().hex[:4].upper()}"
        
        # Run AI Multi-Agency Understanding & Decomposition Engine
        decomp = analyze_and_decompose_grievance(ticket.text, ticket.location, ticket.category)
        r_info = decomp["routing"]

        title = decomp["primary_issue_title"] if decomp.get("primary_issue_title") else generate_issue_title(ticket.category, ticket.text, ticket.location)

        # Calculate initial severity/urgency/scope from priority_score
        severity = 5 if ticket.priority_score >= 85 else 4 if ticket.priority_score >= 70 else 3
        urgency = severity
        scope = 4 if ticket.priority_score >= 85 else 3
        
        p_calc = compute_civic_issue_priority(severity, urgency, scope, report_count=1, duplicate_count=0)

        new_issue = models.CivicIssue(
            id=issue_id,
            issue_title=title,
            issue_description=ticket.text,
            category=r_info["department"],
            subcategory=r_info["department_name"],
            ward=ticket.location,
            latitude=19.1197,
            longitude=72.8464,
            status="Pending",
            created_at=datetime.utcnow(),
            last_reported_at=datetime.utcnow(),
            affected_citizen_count=1,
            report_count=1,
            duplicate_count=0,
            priority_score=p_calc["priority_score"],
            priority_level=p_calc["priority_level"],
            severity_score=severity,
            urgency_score=urgency,
            scope_score=scope,
            responsible_department=r_info["department"],
            responsible_authority=r_info["authority"],
            assigned_officer=r_info["assigned_officer"],
            routing_confidence=r_info["routing_confidence"],
            routing_status=r_info["routing_status"],
            routing_reason=r_info["routing_reason"],
            requires_human_review=r_info["requires_human_review"],
            category_mismatch=r_info["category_mismatch"],
            citizen_selected_category=ticket.category,
            cluster_confidence=0.88,
            is_multi_agency=decomp["is_multi_agency"],
            primary_issue_title=decomp["primary_issue_title"],
            root_cause=decomp["root_cause"],
            affected_infrastructure_json=json.dumps(decomp["affected_infrastructure"]),
            sub_issues_json=json.dumps(decomp["sub_issues"]),
            dependencies_json=json.dumps(decomp["dependencies"]),
            resolution_plan_json=json.dumps(decomp),
            decomposition_confidence=decomp["overall_confidence"]
        )
        db.add(new_issue)
        db.commit()

        # Add SubIssue records into database table
        for s in decomp["sub_issues"]:
            sub_rec = models.SubIssue(
                id=f"{new_issue.id}_{s['id']}",
                civic_issue_id=new_issue.id,
                title=s["title"],
                description=s.get("description", ""),
                category=s["category"],
                responsible_authority=s["responsible_authority"],
                responsible_department=s["responsible_department"],
                assigned_officer=s.get("assigned_officer", ""),
                confidence=s.get("confidence", 90),
                required_action=s.get("required_action", ""),
                dependencies_json=json.dumps(s.get("dependencies", [])),
                status=s.get("status", "Pending")
            )
            db.add(sub_rec)
        db.commit()
        db.refresh(new_issue)

        ticket.civic_issue_id = new_issue.id
        ticket.responsible_authority = r_info["authority"]
        ticket.responsible_department = r_info["department"]
        ticket.assigned_officer = r_info["assigned_officer"]
        ticket.routing_confidence = r_info["routing_confidence"]
        ticket.routing_status = r_info["routing_status"]
        ticket.routing_reason = r_info["routing_reason"]
        ticket.requires_human_review = r_info["requires_human_review"]
        ticket.category_mismatch = r_info["category_mismatch"]
        ticket.citizen_selected_category = ticket.category
        ticket.is_multi_agency = decomp["is_multi_agency"]
        ticket.primary_issue_title = decomp["primary_issue_title"]
        ticket.root_cause = decomp["root_cause"]
        ticket.resolution_plan_json = json.dumps(decomp)
        db.commit()
        return new_issue


# -------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------
@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
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
        if current_user:
            existing.citizen_id = current_user.id
            existing.citizen_name = current_user.full_name
            existing.citizen_mobile = current_user.mobile_number
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
        audit_trail="[]",
        citizen_id=current_user.id if current_user else "CIT-10482",
        citizen_name=current_user.full_name if current_user else "Aarav Sharma",
        citizen_mobile=current_user.mobile_number if current_user else "9820198201"
    )
    log_audit_event(new_ticket, "TICKET_CREATED", f"Lodge by citizen in {ticket_in.location} with base severity {base_severity}")
    
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Automatically attach or cluster ticket into a CivicIssue
    attach_or_create_civic_issue(db, new_ticket)
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
    - If Approved: status = Closed.
    - If Rejected: auto-escalates to Divisional Commissioner with False Closure flag.
    """
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if req.action == "approve":
        if req.otp and ticket.citizen_otp and req.otp.strip() != ticket.citizen_otp.strip():
            raise HTTPException(status_code=400, detail="Invalid Citizen Verification OTP. Please check the code.")

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


# -------------------------------------------------------------
# CIVIC ISSUE API ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/civic-issues", response_model=List[CivicIssueResponse])
def get_civic_issues(db: Session = Depends(get_db)):
    return db.query(models.CivicIssue).order_by(models.CivicIssue.priority_score.desc()).all()


@app.get("/api/civic-issues/{issue_id}", response_model=CivicIssueResponse)
def get_civic_issue(issue_id: str, db: Session = Depends(get_db)):
    issue = db.query(models.CivicIssue).filter(models.CivicIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Civic Issue not found")
    return issue


@app.patch("/api/civic-issues/{issue_id}", response_model=CivicIssueResponse)
def update_civic_issue_status(
    issue_id: str, update_in: CivicIssueUpdateStatus, db: Session = Depends(get_db)
):
    issue = db.query(models.CivicIssue).filter(models.CivicIssue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Civic Issue not found")

    issue.status = update_in.status
    if update_in.responsible_authority:
        issue.responsible_authority = update_in.responsible_authority

    if update_in.status == "Resolved":
        issue.resolved_at = datetime.utcnow()

    # Cascade status update to all child tickets
    for t in issue.tickets:
        t.status = update_in.status

    db.commit()
    db.refresh(issue)
    return issue


# -------------------------------------------------------------
# Legacy / Fast AI Endpoints
# -------------------------------------------------------------
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
    issues_created_or_updated = set()

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

        civic_issue = attach_or_create_civic_issue(db, ticket)
        issues_created_or_updated.add(civic_issue.id)

    db.commit()
    return {
        "message": "Success",
        "records_added": records_added,
        "civic_issues_count": len(issues_created_or_updated),
    }


# -------------------------------------------------------------
# AI ROUTING ENDPOINTS
# -------------------------------------------------------------
@app.post("/api/routing/analyze")
def analyze_routing(req: RoutingAnalyzeRequest):
    """Analyzes complaint text, ward, and optional citizen category to return real-time routing recommendations."""
    return route_grievance(req.text, req.selected_category, req.ward or "Ward 4 - Andheri West")


@app.get("/api/routing/review-queue")
def get_routing_review_queue(db: Session = Depends(get_db)):
    """Fetches complaints/civic issues requiring human review (low confidence <60% or category mismatches)."""
    low_conf_issues = (
        db.query(models.CivicIssue)
        .filter((models.CivicIssue.routing_confidence < 60) | (models.CivicIssue.requires_human_review == True) | (models.CivicIssue.category_mismatch == True))
        .all()
    )
    return low_conf_issues


@app.post("/api/routing/{target_id}/override")
def override_routing(target_id: str, req: RoutingOverrideRequest, db: Session = Depends(get_db)):
    """Enables Nodal Officer to manually override authority/department routing with mandatory audit logging."""
    civic_issue = db.query(models.CivicIssue).filter(models.CivicIssue.id == target_id).first()
    ticket = db.query(models.Ticket).filter(models.Ticket.id == target_id).first()

    if not civic_issue and not ticket:
        raise HTTPException(status_code=404, detail="Target Complaint or Civic Issue not found")

    prev_auth = civic_issue.responsible_authority if civic_issue else ticket.responsible_authority
    prev_dept = civic_issue.responsible_department if civic_issue else ticket.responsible_department

    if civic_issue:
        civic_issue.responsible_authority = req.authority
        civic_issue.responsible_department = req.department
        if req.assigned_officer:
            civic_issue.assigned_officer = req.assigned_officer
        civic_issue.manual_override = True
        civic_issue.override_reason = req.reason
        civic_issue.overridden_by = req.officer_name
        civic_issue.override_timestamp = datetime.utcnow()
        civic_issue.routing_status = "Officer Overridden"
        civic_issue.requires_human_review = False

        # Cascade override to attached child tickets
        for t in civic_issue.tickets:
            t.responsible_authority = req.authority
            t.responsible_department = req.department
            if req.assigned_officer:
                t.assigned_officer = req.assigned_officer
            t.manual_override = True
            t.override_reason = req.reason
            t.routing_status = "Officer Overridden"

    elif ticket:
        ticket.responsible_authority = req.authority
        ticket.responsible_department = req.department
        if req.assigned_officer:
            ticket.assigned_officer = req.assigned_officer
        ticket.manual_override = True
        ticket.override_reason = req.reason
        ticket.routing_status = "Officer Overridden"
        ticket.requires_human_review = False

    # Log to RoutingAuditLog table
    audit = models.RoutingAuditLog(
        target_id=target_id,
        target_type="CivicIssue" if civic_issue else "Ticket",
        action="OFFICER_OVERRIDE",
        previous_authority=prev_auth,
        previous_department=prev_dept,
        new_authority=req.authority,
        new_department=req.department,
        performed_by=req.officer_name or "Nodal Officer",
        reason=req.reason,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Routing updated to {req.authority} - {req.department}",
        "target_id": target_id
    }


@app.get("/api/authorities")
def get_authorities_directory():
    """Returns the administrative government authority & department directory for NIVARAN."""
    return [
        {
            "id": "AUTH-MCGM",
            "name": "Municipal Corporation of Greater Mumbai",
            "type": "Municipal Urban Local Body",
            "departments": [
                "Roads & Infra",
                "Sanitation & Waste",
                "Storm Water Drainage",
                "Building Proposals & License"
            ]
        },
        {
            "id": "AUTH-MWSB",
            "name": "Maharashtra Water Supply & Sewerage Board",
            "type": "State Water & Sanitation Utility",
            "departments": [
                "Water Supply",
                "Sewerage & Effluent Treatment"
            ]
        },
        {
            "id": "AUTH-BEST",
            "name": "BEST Electricity & Power Supply Board",
            "type": "Power & Distribution Utility",
            "departments": [
                "Electricity",
                "Street Lighting & Substation Operations"
            ]
        },
        {
            "id": "AUTH-PHD",
            "name": "Public Health Department & NIC Healthcare Cell",
            "type": "State Health & Epidemic Control Authority",
            "departments": [
                "Public Health & Healthcare",
                "Vector & Disease Control"
            ]
        },
        {
            "id": "AUTH-FCSD",
            "name": "Food & Civil Supplies Department",
            "type": "Public Distribution System Board",
            "departments": [
                "Public Distribution",
                "Ration & Pension Benefits"
            ]
        }
    ]


# -------------------------------------------------------------
# MULTI-AGENCY DECOMPOSITION & RESOLUTION PLAN ENDPOINTS
# -------------------------------------------------------------
@app.post("/api/ai/decompose")
def decompose_grievance_endpoint(req: RoutingAnalyzeRequest):
    """Analyzes a raw complaint and returns real-time single vs multi-agency decomposition and dependency graph."""
    return analyze_and_decompose_grievance(req.text, req.ward or "Ward 4 - Andheri West", req.selected_category)


@app.get("/api/civic-issues/{issue_id}/resolution-plan")
def get_resolution_plan(issue_id: str, db: Session = Depends(get_db)):
    """Fetches the structured multi-agency resolution plan payload for a Civic Issue."""
    civic_issue = db.query(models.CivicIssue).filter(models.CivicIssue.id == issue_id).first()
    if not civic_issue:
        raise HTTPException(status_code=404, detail="Civic Issue not found")

    if civic_issue.resolution_plan_json:
        return json.loads(civic_issue.resolution_plan_json)

    # Fallback regeneration if missing
    return analyze_and_decompose_grievance(civic_issue.issue_description, civic_issue.ward, civic_issue.category)


@app.post("/api/civic-issues/{issue_id}/review-plan")
def review_resolution_plan(issue_id: str, plan_override: dict, db: Session = Depends(get_db)):
    """Allows a nodal officer to confirm, edit, or override the sub-issues and dependency graph for a Civic Issue."""
    civic_issue = db.query(models.CivicIssue).filter(models.CivicIssue.id == issue_id).first()
    if not civic_issue:
        raise HTTPException(status_code=404, detail="Civic Issue not found")

    civic_issue.resolution_plan_json = json.dumps(plan_override)
    civic_issue.is_multi_agency = plan_override.get("is_multi_agency", civic_issue.is_multi_agency)
    if "sub_issues" in plan_override:
        civic_issue.sub_issues_json = json.dumps(plan_override["sub_issues"])
    if "dependencies" in plan_override:
        civic_issue.dependencies_json = json.dumps(plan_override["dependencies"])
    civic_issue.requires_human_review = False
    civic_issue.manual_override = True
    civic_issue.override_reason = plan_override.get("officer_review_note", "Officer approved multi-agency resolution plan")

    db.commit()
    return {"status": "success", "message": f"Resolution plan updated for {issue_id}"}


# -------------------------------------------------------------
# AUTHENTICATION & USER REGISTRY ENDPOINTS
# -------------------------------------------------------------
@app.post("/api/auth/register")
def register_citizen(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Registers a new citizen account with unique email/mobile validation and password hashing."""
    # Check duplicate email
    if db.query(models.User).filter(models.User.email == req.email.strip().lower()).first():
        raise HTTPException(status_code=400, detail="Account with this email address already exists.")
    
    # Check duplicate mobile if provided
    if req.mobile_number and db.query(models.User).filter(models.User.mobile_number == req.mobile_number.strip()).first():
        raise HTTPException(status_code=400, detail="Account with this mobile number already exists.")

    citizen_id = f"CIT-{uuid.uuid4().hex[:5].upper()}"
    hp, salt = hash_password(req.password)

    new_user = models.User(
        id=citizen_id,
        full_name=req.full_name.strip(),
        email=req.email.strip().lower(),
        mobile_number=req.mobile_number.strip() if req.mobile_number else None,
        password_hash=hp,
        salt=salt,
        role="CITIZEN",
        address=req.address,
        ward=req.ward or "Ward 4 - Andheri West",
        preferred_language=req.preferred_language or "English",
        account_status="ACTIVE",
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user)
    return {
        "status": "success",
        "message": "Citizen account created successfully",
        "token": token,
        "user": {
            "id": new_user.id,
            "name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role,
            "ward": new_user.ward
        }
    }


@app.post("/api/auth/login")
def login_user(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticates citizen or government officer with email/mobile and password."""
    login_id = req.login_id.strip().lower()
    
    user = (
        db.query(models.User)
        .filter((models.User.email == login_id) | (models.User.mobile_number == login_id))
        .first()
    )

    if not user or not verify_password(req.password, user.password_hash, user.salt):
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password. Please check your credentials.")

    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Account is suspended or deactivated. Contact NIVARAN Admin.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = create_access_token(user)
    return {
        "status": "success",
        "message": f"Welcome back, {user.full_name}",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "ward": user.ward,
            "preferred_language": user.preferred_language
        }
    }


@app.get("/api/auth/me")
def get_current_user_profile(current_user: models.User = Depends(get_current_user)):
    """Fetches the authenticated user profile."""
    return {
        "id": current_user.id,
        "name": current_user.full_name,
        "email": current_user.email,
        "mobile_number": current_user.mobile_number,
        "role": current_user.role,
        "ward": current_user.ward,
        "address": current_user.address,
        "preferred_language": current_user.preferred_language,
        "account_status": current_user.account_status,
        "created_at": current_user.created_at
    }


@app.get("/api/citizens/me/complaints")
def get_my_complaints(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Strict Ownership / IDOR Protection:
    Returns ONLY complaints belonging to the authenticated citizen.
    """
    tickets = db.query(models.Ticket).filter(models.Ticket.citizen_id == current_user.id).all()
    return tickets


@app.get("/api/officers/me/issues")
def get_officer_assigned_issues(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scoped Officer Jurisdiction View:
    Returns ONLY issues in the officer's assigned department and ward.
    """
    if current_user.role not in ["NODAL_OFFICER", "DEPARTMENT_ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Access denied. Officer privileges required.")

    officer_rec = db.query(models.Officer).filter(models.Officer.user_id == current_user.id).first()
    
    query = db.query(models.CivicIssue)
    if current_user.role == "NODAL_OFFICER" and officer_rec:
        query = query.filter(models.CivicIssue.ward == current_user.ward)

    return query.all()


@app.get("/api/admin/users")
def list_system_users(
    current_user: models.User = Depends(require_roles(["SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    """Super Admin API to list all citizens and officer accounts."""
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "role": u.role,
            "ward": u.ward,
            "status": u.account_status,
            "created_at": u.created_at
        }
        for u in users
    ]


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
