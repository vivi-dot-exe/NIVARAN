from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from database import Base


class Ticket(Base):
    __tablename__ = "Ticket"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    location = Column(String, nullable=False)  # Ward or street location
    category = Column(String, default="Uncategorized", nullable=True)
    priority_score = Column(Integer, default=50, nullable=False)
    status = Column(String, default="Pending", nullable=False)  # Pending | In Progress | Pending_Verification | Resolved | Escalated | Closed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Pillar 1: Spatio-Semantic Deduplication & Consensus
    latitude = Column(Float, default=19.1197, nullable=False)
    longitude = Column(Float, default=72.8464, nullable=False)
    h3_index = Column(String, nullable=True, index=True)
    upvotes = Column(Integer, default=1, nullable=False)
    base_severity = Column(Integer, default=50, nullable=False)
    duplicate_group = Column(String, nullable=True)

    # Pillar 2: Zero-Trust "Proof-of-Resolution" Protocol
    verification_status = Column(String, default="unverified", nullable=False)  # unverified | pending_verification | verified_closed | rejected_escalated
    citizen_otp = Column(String, nullable=True)
    falsified_attempts = Column(Integer, default=0, nullable=False)
    assigned_officer = Column(String, nullable=True)
    resolution_proof_lat = Column(Float, nullable=True)
    resolution_proof_lng = Column(Float, nullable=True)
    resolution_image_url = Column(String, nullable=True)
    resolution_cv_score = Column(Float, nullable=True)
    closure_rejected_reason = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Pillar 3: Composite Multi-Agency Split-Ticketing (DAG Workflow)
    parent_ticket_id = Column(String, nullable=True, index=True)
    sub_tasks = Column(Text, default="[]", nullable=False)  # JSON-encoded array of SubTask objects

    # Pillar 4: Radical Civic SLI/SLA Observability
    transfers_count = Column(Integer, default=0, nullable=False)
    audit_trail = Column(Text, default="[]", nullable=False)  # JSON-encoded array of status & transfer logs

