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
  priorityScore: number;
  priority: PriorityLevel;
  duplicateMatch: Grievance | null;
  matchedCivicIssue: CivicIssue | null;
  confidence: number;
}

