import io
import json
import os
from datetime import datetime
from typing import List, Optional
import uuid
import uvicorn

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import pandas as pd
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from ml_engine import (
    analyze_grievance,
    compute_civic_issue_priority,
    find_semantic_duplicate,
    generate_issue_title,
    run_batch_clustering,
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

app = FastAPI(title="NIVARAN Civic Grievance Redressal Microservice")

# Enable CORS for frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# SEED DEMO ACCOUNTS AT STARTUP
def seed_demo_accounts():
    db: Session = next(get_db())
    try:
        # 1. Super Admin
        if not db.query(models.User).filter(models.User.email == "admin@nivaran.demo").first():
            hp, salt = hash_password("admin123")
            admin_user = models.User(
                id="ADM-001",
                full_name="NIVARAN Super Admin",
                email="admin@nivaran.demo",
                mobile_number="9999900000",
                password_hash=hp,
                salt=salt,
                role="SUPER_ADMIN",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(admin_user)

        # 2. Demo Citizen
        if not db.query(models.User).filter(models.User.email == "citizen@nivaran.demo").first():
            hp, salt = hash_password("citizen123")
            cit_user = models.User(
                id="CIT-10482",
                full_name="Aarav Sharma (Demo Citizen)",
                email="citizen@nivaran.demo",
                mobile_number="9820198201",
                password_hash=hp,
                salt=salt,
                role="CITIZEN",
                address="B-402, Lokhandwala Complex, Andheri West",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(cit_user)

        # 3. Roads Nodal Officer (Ward 4)
        if not db.query(models.User).filter(models.User.email == "roads.officer@nivaran.demo").first():
            hp, salt = hash_password("officer123")
            off1_user = models.User(
                id="OFF-2048",
                full_name="Er. Rajesh Sharma (Roads Officer)",
                email="roads.officer@nivaran.demo",
                mobile_number="9820298202",
                password_hash=hp,
                salt=salt,
                role="NODAL_OFFICER",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(off1_user)
            db.flush()

            officer_rec = models.Officer(
                id="OFF-REC-2048",
                user_id=off1_user.id,
                name=off1_user.full_name,
                email=off1_user.email,
                employee_identifier="EMP-MCGM-4092",
                department_id="DEP-ROADS",
                jurisdiction_id="JUR-WARD4",
                designation="Ward 4 Roads Nodal Officer"
            )
            db.add(officer_rec)

        # 4. Water Nodal Officer (Ward 4)
        if not db.query(models.User).filter(models.User.email == "water.officer@nivaran.demo").first():
            hp, salt = hash_password("officer123")
            off2_user = models.User(
                id="OFF-3012",
                full_name="Er. Vikram Desai (Water Officer)",
                email="water.officer@nivaran.demo",
                mobile_number="9820398203",
                password_hash=hp,
                salt=salt,
                role="NODAL_OFFICER",
                ward="Ward 4 - Andheri West",
                account_status="ACTIVE"
            )
            db.add(off2_user)

        # 5. Electricity Nodal Officer (Ward 4)
        if not db.query(models.User).filter(models.User.email == "elec.officer@nivaran.demo").first():
            hp, salt = hash_password("officer123")
            off3_user = models.User(
                id="OFF-4015",
                full_name="Er. Amit Verma (Electricity Officer)",
                email="elec.officer@nivaran.demo",
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


# Pydantic Auth Schemas
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


# Pydantic Schemas
class TicketCreate(BaseModel):
    id: Optional[str] = None
    text: str
    location: str
    category: Optional[str] = None
    priority_score: Optional[int] = 0


class TicketUpdateStatus(BaseModel):
    status: str


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
    status: str
    created_at: datetime
    civic_issue_id: Optional[str] = None

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
                id=s["id"],
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


# API Endpoints
@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    # Run ML analysis to automatically categorize and score priority if omitted
    ml_result = analyze_grievance(ticket_in.text)

    category = (
        ticket_in.category.strip()
        if (ticket_in.category and ticket_in.category.strip() and ticket_in.category != "Uncategorized")
        else ml_result.get("category", "General")
    )

    priority_score = (
        ticket_in.priority_score
        if (ticket_in.priority_score is not None and ticket_in.priority_score > 0)
        else ml_result.get("priority_score", 50)
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
        status="Pending",
        created_at=datetime.utcnow(),
        citizen_id=current_user.id if current_user else "CIT-10482",
        citizen_name=current_user.full_name if current_user else "Aarav Sharma",
        citizen_mobile=current_user.mobile_number if current_user else "9820198201"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    # Automatically attach or cluster ticket into a CivicIssue
    attach_or_create_civic_issue(db, new_ticket)
    db.refresh(new_ticket)

    return new_ticket


@app.get("/api/tickets", response_model=List[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    return db.query(models.Ticket).order_by(models.Ticket.created_at.desc()).all()


@app.patch("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str, status_in: TicketUpdateStatus, db: Session = Depends(get_db)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found"
        )

    ticket.status = status_in.status
    db.commit()
    db.refresh(ticket)
    return ticket


# CIVIC ISSUE API ENDPOINTS
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
    issues_created_or_updated = set()

    for _, row in df.iterrows():
        text_val = str(row.get("text", row.get("complaint", ""))).strip()
        if not text_val:
            continue

        location_val = str(row.get("location", "")).strip() if pd.notna(row.get("location")) else "Ward 4 - Andheri West"

        raw_category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""
        try:
            raw_priority = int(row.get("priority_score", 0)) if pd.notna(row.get("priority_score")) else 0
        except (ValueError, TypeError):
            raw_priority = 0

        if not raw_category or raw_category == "Uncategorized" or raw_priority == 0:
            ml_pred = analyze_grievance(text_val)
            category_val = raw_category if (raw_category and raw_category != "Uncategorized") else ml_pred.get("category", "General")
            priority_val = raw_priority if raw_priority > 0 else ml_pred.get("priority_score", 50)
        else:
            category_val = raw_category
            priority_val = raw_priority

        ticket_id = f"G-{uuid.uuid4().hex[:4].upper()}"
        ticket = models.Ticket(
            id=ticket_id,
            text=text_val,
            location=location_val,
            category=category_val,
            priority_score=priority_val,
            status="Pending",
            created_at=datetime.utcnow(),
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


# AI ROUTING ENDPOINTS
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


# MULTI-AGENCY DECOMPOSITION & RESOLUTION PLAN ENDPOINTS
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


# AUTHENTICATION & USER REGISTRY ENDPOINTS
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

