import type { Grievance, GovernanceScorecardData, SubTask } from '../types/grievance';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendTicket {
  id: string;
  text: string;
  location: string;
  category: string;
  priority_score: number;
  base_severity?: number;
  status: string;
  created_at: string;
  latitude?: number;
  longitude?: number;
  h3_index?: string;
  upvotes?: number;
  duplicate_group?: string | null;
  verification_status?: 'unverified' | 'pending_verification' | 'verified_closed' | 'rejected_escalated';
  citizen_otp?: string;
  falsified_attempts?: number;
  assigned_officer?: string;
  resolution_proof_lat?: number;
  resolution_proof_lng?: number;
  resolution_image_url?: string;
  resolution_cv_score?: number;
  closure_rejected_reason?: string;
  resolved_at?: string;
  parent_ticket_id?: string | null;
  sub_tasks?: string;
  transfers_count?: number;
  audit_trail?: string;
}

export interface AnalyzeResponse {
  category: string;
  priority_score: number;
  base_severity: number;
  topic?: string;
  confidence?: number;
}

const DEPT_CENTROIDS: Record<string, { cx: number; cy: number }> = {
  'Water Supply': { cx: 18.4, cy: 72.1 },
  'Roads & Infra': { cx: 62.8, cy: 33.8 },
  'Sanitation & Waste': { cx: -45.0, cy: 80.0 },
  'Electricity': { cx: 85.0, cy: -50.0 },
  'Public Distribution': { cx: -75.0, cy: -45.0 },
  'Public Health & Healthcare': { cx: -20.0, cy: -60.0 }
};

function getStableHashOffset(id: string, salt: number, spread: number): number {
  let hash = salt;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (((Math.abs(hash) % 1000) / 1000) - 0.5) * spread;
}

// Convert Backend Ticket format to Frontend Grievance model
export function mapBackendTicketToGrievance(bt: BackendTicket): Grievance {
  let priority: Grievance['Priority'] = 'Low';
  if (bt.priority_score >= 85) priority = 'Critical';
  else if (bt.priority_score >= 70) priority = 'High';
  else if (bt.priority_score >= 45) priority = 'Medium';

  let dept: Grievance['Department'] = 'Sanitation & Waste';
  const cat = (bt.category || '').toLowerCase();
  if (cat.includes('water')) dept = 'Water Supply';
  else if (cat.includes('road') || cat.includes('infra') || cat.includes('pothole')) dept = 'Roads & Infra';
  else if (cat.includes('sanitation') || cat.includes('garbage') || cat.includes('drain')) dept = 'Sanitation & Waste';
  else if (cat.includes('electric') || cat.includes('power') || cat.includes('transformer')) dept = 'Electricity';
  else if (cat.includes('health') || cat.includes('hospital')) dept = 'Public Health & Healthcare';
  else if (cat.includes('pension') || cat.includes('ration') || cat.includes('distribution')) dept = 'Public Distribution';

  const baseCluster = DEPT_CENTROIDS[dept] || { cx: 0, cy: 0 };
  const clusterX = Number((baseCluster.cx + getStableHashOffset(bt.id, 17, 18)).toFixed(2));
  const clusterY = Number((baseCluster.cy + getStableHashOffset(bt.id, 31, 18)).toFixed(2));

  let parsedSubtasks: SubTask[] = [];
  try {
    if (bt.sub_tasks) {
      parsedSubtasks = typeof bt.sub_tasks === 'string' ? JSON.parse(bt.sub_tasks) : bt.sub_tasks;
    }
  } catch {
    parsedSubtasks = [];
  }

  let parsedAudit = [];
  try {
    if (bt.audit_trail) {
      parsedAudit = typeof bt.audit_trail === 'string' ? JSON.parse(bt.audit_trail) : bt.audit_trail;
    }
  } catch {
    parsedAudit = [];
  }

  return {
    Complaint_ID: bt.id,
    Complaint: bt.text,
    Language: 'English',
    Department: dept,
    Topic: bt.category || 'General Civic Issue',
    Severity: bt.priority_score >= 85 ? 5 : bt.priority_score >= 70 ? 4 : 3,
    Urgency: bt.priority_score >= 85 ? 5 : bt.priority_score >= 70 ? 4 : 3,
    Affected_Scope: bt.priority_score >= 85 ? 5 : 3,
    Priority_Score: bt.priority_score,
    Base_Severity: bt.base_severity ?? 50,
    Priority: priority,
    Duplicate_Group: bt.duplicate_group || null,
    Ward: bt.location || 'Ward 4 - Andheri West',
    Status: (bt.status as Grievance['Status']) || 'Pending',
    Date_Submitted: bt.created_at || new Date().toISOString(),
    Latitude: bt.latitude ?? 19.1197,
    Longitude: bt.longitude ?? 72.8464,
    H3_Index: bt.h3_index,
    Upvotes: bt.upvotes ?? 1,
    Assigned_Officer: bt.assigned_officer || `Er. ${dept.split(' ')[0]} Officer`,
    Verification_Status: bt.verification_status || 'unverified',
    Citizen_OTP: bt.citizen_otp,
    Falsified_Attempts: bt.falsified_attempts ?? 0,
    Transfers_Count: bt.transfers_count ?? 0,
    Resolution_Proof: bt.resolution_image_url
      ? {
          officer_name: bt.assigned_officer || 'Ground Officer',
          officer_lat: bt.resolution_proof_lat ?? bt.latitude ?? 19.1197,
          officer_lng: bt.resolution_proof_lng ?? bt.longitude ?? 72.8464,
          distance_m: 12.4,
          image_url: bt.resolution_image_url,
          cv_delta_score: bt.resolution_cv_score ?? 0.88,
          notes: 'Field resolution proof submitted on site.',
          submitted_at: bt.resolved_at || new Date().toISOString()
        }
      : undefined,
    Closure_Rejected_Reason: bt.closure_rejected_reason,
    Resolved_At: bt.resolved_at,
    Parent_Ticket_ID: bt.parent_ticket_id,
    Sub_Tasks: parsedSubtasks,
    Audit_Trail: parsedAudit,
    Cluster_X: clusterX,
    Cluster_Y: clusterY
  };
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, { method: 'HEAD' });
    return res.ok || res.status === 200 || res.status === 307;
  } catch {
    return false;
  }
}

export async function fetchTicketsApi(): Promise<Grievance[]> {
  const res = await fetch(`${API_BASE_URL}/api/tickets`);
  if (!res.ok) throw new Error('Failed to fetch tickets from FastAPI backend');
  const data: BackendTicket[] = await res.json();
  return data.map(mapBackendTicketToGrievance);
}

export async function createTicketApi(
  id: string,
  text: string,
  location: string,
  category?: string,
  priorityScore?: number,
  latitude: number = 19.1197,
  longitude: number = 72.8464,
  assignedOfficer?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      text,
      location,
      category,
      priority_score: priorityScore,
      latitude,
      longitude,
      assigned_officer: assignedOfficer
    })
  });
  if (!res.ok) throw new Error('Failed to create ticket in FastAPI backend');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function upvoteTicketApi(
  ticketId: string,
  citizenNote?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citizen_note: citizenNote })
  });
  if (!res.ok) throw new Error('Failed to upvote ticket');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function submitResolutionProofApi(
  ticketId: string,
  officerName: string,
  officerLatitude: number,
  officerLongitude: number,
  resolutionImageUrl?: string,
  resolutionNotes?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/resolve-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      officer_name: officerName,
      officer_latitude: officerLatitude,
      officer_longitude: officerLongitude,
      resolution_image_url: resolutionImageUrl,
      resolution_notes: resolutionNotes
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to submit resolution proof');
  }
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function verifyResolutionApi(
  ticketId: string,
  action: 'approve' | 'reject',
  otp?: string,
  rejectionReason?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/verify-resolution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      otp,
      rejection_reason: rejectionReason
    })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to verify resolution');
  }
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function createSplitTasksApi(
  ticketId: string,
  subTasks: SubTask[]
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/split-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sub_tasks: subTasks })
  });
  if (!res.ok) throw new Error('Failed to create split tasks');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function resolveSubTaskApi(
  ticketId: string,
  subTaskId: string,
  officerNotes?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}/subtasks/${subTaskId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officer_notes: officerNotes })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to resolve sub-task');
  }
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function updateTicketStatusApi(
  ticketId: string,
  status?: string,
  department?: string,
  assignedOfficer?: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, department, assigned_officer: assignedOfficer })
  });
  if (!res.ok) throw new Error('Failed to update status in FastAPI backend');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function fetchGovernanceScorecardApi(): Promise<GovernanceScorecardData> {
  const res = await fetch(`${API_BASE_URL}/api/analytics/governance-scorecard`);
  if (!res.ok) throw new Error('Failed to fetch governance scorecard');
  return res.json();
}

export async function analyzeTextApi(text: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Failed to analyze text in FastAPI backend');
  return res.json();
}

export async function uploadFileApi(file: File): Promise<{ message: string; records_added: number; civic_issues_count?: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/upload-file`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload file to FastAPI backend');
  return res.json();
}

export async function fetchCivicIssuesApi(): Promise<import('../types/grievance').CivicIssue[]> {
  const res = await fetch(`${API_BASE_URL}/api/civic-issues`);
  if (!res.ok) throw new Error('Failed to fetch civic issues from FastAPI backend');
  return res.json();
}

export async function updateCivicIssueStatusApi(
  issueId: string,
  status: string,
  responsibleAuthority?: string
): Promise<import('../types/grievance').CivicIssue> {
  const res = await fetch(`${API_BASE_URL}/api/civic-issues/${issueId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, responsible_authority: responsibleAuthority })
  });
  if (!res.ok) throw new Error('Failed to update civic issue in FastAPI backend');
  return res.json();
}

export async function analyzeRoutingApi(
  text: string,
  selectedCategory?: string,
  ward?: string
): Promise<import('../types/grievance').RoutingResult> {
  const res = await fetch(`${API_BASE_URL}/api/routing/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, selected_category: selectedCategory, ward })
  });
  if (!res.ok) throw new Error('Failed to analyze routing in FastAPI backend');
  return res.json();
}

export async function fetchRoutingReviewQueueApi(): Promise<import('../types/grievance').CivicIssue[]> {
  const res = await fetch(`${API_BASE_URL}/api/routing/review-queue`);
  if (!res.ok) throw new Error('Failed to fetch routing review queue');
  return res.json();
}

export async function overrideRoutingApi(
  targetId: string,
  authority: string,
  department: string,
  assignedOfficer?: string,
  reason?: string,
  officerName?: string
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/routing/${targetId}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authority, department, assigned_officer: assignedOfficer, reason, officer_name: officerName })
  });
  if (!res.ok) throw new Error('Failed to override routing in FastAPI backend');
  return res.json();
}

export async function decomposeGrievanceApi(
  text: string,
  selectedCategory?: string,
  ward?: string
): Promise<import('../types/grievance').ResolutionPlan> {
  const res = await fetch(`${API_BASE_URL}/api/ai/decompose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, selected_category: selectedCategory, ward })
  });
  if (!res.ok) throw new Error('Failed to decompose grievance in FastAPI backend');
  return res.json();
}

export async function reviewResolutionPlanApi(
  issueId: string,
  planOverride: Record<string, unknown>
): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/civic-issues/${issueId}/review-plan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(planOverride)
  });
  if (!res.ok) throw new Error('Failed to review resolution plan in FastAPI backend');
  return res.json();
}

// TOKEN MANAGEMENT HELPERS
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('nivaran_jwt_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem('nivaran_jwt_token', token);
  } catch (e) {
    console.warn('Failed to save auth token:', e);
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem('nivaran_jwt_token');
    localStorage.removeItem('nivaran_user_session');
  } catch (e) {
    console.warn('Failed to clear auth token:', e);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// AUTHENTICATION API CALLS
export async function registerApi(data: {
  full_name: string;
  email: string;
  mobile_number?: string;
  password: string;
  address?: string;
  ward?: string;
  preferred_language?: string;
}): Promise<{ status: string; token: string; user: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed');
    }
    const result = await res.json();
    if (result.token) setAuthToken(result.token);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function loginApi(
  loginId: string,
  password: string,
  authType: string = 'citizen'
): Promise<{ status: string; token: string; user: any }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: loginId, password, auth_type: authType }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Login failed');
    }
    const result = await res.json();
    if (result.token) setAuthToken(result.token);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function fetchCurrentUserApi(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function fetchMyComplaintsApi(): Promise<Grievance[]> {
  const res = await fetch(`${API_BASE_URL}/api/citizens/me/complaints`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch citizen complaints');
  const data: BackendTicket[] = await res.json();
  return data.map(mapBackendTicketToGrievance);
}

export async function fetchOfficerIssuesApi(): Promise<import('../types/grievance').CivicIssue[]> {
  const res = await fetch(`${API_BASE_URL}/api/officers/me/issues`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch officer assigned issues');
  return res.json();
}
