from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base


class CivicIssue(Base):
    __tablename__ = "CivicIssue"

    id = Column(String, primary_key=True, index=True)
    issue_title = Column(String, nullable=False)
    issue_description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True, default="General Civic Issue")
    ward = Column(String, nullable=False)
    latitude = Column(Float, nullable=True, default=19.1197)
    longitude = Column(Float, nullable=True, default=72.8464)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    affected_citizen_count = Column(Integer, default=1, nullable=False)
    report_count = Column(Integer, default=1, nullable=False)
    duplicate_count = Column(Integer, default=0, nullable=False)
    
    priority_score = Column(Integer, default=50, nullable=False)
    priority_level = Column(String, default="Medium", nullable=False)
    
    severity_score = Column(Integer, default=3, nullable=False)
    urgency_score = Column(Integer, default=3, nullable=False)
    scope_score = Column(Integer, default=3, nullable=False)
    
    responsible_department = Column(String, nullable=False)
    responsible_authority = Column(String, nullable=True, default="Nodal Officer")
    cluster_confidence = Column(Float, default=0.85, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationship to child tickets
    tickets = relationship("Ticket", back_populates="civic_issue", cascade="all, delete-orphan")


class Ticket(Base):
    __tablename__ = "Ticket"

    id = Column(String, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    category = Column(String, default="Uncategorized", nullable=True)
    priority_score = Column(Integer, default=0, nullable=False)
    status = Column(String, default="Pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign key linking ticket to parent CivicIssue
    civic_issue_id = Column(String, ForeignKey("CivicIssue.id"), nullable=True)
    civic_issue = relationship("CivicIssue", back_populates="tickets")

