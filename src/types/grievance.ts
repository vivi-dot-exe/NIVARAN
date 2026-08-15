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
  confidence: number;
}
