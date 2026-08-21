import type {
  DepartmentType,
  Grievance,
  LanguageType,
  PriorityLevel,
  TriageResult
} from '../types/grievance';
import { latLngToCell } from 'h3-js';

// -------------------------------------------------------------
// Spatial & H3 Utilities
// -------------------------------------------------------------
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getH3Index(lat: number, lng: number, resolution: number = 10): string {
  try {
    return latLngToCell(lat, lng, resolution);
  } catch {
    return `h3_res${resolution}_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`;
  }
}

// -------------------------------------------------------------
// Dynamic Priority Score Formula
// Priority Score = min(100, BaseSeverity + 10 * log2(Upvotes + 1) + ElapsedHours * 0.75)
// -------------------------------------------------------------
export function calculateDynamicPriorityScore(
  baseSeverity: number,
  upvotes: number = 1,
  dateSubmitted?: string
): number {
  let elapsedHours = 0;
  if (dateSubmitted) {
    const submittedTime = new Date(dateSubmitted).getTime();
    const now = Date.now();
    elapsedHours = Math.max(0, (now - submittedTime) / (1000 * 60 * 60));
  }

  const upvoteBoost = 10 * Math.log2(Math.max(1, upvotes) + 1);
  const timeBoost = elapsedHours * 0.75;
  const total = baseSeverity + upvoteBoost + timeBoost;
  return Math.min(100, Math.max(15, Math.round(total)));
}

// -------------------------------------------------------------
// Multilingual Civic Normalizer
// -------------------------------------------------------------
export function normalizeCivicText(text: string): string {
  if (!text) return '';
  const t = text.toLowerCase();
  const map: Record<string, string> = {
    paani: 'water',
    pani: 'water',
    phat: 'burst leak',
    phata: 'burst',
    toot: 'broken',
    gadda: 'pothole',
    gaddhe: 'potholes',
    sadak: 'road',
    rasta: 'road',
    kachra: 'garbage waste',
    safai: 'cleaning waste',
    bijli: 'electricity power',
    batti: 'light electricity',
    aspatal: 'hospital clinic',
    aspataal: 'hospital',
    dawa: 'medicine'
  };

  return t
    .split(/\s+/)
    .map((w) => map[w.replace(/[^a-z]/g, '')] || w)
    .join(' ');
}

export function detectLanguage(text: string): LanguageType {
  if (!text || text.trim().length === 0) return 'English';

  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    return 'Hindi';
  }

  const hinglishTokens = [
    'paani', 'pani', 'kachra', 'gadda', 'sadak', 'bijli', 'batti', 'naala',
    'phat', 'phata', 'hai', 'hain', 'ho', 'me', 'mein', 'par', 'pe', 'nahi',
    'nahin', 'aaj', 'kal', 'bohot', 'bahut', 'bada', 'chhota', 'bhai', 'wala',
    'wali', 'daba', 'aag', 'kharaab', 'kharab', 'aspatal', 'aspataal', 'dawa'
  ];

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let hinglishCount = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (hinglishTokens.includes(cleanWord)) {
      hinglishCount++;
    }
  }

  if (hinglishCount >= 1) {
    return 'Hinglish';
  }

  return 'English';
}

export function classifyDepartment(text: string): {
  department: DepartmentType;
  topic: string;
  confidence: number;
} {
  const lower = text.toLowerCase();

  const waterScore = countMatches(lower, [
    'water', 'pipeline', 'leak', 'pipe', 'tap', 'pressure', 'supply', 'paani',
    'pani', 'nall', 'peene', 'contamination', 'dirty water', 'yellowish', 'phat'
  ]);

  const infraScore = countMatches(lower, [
    'pothole', 'road', 'gadda', 'gaddhe', 'subway', 'footpath', 'cave-in',
    'sadak', 'bridge', 'tar', 'asphalt', 'traffic', 'accident', 'slipping'
  ]);

  const sanitationScore = countMatches(lower, [
    'garbage', 'kachra', 'waste', 'drain', 'sewage', 'naala', 'nala', 'dump',
    'smell', 'foul', 'uncollected', 'vector', 'makkhi', 'safai'
  ]);

  const elecScore = countMatches(lower, [
    'transformer', 'power', 'light', 'bijli', 'blackout', 'meter', 'batti',
    'voltage', 'blast', 'spark', 'sparks', 'outage', 'dark spot', 'gokhale'
  ]);

  const pdsScore = countMatches(lower, [
    'ration', 'pension', 'dbt', 'card', 'benefit', 'dukan', 'biometric',
    'widow', 'senior citizen', 'grain', 'shop'
  ]);

  const healthScore = countMatches(lower, [
    'hospital', 'hospitals', 'doctor', 'doctors', 'clinic', 'medical', 'medicine',
    'bed', 'beds', 'ambulance', 'dengue', 'malaria', 'icu', 'oxygen', 'patient',
    'patients', 'health', 'healthcare', 'phc', 'aspatal', 'aspataal', 'dawa', 'swasthya'
  ]);

  const scores = [
    { dept: 'Public Health & Healthcare' as DepartmentType, topic: 'Hospital Infrastructure & Emergency Services', score: healthScore * 1.8 },
    { dept: 'Water Supply' as DepartmentType, topic: 'Water Pipeline Leakage & Disruption', score: waterScore * 1.5 },
    { dept: 'Roads & Infra' as DepartmentType, topic: 'Pothole & Road Surface Hazard', score: infraScore * 1.4 },
    { dept: 'Sanitation & Waste' as DepartmentType, topic: 'Garbage Dump Overflow & Waste Discard', score: sanitationScore * 1.4 },
    { dept: 'Electricity' as DepartmentType, topic: 'Transformer Failure & Blackout', score: elecScore * 1.5 },
    { dept: 'Public Distribution' as DepartmentType, topic: 'Pension Disbursal & Benefit Delay', score: pdsScore * 1.3 }
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    const totalScore = scores.reduce((sum, item) => sum + item.score, 0);
    const confidence = Math.min(0.98, Math.max(0.72, scores[0].score / (totalScore || 1)));
    return {
      department: scores[0].dept,
      topic: scores[0].topic,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  return {
    department: 'Sanitation & Waste',
    topic: 'General Civic Administration',
    confidence: 0.65
  };
}

function countMatches(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) {
      count++;
    }
  }
  return count;
}

// Compute semantic cosine similarity across token frequency vectors
function computeTextCosineSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeCivicText(text1);
  const norm2 = normalizeCivicText(text2);

  const getTokens = (t: string) => t.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const tokens1 = getTokens(norm1);
  const tokens2 = getTokens(norm2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const vocab = Array.from(new Set([...tokens1, ...tokens2]));
  const vec1 = vocab.map((w) => tokens1.filter((t) => t === w).length);
  const vec2 = vocab.map((w) => tokens2.filter((t) => t === w).length);

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vocab.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

// -------------------------------------------------------------
// Pillar 1: Two-Stage Spatio-Semantic Triage Pipeline
// Stage 1: Spatial Gating (candidates within <= 35 meters)
// Stage 2: Semantic Verification (Cosine similarity > 0.78)
// -------------------------------------------------------------
export function performAiTriage(
  text: string,
  targetLat: number,
  targetLng: number,
  existingGrievances: Grievance[] = []
): TriageResult {
  const language = detectLanguage(text);
  const { department, topic, confidence } = classifyDepartment(text);
  const h3Index = getH3Index(targetLat, targetLng, 10);

  const lower = text.toLowerCase();

  // Severity (1-5)
  let severity = 2;
  if (countMatches(lower, ['hospital', 'hospitals', 'blast', 'explosion', 'gushing', 'phat', 'flooding', 'blackout', 'aag', 'sparks', 'cave-in', 'emergency', 'no working', 'icu', 'oxygen', 'ambulance', 'life']) > 0) {
    severity = 5;
  } else if (countMatches(lower, ['doctor', 'clinic', 'pothole', 'accident', 'dirty', 'leak', 'overflow', 'blockage', 'dangerous', 'dark spot', 'hazard']) > 0) {
    severity = 4;
  } else if (countMatches(lower, ['delay', 'uncollected', 'smell', 'broken', 'issue', 'problem']) > 0) {
    severity = 3;
  }

  // Urgency (1-5)
  let urgency = 2;
  if (countMatches(lower, ['hospital', 'hospitals', 'no working', 'emergency', 'urgent', 'immediately', 'now', 'today', 'hours', 'risk', 'danger', 'icu', 'ambulance']) > 0) {
    urgency = 5;
  } else if (countMatches(lower, ['rain', 'traffic', 'slipping', 'sparks', 'foul', 'night']) > 0) {
    urgency = 4;
  } else if (countMatches(lower, ['days', 'week', 'waiting']) > 0) {
    urgency = 3;
  }

  // Affected Scope (1-5)
  let affectedScope = 2;
  if (countMatches(lower, ['kandivali', 'entire', 'whole', 'block', 'ward', 'colony', 'area', 'society', '1 km', 'all', 'station', 'subway', 'city']) > 0) {
    affectedScope = 5;
  } else if (countMatches(lower, ['junction', 'road', 'multiple', 'homes', 'people', 'queue']) > 0) {
    affectedScope = 4;
  } else if (countMatches(lower, ['building', 'street', 'exit']) > 0) {
    affectedScope = 3;
  }

  // Base Severity (0-100)
  const rawBase = (severity * 0.35 + urgency * 0.35 + affectedScope * 0.30) * 20;
  const baseSeverity = Math.min(95, Math.max(20, Math.round(rawBase)));

  // Dynamic Priority for newly lodged ticket
  const priorityScore = calculateDynamicPriorityScore(baseSeverity, 1);

  let priority: PriorityLevel = 'Low';
  if (priorityScore >= 85) priority = 'Critical';
  else if (priorityScore >= 70) priority = 'High';
  else if (priorityScore >= 45) priority = 'Medium';

  // Two-Stage Spatio-Semantic Deduplication
  let duplicateMatch: Grievance | null = null;
  let maxSim = 0;
  let matchDist = 0;

  if (text.trim().length > 6) {
    // Stage 1: Spatial Gating (<= 35 meters)
    // Exclude Resolved and Closed tickets — they are already handled and should not
    // be shown as duplicates to new submitters.
    const nearbyTickets = existingGrievances.filter((g) => {
      if (g.Status === 'Closed' || g.Status === 'Resolved') return false;
      const d = calculateHaversineDistance(targetLat, targetLng, g.Latitude, g.Longitude);
      return d <= 35.0;
    });

    // Stage 2: Semantic Cosine Verification (> 0.78)
    for (const cand of nearbyTickets) {
      const sim = computeTextCosineSimilarity(text, cand.Complaint);
      const dist = calculateHaversineDistance(targetLat, targetLng, cand.Latitude, cand.Longitude);

      // Spec threshold: > 0.78 cosine similarity (Blueprint Section 1, Stage 2)
      if (sim >= 0.78 && sim > maxSim) {
        maxSim = sim;
        duplicateMatch = cand;
        matchDist = dist;
      }
    }
  }

  return {
    language,
    department,
    topic,
    severity,
    urgency,
    affectedScope,
    baseSeverity,
    priorityScore,
    priority,
    duplicateMatch,
    similarityScore: Math.round(maxSim * 100) / 100,
    distanceMeters: duplicateMatch ? Math.round(matchDist * 10) / 10 : undefined,
    h3Index,
    confidence
  };
}

