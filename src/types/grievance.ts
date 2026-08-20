export type LanguageType = 'English' | 'Hindi' | 'Hinglish';

export type DepartmentType =
  | 'Water Supply'
  | 'Roads & Infra'
  | 'Sanitation & Waste'
  | 'Electricity'
  | 'Public Distribution'
  | 'Public Health & Healthcare';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type GrievanceStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Escalated';

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

export interface Grievance {
  Complaint_ID: string;
  Complaint: string;
  Language: LanguageType;
  Department: DepartmentType;
  Topic: string;
  Severity: number; // 1 to 5
  Urgency: number; // 1 to 5
  Affected_Scope: number; // 1 to 5
  Priority_Score: number; // 0 to 100
  Priority: PriorityLevel;
  Duplicate_Group: string | null;
  Ward: string;
  Status: GrievanceStatus;
  Date_Submitted: string; // ISO string
  Latitude: number;
  Longitude: number;
  Upvotes: number;
  Assigned_Officer?: string;
  Cluster_X?: number; // BERTopic 2D embedding coordinate X
  Cluster_Y?: number; // BERTopic 2D embedding coordinate Y
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
  priorityScore: number;
  priorityLevel: PriorityLevel;
  priority: PriorityLevel;
  confidence: number;
  duplicateMatch?: Grievance | null;
  matchedCivicIssue?: CivicIssue | null;
  routing?: RoutingResult;
}
