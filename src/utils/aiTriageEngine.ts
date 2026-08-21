import type {
  DepartmentType,
  Grievance,
  CivicIssue,
  LanguageType,
  PriorityLevel,
  TriageResult,
  RoutingResult
} from '../types/grievance';
import { getAuthorityForDepartment, getNodalOfficerForJurisdiction } from '../mockData/authorities';
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

function countCommonWords(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  let common = 0;
  for (const w of words1) {
    if (words2.has(w)) common++;
  }
  return common;
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
  latOrWard: number | string = 19.1197,
  lngOrExistingGrievances?: number | Grievance[],
  existingGrievancesOrCivicIssues: Grievance[] | CivicIssue[] = [],
  existingCivicIssuesList: CivicIssue[] = [],
  selectedCategory?: string
): TriageResult {
  let targetLat = 19.1197;
  let targetLng = 72.8464;
  let ward = 'Ward 4 - Andheri West';
  let existingGrievances: Grievance[] = [];
  let existingCivicIssues: CivicIssue[] = existingCivicIssuesList;

  if (typeof latOrWard === 'number') {
    targetLat = latOrWard;
    targetLng = typeof lngOrExistingGrievances === 'number' ? lngOrExistingGrievances : 72.8464;
    existingGrievances = Array.isArray(existingGrievancesOrCivicIssues)
      ? (existingGrievancesOrCivicIssues as Grievance[])
      : [];
  } else {
    ward = latOrWard || 'Ward 4 - Andheri West';
    if (Array.isArray(lngOrExistingGrievances)) {
      existingGrievances = lngOrExistingGrievances as Grievance[];
    }
    if (Array.isArray(existingGrievancesOrCivicIssues)) {
      existingCivicIssues = existingGrievancesOrCivicIssues as CivicIssue[];
    }
  }

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

  // Two-Stage Spatio-Semantic Deduplication (Level 1: Ticket Duplicate Check)
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

  // AI ROUTING CALCULATION
  const { authority, deptName } = getAuthorityForDepartment(department);
  const assignedOfficer = getNodalOfficerForJurisdiction(ward, department);

  // Transparent Weighted Routing Confidence Score (0-100)
  // Category match: 40%, Department match: 25%, Jurisdiction match: 20%, Authority match: 15%
  const catConf = confidence > 0 ? confidence : 0.82;
  const deptMatch = 0.95;
  const wardMatch = ward ? 0.90 : 0.60;
  const authMatch = 0.90;

  const rawRoutingScore = (0.40 * catConf + 0.25 * deptMatch + 0.20 * wardMatch + 0.15 * authMatch) * 100;
  const routingConfidence = Math.min(98, Math.max(35, Math.round(rawRoutingScore)));

  // Category Mismatch Detection
  const categoryMismatch = Boolean(
    selectedCategory &&
    selectedCategory !== 'ALL' &&
    selectedCategory !== department
  );

  let routingStatus = 'Automatically Routed';
  let requiresHumanReview = false;

  if (categoryMismatch) {
    routingStatus = 'Provisionally Routed (Category Mismatch)';
  } else if (routingConfidence < 60) {
    routingStatus = 'Requires Human Verification';
    requiresHumanReview = true;
  } else if (routingConfidence < 80) {
    routingStatus = 'Provisionally Routed';
  }

  const reasonLines = [
    `• Complaint text analyzed for semantic keywords (${department} confidence: ${Math.round(catConf * 100)}%).`,
    `• Jurisdiction mapped to ${ward} under ${authority}.`,
    `• Designated nodal officer: ${assignedOfficer}.`
  ];
  if (categoryMismatch) {
    reasonLines.push(`• ️ Category Mismatch: You selected '${selectedCategory}', but AI determined '${department}'.`);
  }

  const routing: RoutingResult = {
    authority,
    department,
    department_name: deptName,
    jurisdiction: ward,
    assigned_officer: assignedOfficer,
    routing_confidence: routingConfidence,
    routing_status: routingStatus,
    routing_reason: reasonLines.join('\n'),
    requires_human_review: requiresHumanReview,
    category_mismatch: categoryMismatch,
    suggested_department: department,
    citizen_selected_category: selectedCategory
  };

  // MULTI-AGENCY DECOMPOSITION CALCULATION
  const hasWaterPipe = /pipe|pipeline|water leak|burst|gushing|water main/i.test(lower);
  const hasRoadDamage = /pothole|road|asphalt|caved|collaps|tar|street damage|crater/i.test(lower);
  const hasTree = /tree|branch|trunk|fallen tree/i.test(lower);
  const hasElec = /wire|cable|transformer|pole|electric|power|blackout|spark/i.test(lower);
  const hasSewer = /sewer|gutter|drain|overflow|sludge|manhole/i.test(lower);

  let isMultiAgency = false;
  let primaryIssueTitle = `${department} Civic Issue`;
  let rootCause = `Direct ${department} operational defect`;
  let affectedInfra: string[] = [`${department} Infrastructure`];
  let subIssues: import('../types/grievance').SubIssue[] = [];
  let dependencies: import('../types/grievance').DependencyLink[] = [];
  let explainability: string[] = [];

  const cleanWard = ward ? ward.split(' - ')[0] : 'Ward';

  if (hasWaterPipe && hasRoadDamage) {
    isMultiAgency = true;
    primaryIssueTitle = 'Road surface collapse caused by underground water pipeline leak';
    rootCause = 'Underground main water pipeline leakage & sub-soil erosion';
    affectedInfra = ['Water Pipeline Infrastructure', 'Municipal Road Surface', 'Traffic Transit Corridor'];

    subIssues = [
      {
        id: 'SUB-001',
        title: 'Repair underground water pipeline leakage',
        description: 'Isolate damaged water main section and seal/replace pipe.',
        category: 'Water Supply',
        responsible_authority: 'Maharashtra Water Supply & Sewerage Board',
        responsible_department: 'Water Maintenance Division',
        assigned_officer: `${cleanWard} Executive Engineer (Er. Vikram Desai)`,
        confidence: 92,
        required_action: 'Repair water main pipeline leak & stop sub-soil erosion',
        dependencies: [],
        status: 'Pending'
      },
      {
        id: 'SUB-002',
        title: 'Road surface resurfacing & crater repair',
        description: 'Backfill eroded sub-grade and lay fresh asphalt tar layer.',
        category: 'Roads & Infra',
        responsible_authority: 'Municipal Corporation of Greater Mumbai',
        responsible_department: 'Municipal Roads Department',
        assigned_officer: `${cleanWard} Roads Nodal Officer (Er. Rajesh Sharma)`,
        confidence: 95,
        required_action: 'Resurface caved-in road asphalt',
        dependencies: ['SUB-001'],
        status: 'Blocked'
      }
    ];

    dependencies = [
      {
        from: 'SUB-001',
        to: 'SUB-002',
        type: 'prerequisite',
        reason: 'Road resurfacing can only begin after the underlying water pipe leak is sealed to prevent repeated washouts.'
      }
    ];

    explainability = [
      '• Multi-Agency Trigger: Water Pipeline Repair + Municipal Road Restoration.',
      '• Root Cause: Underground water pipe burst caused sub-soil erosion resulting in road collapse.',
      '• Operational Dependency: Pipeline repair (SUB-001) MUST complete before road resurfacing (SUB-002) unlocks.'
    ];

  } else if (hasTree && (hasElec || hasRoadDamage)) {
    isMultiAgency = true;
    primaryIssueTitle = 'Fallen tree damaging electrical cables and blocking traffic';
    rootCause = 'Heavy storm uprooted mature roadside tree onto overhead electrical lines';
    affectedInfra = ['High Voltage Power Lines', 'Road Transit Corridor', 'Urban Forestry'];

    subIssues = [
      {
        id: 'SUB-001',
        title: 'Isolate high voltage cables & clear electrical hazard',
        description: 'De-energize snagged overhead power lines to allow tree cutting.',
        category: 'Electricity',
        responsible_authority: 'BEST Electricity & Power Supply Board',
        responsible_department: 'High Voltage Grid Operations',
        assigned_officer: `${cleanWard} Assistant Electrical Engineer (Er. Amit Verma)`,
        confidence: 94,
        required_action: 'Safely isolate snagged power cables',
        dependencies: [],
        status: 'Pending'
      },
      {
        id: 'SUB-002',
        title: 'Cut and clear fallen tree trunk',
        description: 'Use chainsaw teams to clear fallen trunk and branches.',
        category: 'Sanitation & Waste',
        responsible_authority: 'Municipal Corporation of Greater Mumbai',
        responsible_department: 'Parks & Garden Cell',
        assigned_officer: `${cleanWard} Chief Sanitation Inspector (Shri Suresh Patil)`,
        confidence: 90,
        required_action: 'Remove fallen tree obstruction from roadway',
        dependencies: ['SUB-001'],
        status: 'Blocked'
      }
    ];

    dependencies = [
      {
        from: 'SUB-001',
        to: 'SUB-002',
        type: 'prerequisite',
        reason: 'Tree cutting crew cannot operate until BEST isolates live high-voltage power lines.'
      }
    ];

    explainability = [
      '• Multi-Agency Trigger: BEST Electricity Board + Municipal Parks Cell.',
      '• Root Cause: Uprooted tree snagged live high-voltage power lines.',
      '• Safety Dependency: Power isolation (SUB-001) is a mandatory safety prerequisite before tree removal (SUB-002).'
    ];

  } else if (hasSewer && hasRoadDamage) {
    isMultiAgency = true;
    primaryIssueTitle = 'Sewer line blockage causing sewage flooding and road damage';
    rootCause = 'Main arterial sewer pipe blockage causing toxic effluent overflow';
    affectedInfra = ['Underground Drainage System', 'Municipal Road Asphalt'];

    subIssues = [
      {
        id: 'SUB-001',
        title: 'De-clog main sewer line & drain toxic effluent',
        description: 'Deploy suction jetting machines to clear drainage blockage.',
        category: 'Sanitation & Waste',
        responsible_authority: 'Municipal Corporation of Greater Mumbai',
        responsible_department: 'Storm Water Drainage & Sewerage Division',
        assigned_officer: `${cleanWard} Chief Sanitation Inspector (Shri Suresh Patil)`,
        confidence: 91,
        required_action: 'De-clog blocked sewer line and drain effluent',
        dependencies: [],
        status: 'Pending'
      },
      {
        id: 'SUB-002',
        title: 'Disinfect road surface & repair damaged asphalt',
        description: 'Spray chemical disinfectant and patch eroded road sections.',
        category: 'Roads & Infra',
        responsible_authority: 'Municipal Corporation of Greater Mumbai',
        responsible_department: 'Municipal Roads Department',
        assigned_officer: `${cleanWard} Roads Nodal Officer (Er. Rajesh Sharma)`,
        confidence: 88,
        required_action: 'Sanitize area and repair damaged pavement',
        dependencies: ['SUB-001'],
        status: 'Blocked'
      }
    ];

    dependencies = [
      {
        from: 'SUB-001',
        to: 'SUB-002',
        type: 'prerequisite',
        reason: 'Disinfection and road patching require the sewer overflow to be completely stopped first.'
      }
    ];

    explainability = [
      '• Multi-Agency Trigger: Sewerage Division + Municipal Roads Department.',
      '• Root Cause: Blocked main sewer line causing surface flooding.',
      '• Operational Dependency: Clearing sewer blockage (SUB-001) precedes road disinfection & patching (SUB-002).'
    ];

  } else {
    isMultiAgency = false;
    primaryIssueTitle = `${department} Civic Issue`;
    rootCause = `Direct ${department} operational defect`;
    affectedInfra = [`${department} Infrastructure`];
    subIssues = [
      {
        id: 'SUB-001',
        title: `Resolve ${department} issue`,
        description: text,
        category: department,
        responsible_authority: authority,
        responsible_department: deptName,
        assigned_officer: assignedOfficer,
        confidence: routingConfidence,
        required_action: `Dispatch field team to resolve ${department} issue`,
        dependencies: [],
        status: 'Pending'
      }
    ];
    explainability = [
      `• Single-Agency Issue: Handled entirely by ${authority}.`,
      `• No cross-department operational dependencies detected.`
    ];
  }

  const overallConf = Math.min(98, Math.max(40, Math.round(subIssues.reduce((acc, s) => acc + s.confidence, 0) / subIssues.length)));

  const resolution_plan: import('../types/grievance').ResolutionPlan = {
    is_multi_agency: isMultiAgency,
    primary_issue_title: primaryIssueTitle,
    root_cause: rootCause,
    affected_infrastructure: affectedInfra,
    sub_issues: subIssues,
    dependencies,
    overall_confidence: overallConf,
    explainability,
    routing
  };

  return {
    language,
    department,
    topic,
    severity,
    urgency,
    affectedScope,
    baseSeverity,
    priorityScore,
    priorityLevel: priority,
    priority,
    duplicateMatch,
    similarityScore: Math.round(maxSim * 100) / 100,
    distanceMeters: duplicateMatch ? Math.round(matchDist * 10) / 10 : undefined,
    h3Index,
    confidence,
    matchedCivicIssue,
    routing,
    resolution_plan
  };
}

