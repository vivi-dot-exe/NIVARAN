import io
from datetime import datetime
from typing import List, Optional
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import pandas as pd
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import Base, engine, get_db
import models
from ml_engine import analyze_grievance, find_semantic_duplicate, run_batch_clustering

# Initialize SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Grievance Ticketing System with AI Engine")

# Enable CORS
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
    text: str
    location: str
    category: Optional[str] = None
    priority_score: Optional[int] = 0


class TicketUpdateStatus(BaseModel):
    status: str


class AnalyzeRequest(BaseModel):
    text: str


class TicketResponse(BaseModel):
    id: str
    text: str
    location: str
    category: Optional[str] = "Uncategorized"
    priority_score: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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

    ticket_id = f"TICK-{uuid.uuid4().hex[:6].upper()}"
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
    return new_ticket


@app.get("/api/tickets", response_model=List[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    tickets = db.query(models.Ticket).all()
    return tickets


@app.patch("/api/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: str,
    ticket_update: TicketUpdateStatus,
    db: Session = Depends(get_db),
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket with ID '{ticket_id}' not found",
        )
    ticket.status = ticket_update.status
    db.commit()
    db.refresh(ticket)
    return ticket


@app.post("/api/analyze")
def analyze_text(payload: AnalyzeRequest):
    """
    Directly analyze a single grievance text for predicted category, urgency score, and confidence.
    """
    return analyze_grievance(payload.text)


@app.get("/api/analytics/clusters")
def get_topic_clusters(min_topic_size: int = 3, db: Session = Depends(get_db)):
    """
    Runs BERTopic semantic clustering on all stored grievances to discover emerging trends/issues.
    """
    tickets = db.query(models.Ticket).all()
    texts = [t.text for t in tickets if t.text and len(t.text.strip()) > 0]
    return run_batch_clustering(texts, min_topic_size=min_topic_size)


@app.post("/api/upload-file", summary="Upload Grievances File (.csv, .xlsx, .xls)")
@app.post("/api/upload-csv", include_in_schema=False)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = (file.filename or "").lower()
    
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xslx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a valid .csv, .xlsx, or .xls file",
        )

    try:
        contents = await file.read()
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing file: {str(e)}",
        )

    # Normalize column headers
    df.columns = [str(col).strip() for col in df.columns]

    records_added = 0
    for _, row in df.iterrows():
        text_val = str(row.get("text", "")).strip() if pd.notna(row.get("text")) else ""
        if not text_val:
            continue

        location_val = str(row.get("location", "")).strip() if pd.notna(row.get("location")) else "Unknown"

        # Read category and priority if present
        raw_category = str(row.get("category", "")).strip() if pd.notna(row.get("category")) else ""
        try:
            raw_priority = int(row.get("priority_score", 0)) if pd.notna(row.get("priority_score")) else 0
        except (ValueError, TypeError):
            raw_priority = 0

        # Auto-classify and score with ML if missing
        if not raw_category or raw_category == "Uncategorized" or raw_priority == 0:
            ml_pred = analyze_grievance(text_val)
            category_val = raw_category if (raw_category and raw_category != "Uncategorized") else ml_pred.get("category", "General")
            priority_val = raw_priority if raw_priority > 0 else ml_pred.get("priority_score", 50)
        else:
            category_val = raw_category
            priority_val = raw_priority

        ticket_id = f"TICK-{uuid.uuid4().hex[:6].upper()}"
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

    db.commit()

    return {"message": "Success", "records_added": records_added}
