import type {
  DepartmentType,
  Grievance,
  CivicIssue,
  LanguageType,
  PriorityLevel,
  TriageResult
} from '../types/grievance';

export function detectLanguage(text: string): LanguageType {
  if (!text || text.trim().length === 0) return 'English';

  // Check for Devanagari script (Hindi)
  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    return 'Hindi';
  }

  // Common Hinglish code-mixed tokens
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

  // Water keywords
  const waterScore = countMatches(lower, [
    'water', 'pipeline', 'leak', 'pipe', 'tap', 'pressure', 'supply', 'paani',
    'pani', 'nall', 'peene', 'contamination', 'dirty water', 'yellowish', 'phat'
  ]);

  // Infra keywords
  const infraScore = countMatches(lower, [
    'pothole', 'road', 'gadda', 'gaddhe', 'subway', 'footpath', 'cave-in',
    'sadak', 'bridge', 'tar', 'asphalt', 'traffic', 'accident', 'slipping'
  ]);

  // Sanitation keywords
  const sanitationScore = countMatches(lower, [
    'garbage', 'kachra', 'waste', 'drain', 'sewage', 'naala', 'nala', 'dump',
    'smell', 'foul', 'uncollected', 'vector', 'makkhi', 'safai'
  ]);

  // Electricity keywords
  const elecScore = countMatches(lower, [
    'transformer', 'power', 'light', 'bijli', 'blackout', 'meter', 'batti',
    'voltage', 'blast', 'spark', 'sparks', 'outage', 'dark spot', 'gokhale'
  ]);

  // Public Distribution keywords
  const pdsScore = countMatches(lower, [
    'ration', 'pension', 'dbt', 'card', 'benefit', 'dukan', 'biometric',
    'widow', 'senior citizen', 'grain', 'shop'
  ]);

  // Public Health & Healthcare keywords
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

  // General Fallback
  return {
    department: 'Public Health & Healthcare',
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

export function performAiTriage(
  text: string,
  ward: string,
  existingGrievances: Grievance[] = [],
  existingCivicIssues: CivicIssue[] = []
): TriageResult {
  const language = detectLanguage(text);
  const { department, topic, confidence } = classifyDepartment(text);

  const lower = text.toLowerCase();

  // Calculate Severity (1-5)
  let severity = 2;
  if (countMatches(lower, ['hospital', 'hospitals', 'blast', 'explosion', 'gushing', 'phat', 'flooding', 'blackout', 'aag', 'sparks', 'cave-in', 'emergency', 'no working', 'icu', 'oxygen', 'ambulance', 'life']) > 0) {
    severity = 5;
  } else if (countMatches(lower, ['doctor', 'clinic', 'pothole', 'accident', 'dirty', 'leak', 'overflow', 'blockage', 'dangerous', 'dark spot', 'hazard']) > 0) {
    severity = 4;
  } else if (countMatches(lower, ['delay', 'uncollected', 'smell', 'broken', 'issue', 'problem']) > 0) {
    severity = 3;
  }

  // Calculate Urgency (1-5)
  let urgency = 2;
  if (countMatches(lower, ['hospital', 'hospitals', 'no working', 'emergency', 'urgent', 'immediately', 'now', 'today', 'hours', 'risk', 'danger', 'icu', 'ambulance']) > 0) {
    urgency = 5;
  } else if (countMatches(lower, ['rain', 'traffic', 'slipping', 'sparks', 'foul', 'night']) > 0) {
    urgency = 4;
  } else if (countMatches(lower, ['days', 'week', 'waiting']) > 0) {
    urgency = 3;
  }

  // Calculate Affected Scope (1-5)
  let affectedScope = 2;
  if (countMatches(lower, ['kandivali', 'entire', 'whole', 'block', 'ward', 'colony', 'area', 'society', '1 km', 'all', 'station', 'subway', 'city']) > 0) {
    affectedScope = 5;
  } else if (countMatches(lower, ['junction', 'road', 'multiple', 'homes', 'people', 'queue']) > 0) {
    affectedScope = 4;
  } else if (countMatches(lower, ['building', 'street', 'exit']) > 0) {
    affectedScope = 3;
  }

  // Composite Priority Score (0-100)
  const rawScore = (severity * 0.35 + urgency * 0.35 + affectedScope * 0.30) * 20;
  const priorityScore = Math.min(100, Math.max(15, Math.round(rawScore)));

  let priority: PriorityLevel = 'Low';
  if (priorityScore >= 85) priority = 'Critical';
  else if (priorityScore >= 70) priority = 'High';
  else if (priorityScore >= 45) priority = 'Medium';

  // Level 1: Ticket Duplicate Check
  let duplicateMatch: Grievance | null = null;
  if (ward && text.length > 10) {
    const wardGrievances = existingGrievances.filter((g) => g.Ward === ward);
    for (const g of wardGrievances) {
      if (g.Department === department) {
        const wordMatch = countCommonWords(text, g.Complaint);
        if (wordMatch >= 3 || (g.Duplicate_Group && g.Department === department)) {
          duplicateMatch = g;
          break;
        }
      }
    }
  }

  // Level 2: Civic Issue Matching
  let matchedCivicIssue: CivicIssue | null = null;
  if (ward && text.length > 8 && existingCivicIssues.length > 0) {
    const wardIssues = existingCivicIssues.filter(iss => iss.ward === ward && iss.status !== 'Resolved');
    for (const issue of wardIssues) {
      if (issue.category === department || issue.responsible_department === department) {
        const commonWords = countCommonWords(text, issue.issue_description + ' ' + issue.issue_title);
        if (commonWords >= 2) {
          matchedCivicIssue = issue;
          break;
        }
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
    priorityScore,
    priority,
    duplicateMatch,
    matchedCivicIssue,
    confidence
  };
}

function countCommonWords(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 3));

  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }
  return common;
}
