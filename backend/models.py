from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base


class Authority(Base):
    __tablename__ = "Authority"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    type = Column(String, default="Municipal / Local Body", nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    departments = relationship("Department", back_populates="authority", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "Department"

    id = Column(String, primary_key=True, index=True)
    authority_id = Column(String, ForeignKey("Authority.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    authority = relationship("Authority", back_populates="departments")
    officers = relationship("Officer", back_populates="department", cascade="all, delete-orphan")


class Jurisdiction(Base):
    __tablename__ = "Jurisdiction"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True) # e.g. "Ward 4 - Andheri West"
    authority_id = Column(String, ForeignKey("Authority.id"), nullable=False)


class Officer(Base):
    __tablename__ = "Officer"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department_id = Column(String, ForeignKey("Department.id"), nullable=False)
    jurisdiction_id = Column(String, ForeignKey("Jurisdiction.id"), nullable=False)
    designation = Column(String, default="Ward Nodal Officer", nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    department = relationship("Department", back_populates="officers")


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
    
    # Routing Fields
    responsible_authority = Column(String, nullable=False, default="Municipal Corporation")
    responsible_department = Column(String, nullable=False)
    assigned_officer = Column(String, nullable=True, default="Ward Nodal Officer")
    routing_confidence = Column(Integer, default=85, nullable=False)
    routing_status = Column(String, default="Automatically Routed", nullable=False)
    routing_reason = Column(Text, nullable=True)
    requires_human_review = Column(Boolean, default=False, nullable=False)
    
    category_mismatch = Column(Boolean, default=False, nullable=False)
    citizen_selected_category = Column(String, nullable=True)
    
    manual_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)
    overridden_by = Column(String, nullable=True)
    override_timestamp = Column(DateTime, nullable=True)

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
    
    # Routing Inheritance Fields
    responsible_authority = Column(String, nullable=True)
    responsible_department = Column(String, nullable=True)
    assigned_officer = Column(String, nullable=True)
    routing_confidence = Column(Integer, default=85, nullable=False)
    routing_status = Column(String, default="Automatically Routed", nullable=False)
    routing_reason = Column(Text, nullable=True)
    requires_human_review = Column(Boolean, default=False, nullable=False)
    category_mismatch = Column(Boolean, default=False, nullable=False)
    citizen_selected_category = Column(String, nullable=True)
    manual_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)

    # Foreign key linking ticket to parent CivicIssue
    civic_issue_id = Column(String, ForeignKey("CivicIssue.id"), nullable=True)
    civic_issue = relationship("CivicIssue", back_populates="tickets")


class RoutingAuditLog(Base):
    __tablename__ = "RoutingAuditLog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    target_id = Column(String, nullable=False) # Ticket or CivicIssue ID
    target_type = Column(String, default="Ticket", nullable=False)
    action = Column(String, nullable=False) # "AI_ROUTED", "CITIZEN_ACCEPTED_SUGGESTION", "OFFICER_OVERRIDE"
    previous_authority = Column(String, nullable=True)
    previous_department = Column(String, nullable=True)
    new_authority = Column(String, nullable=False)
    new_department = Column(String, nullable=False)
    performed_by = Column(String, default="NIVARAN AI Engine", nullable=False)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)


