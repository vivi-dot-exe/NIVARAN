import type { Grievance, DepartmentType, GrievanceStatus, PriorityLevel, LanguageType } from '../types/grievance';
import { performAiTriage } from '../utils/aiTriageEngine';

const API_BASE_URL = 'http://127.0.0.1:8000';

export interface BackendTicket {
  id: string;
  text: string;
  location: string;
  category?: string;
  priority_score: number;
  status: string;
  created_at: string;
}

export interface TicketCreatePayload {
  text: string;
  location: string;
  category?: string;
  priority_score?: number;
}

export interface UploadCsvResponse {
  message: string;
  records_added: number;
}

/**
 * Check if the FastAPI backend is running and reachable
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/docs`, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
    return res.ok || res.status === 200 || res.status === 307;
  } catch {
    return false;
  }
}

/**
 * Fetch all tickets from GET /api/tickets
 */
export async function fetchTicketsFromApi(): Promise<BackendTicket[]> {
  const response = await fetch(`${API_BASE_URL}/api/tickets`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tickets: ${response.statusText} (${response.status})`);
  }

  return response.json();
}

/**
 * Submit a new grievance ticket to POST /api/tickets
 */
export async function submitTicketToApi(payload: TicketCreatePayload): Promise<BackendTicket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit ticket: ${response.statusText} (${response.status})`);
  }

  return response.json();
}

/**
 * Update ticket status via PATCH /api/tickets/{ticket_id}
 */
export async function updateTicketStatusApi(ticketId: string, status: GrievanceStatus): Promise<BackendTicket> {
  const response = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update ticket status: ${response.statusText} (${response.status})`);
  }

  return response.json();
}

/**
 * Upload CSV / Excel file for batch ingestion via POST /api/upload-csv
 */
export async function uploadCsvFileApi(file: File): Promise<UploadCsvResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/upload-csv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // ignore
    }
    throw new Error(`Batch upload failed: ${errorDetail}`);
  }

  return response.json();
}

/**
 * Normalize department strings into standard DepartmentType
 */
export function normalizeDepartment(deptStr?: string): DepartmentType {
  if (!deptStr) return 'Sanitation & Waste';
  const lower = deptStr.toLowerCase();
  if (lower.includes('water')) return 'Water Supply';
  if (lower.includes('road') || lower.includes('pothole') || lower.includes('infra')) return 'Roads & Infra';
  if (lower.includes('sanitat') || lower.includes('waste') || lower.includes('garbage')) return 'Sanitation & Waste';
  if (lower.includes('elect') || lower.includes('power')) return 'Electricity';
  if (lower.includes('public') || lower.includes('distribut') || lower.includes('health') || lower.includes('safety') || lower.includes('ration') || lower.includes('pension')) return 'Public Distribution';
  return 'Sanitation & Waste';
}

/**
 * Convert a backend ticket into the rich frontend Grievance model
 */
export function backendTicketToGrievance(ticket: BackendTicket): Grievance {
  const triage = performAiTriage(ticket.text, ticket.location);
  const dept = normalizeDepartment(ticket.category || triage.department);
  const priorityScore = ticket.priority_score || triage.priorityScore || 50;

  let priority: PriorityLevel = 'Medium';
  if (priorityScore >= 85) priority = 'Critical';
  else if (priorityScore >= 70) priority = 'High';
  else if (priorityScore < 45) priority = 'Low';

  // Ward coordinate offsets
  let lat = 19.1197;
  let lng = 72.8464;
  if (ticket.location.includes('Bandra')) {
    lat = 19.0596;
    lng = 72.8400;
  } else if (ticket.location.includes('Kurla')) {
    lat = 19.0726;
    lng = 72.8845;
  } else if (ticket.location.includes('Malad')) {
    lat = 19.1860;
    lng = 72.8485;
  } else if (ticket.location.includes('Dadar')) {
    lat = 19.0178;
    lng = 72.8478;
  }
  lat += (Math.random() - 0.5) * 0.02;
  lng += (Math.random() - 0.5) * 0.02;

  // Cluster coordinate offsets by dept
  let cx = 0;
  let cy = 0;
  if (dept === 'Water Supply') { cx = 25; cy = 70; }
  else if (dept === 'Roads & Infra') { cx = 75; cy = 35; }
  else if (dept === 'Electricity') { cx = 85; cy = -60; }
  else if (dept === 'Sanitation & Waste') { cx = -55; cy = 80; }
  else if (dept === 'Public Distribution') { cx = -75; cy = -40; }
  cx += (Math.random() - 0.5) * 18;
  cy += (Math.random() - 0.5) * 18;

  return {
    Complaint_ID: ticket.id,
    Complaint: ticket.text,
    Language: triage.language as LanguageType,
    Department: dept,
    Topic: triage.topic,
    Severity: triage.severity,
    Urgency: triage.urgency,
    Affected_Scope: triage.affectedScope,
    Priority_Score: priorityScore,
    Priority: priority,
    Duplicate_Group: triage.duplicateMatch?.Duplicate_Group || null,
    Ward: ticket.location || 'Ward 4 - Andheri West',
    Status: (ticket.status as GrievanceStatus) || 'Pending',
    Date_Submitted: ticket.created_at || new Date().toISOString(),
    Latitude: lat,
    Longitude: lng,
    Upvotes: 1,
    Assigned_Officer: `Er. ${dept.split(' ')[0]} Nodal Officer`,
    Cluster_X: cx,
    Cluster_Y: cy,
  };
}
