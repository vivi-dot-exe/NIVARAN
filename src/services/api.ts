import type { Grievance } from '../types/grievance';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface BackendTicket {
  id: string;
  text: string;
  location: string;
  category: string;
  priority_score: number;
  status: string;
  created_at: string;
}

export interface AnalyzeResponse {
  category: string;
  priority_score: number;
  confidence: number;
}

const DEPT_CENTROIDS: Record<string, { cx: number; cy: number }> = {
  'Water Supply': { cx: 18.4, cy: 72.1 },
  'Roads & Infra': { cx: 62.8, cy: 33.8 },
  'Sanitation & Waste': { cx: -45.0, cy: 80.0 },
  'Electricity': { cx: 85.0, cy: -50.0 },
  'Public Distribution': { cx: -75.0, cy: -45.0 },
  'Public Health & Healthcare': { cx: -20.0, cy: -60.0 }
};

const WARD_BASE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Ward 4 - Andheri West': { lat: 19.1197, lng: 72.8464 },
  'Ward 7 - Bandra East': { lat: 19.0620, lng: 72.8480 },
  'Ward 2 - Malad West': { lat: 19.1860, lng: 72.8485 },
  'Ward 9 - Dadar West': { lat: 19.0178, lng: 72.8478 },
  'Ward 12 - Kurla East': { lat: 19.0650, lng: 72.8790 }
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

  // Map category to department
  let dept: Grievance['Department'] = 'Sanitation & Waste';
  const cat = (bt.category || '').toLowerCase();
  if (cat.includes('water')) dept = 'Water Supply';
  else if (cat.includes('road') || cat.includes('infra') || cat.includes('pothole')) dept = 'Roads & Infra';
  else if (cat.includes('sanitation') || cat.includes('garbage') || cat.includes('drain')) dept = 'Sanitation & Waste';
  else if (cat.includes('electric') || cat.includes('power') || cat.includes('transformer')) dept = 'Electricity';
  else if (cat.includes('health') || cat.includes('hospital')) dept = 'Public Health & Healthcare';
  else if (cat.includes('pension') || cat.includes('ration') || cat.includes('distribution')) dept = 'Public Distribution';

  const ward = bt.location || 'Ward 4 - Andheri West';
  const baseWard = WARD_BASE_COORDS[ward] || { lat: 19.1197, lng: 72.8464 };
  const baseCluster = DEPT_CENTROIDS[dept] || { cx: 0, cy: 0 };

  const clusterX = Number((baseCluster.cx + getStableHashOffset(bt.id, 17, 18)).toFixed(2));
  const clusterY = Number((baseCluster.cy + getStableHashOffset(bt.id, 31, 18)).toFixed(2));
  const lat = Number((baseWard.lat + getStableHashOffset(bt.id, 47, 0.015)).toFixed(6));
  const lng = Number((baseWard.lng + getStableHashOffset(bt.id, 53, 0.015)).toFixed(6));

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
    Priority: priority,
    Duplicate_Group: null,
    Ward: ward,
    Status: (bt.status as Grievance['Status']) || 'Pending',
    Date_Submitted: bt.created_at || new Date().toISOString(),
    Latitude: lat,
    Longitude: lng,
    Upvotes: 1,
    Assigned_Officer: `Er. ${dept.split(' ')[0]} Officer`,
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
  priorityScore?: number
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, text, location, category, priority_score: priorityScore })
  });
  if (!res.ok) throw new Error('Failed to create ticket in FastAPI backend');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
}

export async function updateTicketStatusApi(
  ticketId: string,
  status: string
): Promise<Grievance> {
  const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error('Failed to update status in FastAPI backend');
  const data: BackendTicket = await res.json();
  return mapBackendTicketToGrievance(data);
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


