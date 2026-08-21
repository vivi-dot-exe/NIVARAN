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


class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, index=True) # e.g. CIT-10482 or OFF-2048
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mobile_number = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    role = Column(String, default="CITIZEN", nullable=False) # CITIZEN, NODAL_OFFICER, DEPARTMENT_ADMIN, SUPER_ADMIN
    address = Column(Text, nullable=True)
    city = Column(String, default="Mumbai", nullable=True)
    state = Column(String, default="Maharashtra", nullable=True)
    district = Column(String, default="Mumbai Suburban", nullable=True)
    ward = Column(String, default="Ward 4 - Andheri West", nullable=True)
    preferred_language = Column(String, default="English", nullable=True)
    account_status = Column(String, default="ACTIVE", nullable=False) # ACTIVE, SUSPENDED, DEACTIVATED
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    tickets = relationship("Ticket", back_populates="citizen", cascade="all, delete-orphan")


class Officer(Base):
    __tablename__ = "Officer"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("User.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    employee_identifier = Column(String, nullable=True) # e.g. EMP-MCGM-4092
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

    # Multi-Agency Decomposition Fields
    is_multi_agency = Column(Boolean, default=False, nullable=False)
    primary_issue_title = Column(String, nullable=True)
    root_cause = Column(Text, nullable=True)
    affected_infrastructure_json = Column(Text, nullable=True)
    sub_issues_json = Column(Text, nullable=True)
    dependencies_json = Column(Text, nullable=True)
    resolution_plan_json = Column(Text, nullable=True)
    decomposition_confidence = Column(Integer, default=85, nullable=False)

    # Relationship to child tickets
    tickets = relationship("Ticket", back_populates="civic_issue", cascade="all, delete-orphan")
    sub_issues = relationship("SubIssue", back_populates="civic_issue", cascade="all, delete-orphan")


class SubIssue(Base):
    __tablename__ = "SubIssue"

    id = Column(String, primary_key=True, index=True)
    civic_issue_id = Column(String, ForeignKey("CivicIssue.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    responsible_authority = Column(String, nullable=False)
    responsible_department = Column(String, nullable=False)
    assigned_officer = Column(String, nullable=True)
    confidence = Column(Integer, default=85, nullable=False)
    required_action = Column(Text, nullable=True)
    dependencies_json = Column(Text, nullable=True)
    status = Column(String, default="Pending", nullable=False)

    civic_issue = relationship("CivicIssue", back_populates="sub_issues")


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

    # Routing & Multi-Agency Inheritance Fields
    responsible_authority = Column(String, nullable=True)
    responsible_department = Column(String, nullable=True)
    routing_confidence = Column(Integer, default=85, nullable=False)
    routing_status = Column(String, default="Automatically Routed", nullable=False)
    routing_reason = Column(Text, nullable=True)
    requires_human_review = Column(Boolean, default=False, nullable=False)
    category_mismatch = Column(Boolean, default=False, nullable=False)
    citizen_selected_category = Column(String, nullable=True)
    manual_override = Column(Boolean, default=False, nullable=False)
    override_reason = Column(Text, nullable=True)

    is_multi_agency = Column(Boolean, default=False, nullable=False)
    primary_issue_title = Column(String, nullable=True)
    root_cause = Column(Text, nullable=True)
    resolution_plan_json = Column(Text, nullable=True)
    
    # Citizen Ownership & FK
    citizen_id = Column(String, ForeignKey("User.id"), nullable=True)
    citizen_name = Column(String, nullable=True)
    citizen_mobile = Column(String, nullable=True)

    # Foreign key linking ticket to parent CivicIssue
    civic_issue_id = Column(String, ForeignKey("CivicIssue.id"), nullable=True)

    civic_issue = relationship("CivicIssue", back_populates="tickets")
    citizen = relationship("User", back_populates="tickets")


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
