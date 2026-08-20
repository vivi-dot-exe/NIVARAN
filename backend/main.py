import io
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


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


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
        title = generate_issue_title(ticket.category, ticket.text, ticket.location)
        
        # Calculate initial severity/urgency/scope from priority_score
        severity = 5 if ticket.priority_score >= 85 else 4 if ticket.priority_score >= 70 else 3
        urgency = severity
        scope = 4 if ticket.priority_score >= 85 else 3
        
        p_calc = compute_civic_issue_priority(severity, urgency, scope, report_count=1, duplicate_count=0)

        new_issue = models.CivicIssue(
            id=issue_id,
            issue_title=title,
            issue_description=ticket.text,
            category=ticket.category or "General",
            subcategory=ticket.category or "General Civic Issue",
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
            responsible_department=ticket.category or "Sanitation & Waste",
            responsible_authority=f"Nodal Officer - {ticket.location}",
            cluster_confidence=0.88,
        )
        db.add(new_issue)
        db.commit()
        db.refresh(new_issue)

        ticket.civic_issue_id = new_issue.id
        db.commit()
        return new_issue


# API Endpoints
@app.post("/api/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(ticket_in: TicketCreate, db: Session = Depends(get_db)):
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


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

