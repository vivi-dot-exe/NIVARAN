export type LanguageType = 'English' | 'Hindi' | 'Hinglish';

export type DepartmentType =
  | 'Water Supply'
  | 'Roads & Infra'
  | 'Sanitation & Waste'
  | 'Electricity'
  | 'Public Distribution'
  | 'Public Health & Healthcare';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type GrievanceStatus =
  | 'Pending'
  | 'In Progress'
  | 'Pending_Verification'
  | 'Resolved'
  | 'Escalated'
  | 'Closed';

export type VerificationStatus =
  | 'unverified'
  | 'pending_verification'
  | 'verified_closed'
  | 'rejected_escalated';

export interface SubTask {
  id: string;
  title: string;
  department: DepartmentType | string;
  assigned_officer: string;
  status: 'Pending' | 'In Progress' | 'Blocked' | 'Resolved';
  depends_on?: string[]; // IDs of tasks that must be resolved first
  resolved_at?: string;
}

export interface ResolutionProof {
  officer_name: string;
  officer_lat: number;
  officer_lng: number;
  distance_m: number;
  image_url?: string;
  cv_delta_score: number;
  notes: string;
  submitted_at: string;
}

export interface AuditLogEntry {
  timestamp: string;
  event: string;
  details: string;
  status?: string;
}

export interface Authority {
  id: string;
  name: string;
  type: string;
  departments: DepartmentType[];
}

export interface RoutingResult {
  authority: string;
  department: DepartmentType;
  department_name: string;
  jurisdiction: string;
  assigned_officer: string;
  routing_confidence: number; // 0 to 100
  routing_status: 'Automatically Routed' | 'Provisionally Routed' | 'Requires Human Verification' | 'Officer Overridden' | string;
  routing_reason: string;
  requires_human_review: boolean;
  category_mismatch: boolean;
  suggested_department: DepartmentType;
  citizen_selected_category?: string;
}

export interface RoutingAuditLog {
  id: number;
  target_id: string;
  target_type: 'Ticket' | 'CivicIssue';
  action: 'AI_ROUTED' | 'CITIZEN_ACCEPTED_SUGGESTION' | 'OFFICER_OVERRIDE';
  previous_authority?: string;
  previous_department?: string;
  new_authority: string;
  new_department: string;
  performed_by: string;
  reason?: string;
  timestamp: string;
}

export interface SubIssue {
  id: string; // e.g. SUB-001
  title: string;
  description?: string;
  category: DepartmentType | string;
  responsible_authority: string;
  responsible_department: string;
  assigned_officer?: string;
  confidence: number;
  required_action: string;
  dependencies: string[]; // List of prerequisite SubIssue IDs (e.g. ["SUB-001"])
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Blocked' | string;
}

export interface DependencyLink {
  from: string; // Prerequisite SubIssue ID
  to: string;   // Dependent SubIssue ID
  type?: 'prerequisite' | string;
  reason: string;
}

export interface ResolutionPlan {
  is_multi_agency: boolean;
  primary_issue_title: string;
  root_cause: string;
  affected_infrastructure: string[];
  sub_issues: SubIssue[];
  dependencies: DependencyLink[];
  overall_confidence: number;
  explainability: string[];
  routing?: RoutingResult;
}

export interface Grievance {
  Complaint_ID: string;
  Complaint: string;
  Language: LanguageType;
  Department: DepartmentType;
  Topic: string;
  Severity: number; // 1 to 5
  Urgency: number; // 1 to 5
  Affected_Scope: number; // 1 to 5
  Priority_Score: number; // 0 to 100 (Dynamic formula computed)
  Base_Severity?: number;
  Priority: PriorityLevel;
  Duplicate_Group: string | null;
  Ward: string;
  Status: GrievanceStatus;
  Date_Submitted: string; // ISO string
  Latitude: number;
  Longitude: number;
  H3_Index?: string;
  Upvotes: number;
  Assigned_Officer?: string;
  Verification_Status?: VerificationStatus;
  Citizen_OTP?: string;
  Falsified_Attempts?: number;
  Transfers_Count?: number;
  Resolution_Proof?: ResolutionProof;
  Closure_Rejected_Reason?: string;
  Resolved_At?: string;
  Parent_Ticket_ID?: string | null;
  Sub_Tasks?: SubTask[];
  Audit_Trail?: AuditLogEntry[];
  Cluster_X?: number; // 2D embedding coordinate X
  Cluster_Y?: number; // 2D embedding coordinate Y
  civic_issue_id?: string; // Foreign key to parent CivicIssue
  responsible_authority?: string;
  responsible_department?: DepartmentType;
  routing_confidence?: number;
  routing_status?: string;
  routing_reason?: string;
  requires_human_review?: boolean;
  category_mismatch?: boolean;
  citizen_selected_category?: string;
  manual_override?: boolean;
  override_reason?: string;
  is_multi_agency?: boolean;
  primary_issue_title?: string;
  root_cause?: string;
  resolution_plan?: ResolutionPlan;
}

export interface CivicIssue {
  id: string; // e.g. CI-1042
  issue_title: string;
  issue_description: string;
  category: string;
  subcategory: string;
  ward: string;
  latitude: number;
  longitude: number;
  status: GrievanceStatus;
  created_at: string;
  last_reported_at: string;
  affected_citizen_count: number;
  report_count: number;
  duplicate_count: number;
  priority_score: number;
  priority_level: PriorityLevel;
  severity_score: number;
  urgency_score: number;
  scope_score: number;
  responsible_department: DepartmentType;
  responsible_authority: string;
  assigned_officer?: string;
  routing_confidence?: number;
  routing_status?: string;
  routing_reason?: string;
  requires_human_review?: boolean;
  category_mismatch?: boolean;
  citizen_selected_category?: string;
  manual_override?: boolean;
  override_reason?: string;
  overridden_by?: string;
  override_timestamp?: string;
  is_multi_agency?: boolean;
  primary_issue_title?: string;
  root_cause?: string;
  affected_infrastructure?: string[];
  sub_issues?: SubIssue[];
  dependencies?: DependencyLink[];
  resolution_plan?: ResolutionPlan;
  decomposition_confidence?: number;
  cluster_confidence: number;
  resolved_at?: string | null;
  tickets?: Grievance[];
  growth_rate?: number;
  is_emerging?: boolean;
}

export interface ClusterSummary {
  id: string;
  topic: string;
  department: DepartmentType;
  ward?: string;
  count?: number;
  avgPriority?: number;
  representativeText?: string;
  ticket_count?: number;
  representative_complaint?: string;
  center_x?: number;
  center_y?: number;
  centerX?: number;
  centerY?: number;
  color: string;
}

export interface TriageResult {
  language: LanguageType;
  department: DepartmentType;
  topic: string;
  severity: number;
  urgency: number;
  affectedScope: number;
  baseSeverity: number;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  priority: PriorityLevel;
  duplicateMatch: Grievance | null;
  similarityScore: number;
  distanceMeters?: number;
  h3Index: string;
  confidence: number;
  matchedCivicIssue?: CivicIssue | null;
  routing?: RoutingResult;
  resolution_plan?: ResolutionPlan;
}

export interface WardGovernanceMetric {
  ward: string;
  total_tickets: number;
  resolved_tickets?: number;
  true_mttr_hours: number;
  target_sla_hours: number;
  jurisdiction_bounce_rate: number;
  false_closure_rate: number;
  governance_grade: 'A' | 'B' | 'C' | 'F';
}

export interface GovernanceScorecardData {
  true_mttr_hours: number;
  target_sla_hours: number;
  jurisdiction_bounce_rate: number;
  false_closure_rate: number;
  total_tickets: number;
  ward_scorecards: WardGovernanceMetric[];
}


