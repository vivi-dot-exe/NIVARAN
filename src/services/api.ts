import type { Grievance } from '../types/grievance';

const API_BASE_URL = 'http://localhost:8000';

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
  else if (cat.includes('road') || cat.includes('infra')) dept = 'Roads & Infra';
  else if (cat.includes('sanitation') || cat.includes('garbage')) dept = 'Sanitation & Waste';
  else if (cat.includes('electric') || cat.includes('power')) dept = 'Electricity';
  else if (cat.includes('health') || cat.includes('public') || cat.includes('pension')) dept = 'Public Distribution';

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
    Ward: bt.location || 'Ward 4 - Andheri West',
    Status: (bt.status as Grievance['Status']) || 'Pending',
    Date_Submitted: bt.created_at || new Date().toISOString(),
    Latitude: 19.119 + (Math.random() - 0.5) * 0.05,
    Longitude: 72.846 + (Math.random() - 0.5) * 0.05,
    Upvotes: 1,
    Assigned_Officer: `Er. ${dept.split(' ')[0]} Officer`,
    Cluster_X: Math.random() * 140 - 70,
    Cluster_Y: Math.random() * 140 - 70
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

export async function uploadFileApi(file: File): Promise<{ message: string; records_added: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/upload-file`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload file to FastAPI backend');
  return res.json();
}
