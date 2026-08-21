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
}

export interface ClusterSummary {
  id: string;
  topic: string;
  department: DepartmentType;
  ward: string;
  count: number;
  avgPriority: number;
  representativeText: string;
  centerX: number;
  centerY: number;
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
  priority: PriorityLevel;
  duplicateMatch: Grievance | null;
  similarityScore: number;
  distanceMeters?: number;
  h3Index: string;
  confidence: number;
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


