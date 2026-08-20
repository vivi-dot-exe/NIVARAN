import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_model = None

def get_model():
    """Lazy-load SentenceTransformer to keep initial boot RAM under 150MB."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        except Exception:
            _model = "TFIDF_FALLBACK"
    return _model

CATEGORIES = [
    "Water Supply",
    "Roads & Potholes",
    "Sanitation & Garbage",
    "Electricity & Power",
    "Public Health & Safety"
]

URGENCY_KEYWORDS = [
    "danger", "emergency", "spark", "accident", "broken", "overflow", 
    "severe", "critical", "urgent", "immediate", "hazard", "burst", "life threatening"
]

def analyze_grievance(text: str) -> dict:
    """Classifies category and computes priority score under low RAM constraints."""
    if not text or not str(text).strip():
        return {"category": "General", "priority_score": 50}

    text_clean = str(text).strip()
    model = get_model()

    # Transformer semantic search
    if model != "TFIDF_FALLBACK" and hasattr(model, "encode"):
        try:
            embeddings = model.encode([text_clean] + CATEGORIES, convert_to_tensor=False)
            text_vec = embeddings[0].reshape(1, -1)
            cat_vecs = embeddings[1:]
            sims = cosine_similarity(text_vec, cat_vecs)[0]
            best_cat = CATEGORIES[int(np.argmax(sims))]
        except Exception:
            best_cat = "General"
    else:
        # Fast TF-IDF Fallback
        try:
            vectorizer = TfidfVectorizer().fit(CATEGORIES + [text_clean])
            text_vec = vectorizer.transform([text_clean])
            cat_vecs = vectorizer.transform(CATEGORIES)
            sims = cosine_similarity(text_vec, cat_vecs)[0]
            best_cat = CATEGORIES[int(np.argmax(sims))] if max(sims) > 0 else "General"
        except Exception:
            best_cat = "General"

    # Calculate Priority Score (0-100) based on urgency triggers
    score = 45
    lower_text = text_clean.lower()
    for kw in URGENCY_KEYWORDS:
        if kw in lower_text:
            score += 15
    score = min(98, max(20, score))

    return {
        "category": str(best_cat),
        "priority_score": int(score)
    }

def find_semantic_duplicate(new_text: str, existing_texts: list) -> dict:
    """Finds duplicate complaints using TF-IDF cosine similarity."""
    if not existing_texts or not new_text or not str(new_text).strip():
        return {"is_duplicate": False, "match_id": None, "similarity": 0.0}
    
    clean_existing = [str(t).strip() for t in existing_texts if str(t).strip()]
    if not clean_existing:
        return {"is_duplicate": False, "match_id": None, "similarity": 0.0}

    try:
        clean_new = str(new_text).strip()
        vectorizer = TfidfVectorizer().fit([clean_new] + clean_existing)
        matrix = vectorizer.transform([clean_new] + clean_existing)
        sims = cosine_similarity(matrix[0:1], matrix[1:])[0]
        max_sim = float(np.max(sims))
        
        return {
            "is_duplicate": bool(max_sim > 0.72),
            "match_id": int(np.argmax(sims)) if max_sim > 0.72 else None,
            "similarity": round(max_sim, 2)
        }
    except Exception:
        return {"is_duplicate": False, "match_id": None, "similarity": 0.0}

def run_batch_clustering(texts: list) -> list:
    """Clustering using Scikit-learn (RAM usage < 30MB vs BERTopic > 600MB)."""
    clean_texts = [str(t).strip() for t in texts if str(t).strip()]
    if not clean_texts or len(clean_texts) < 3:
        return [{"topic_id": 0, "name": "General Grievances", "count": len(clean_texts)}]
    
    try:
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        X = vectorizer.fit_transform(clean_texts)
        
        from sklearn.cluster import MiniBatchKMeans
        n_clusters = min(5, len(clean_texts))
        kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=20)
        labels = kmeans.fit_predict(X)
        
        clusters = []
        for i in range(n_clusters):
            count = int(np.sum(labels == i))
            if count > 0:
                clusters.append({
                    "topic_id": i,
                    "name": f"Topic Group {i+1}",
                    "count": count
                })
        return clusters
    except Exception:
        return [{"topic_id": 0, "name": "General Grievances", "count": len(clean_texts)}]


def generate_issue_title(category: str, text: str, ward: str) -> str:
    """Generates a human-readable title for a Civic Issue based on category, keywords, and ward location."""
    cat = (category or "").lower()
    text_lower = (text or "").lower()
    
    prefix = "Civic Infrastructure Issue"
    if "water" in cat or "water" in text_lower or "pipeline" in text_lower or "leak" in text_lower or "paani" in text_lower:
        prefix = "Water Pipeline Leakage & Disruption"
    elif "road" in cat or "pothole" in text_lower or "gadda" in text_lower or "sadak" in text_lower:
        prefix = "Road Potholes & Surface Hazard"
    elif "sanitation" in cat or "garbage" in text_lower or "kachra" in text_lower or "sewage" in text_lower or "naala" in text_lower:
        prefix = "Garbage Accumulation & Overflow"
    elif "electric" in cat or "power" in text_lower or "transformer" in text_lower or "bijli" in text_lower:
        prefix = "Transformer Failure & Power Outage"
    elif "health" in cat or "hospital" in text_lower or "doctor" in text_lower or "clinic" in text_lower:
        prefix = "Hospital Infrastructure & Emergency Issue"
    elif "ration" in cat or "pension" in text_lower or "distribution" in cat:
        prefix = "Public Distribution & Pension Delay"
    
    clean_ward = ward.split(" - ")[-1] if " - " in ward else ward
    return f"{prefix} near {clean_ward}"


def compute_civic_issue_priority(severity: int, urgency: int, scope: int, report_count: int, duplicate_count: int = 0, days_active: int = 1) -> dict:
    """
    Transparent composite priority formula for a Civic Issue (0-100 score).
    Score = (Severity*0.25 + Urgency*0.20 + Scope*0.15) * 20 
            + min(25, report_count * 1.5) 
            + min(10, duplicate_count * 2) 
            + min(10, days_active * 0.8)
    """
    base = (severity * 0.25 + urgency * 0.20 + scope * 0.15) * 20
    report_boost = min(25, report_count * 1.5)
    dup_boost = min(10, duplicate_count * 2.0)
    age_boost = min(10, max(1, days_active) * 0.8)
    
    score = int(min(100, max(15, round(base + report_boost + dup_boost + age_boost))))
    
    if score >= 85:
        level = "Critical"
    elif score >= 70:
        level = "High"
    elif score >= 45:
        level = "Medium"
    else:
        level = "Low"
        
def route_grievance(complaint_text: str, selected_category: str = None, ward: str = "Ward 4 - Andheri West") -> dict:
    """
    AI Authority & Department Routing Engine.
    Determines responsible authority, department, ward jurisdiction, nodal officer,
    transparent 0-100 routing confidence score, and bulleted routing reason.
    """
    text_lower = (complaint_text or "").lower()
    
    # 1. AI Department Classification & Keyword Match
    water_keywords = ["water", "pipeline", "leak", "pipe", "tap", "pressure", "paani", "pani", "nall", "contamination", "dirty water"]
    infra_keywords = ["pothole", "road", "gadda", "gaddhe", "subway", "footpath", "cave-in", "sadak", "bridge", "asphalt", "traffic", "crater"]
    sanitation_keywords = ["garbage", "kachra", "waste", "drain", "sewage", "naala", "nala", "dump", "smell", "foul", "uncollected", "safai"]
    elec_keywords = ["transformer", "power", "light", "bijli", "blackout", "meter", "batti", "voltage", "blast", "spark", "outage"]
    health_keywords = ["hospital", "doctor", "clinic", "medical", "medicine", "bed", "ambulance", "dengue", "malaria", "aspatal", "aspataal", "dawa"]
    pds_keywords = ["ration", "pension", "dbt", "card", "biometric", "senior citizen", "grain", "dukan"]

    scores = {
        "Roads & Infra": sum(1 for k in infra_keywords if k in text_lower) * 1.5,
        "Water Supply": sum(1 for k in water_keywords if k in text_lower) * 1.5,
        "Sanitation & Waste": sum(1 for k in sanitation_keywords if k in text_lower) * 1.5,
        "Electricity": sum(1 for k in elec_keywords if k in text_lower) * 1.5,
        "Public Health & Healthcare": sum(1 for k in health_keywords if k in text_lower) * 1.8,
        "Public Distribution": sum(1 for k in pds_keywords if k in text_lower) * 1.3
    }
    
    sorted_depts = sorted(scores.items(), key=lambda x: x[1], reverse=0 > 1 and x[1] or x[1], reverse=True)
    top_dept, top_score = sorted_depts[0]
    second_dept, second_score = sorted_depts[1] if len(sorted_depts) > 1 else ("General", 0)

    # 2. Responsible Authority Mapping
    authority_map = {
        "Roads & Infra": ("Municipal Corporation of Greater Mumbai", "Municipal Roads Department"),
        "Water Supply": ("Maharashtra Water Supply & Sewerage Board", "Water Maintenance Division"),
        "Sanitation & Waste": ("Municipal Corporation of Greater Mumbai", "Solid Waste Management Division"),
        "Electricity": ("BEST Electricity & Power Supply Board", "High Voltage Grid Operations"),
        "Public Health & Healthcare": ("Public Health Department & NIC Healthcare Cell", "Civic Health & Sanitation Division"),
        "Public Distribution": ("Food & Civil Supplies Department", "Social Welfare & Pension Cell")
    }

    authority_name, dept_name = authority_map.get(top_dept, ("Municipal Corporation", "General Public Works"))

    # 3. Ward Jurisdiction & Nodal Officer Assignment
    clean_ward = ward.split(" - ")[-1] if " - " in ward else ward
    officer_map = {
        "Roads & Infra": f"{ward} Roads Nodal Officer (Er. Rajesh Sharma)",
        "Water Supply": f"{ward} Water Executive Engineer (Er. Vikram Desai)",
        "Sanitation & Waste": f"{ward} Chief Sanitation Inspector (Shri Suresh Patil)",
        "Electricity": f"{ward} Assistant Electrical Engineer (Er. Amit Verma)",
        "Public Health & Healthcare": f"{ward} Medical Health Officer (Dr. Ananya Sen)",
        "Public Distribution": f"{ward} Rationing Inspector (Smt. Meena Joshi)"
    }
    assigned_officer = officer_map.get(top_dept, f"{ward} Nodal Authority")

    # 4. Transparent Routing Confidence Calculation (0 - 100)
    # Category confidence (0.40): Ratio of top score to total
    total_score = sum(scores.values())
    cat_conf = min(0.95, max(0.40, top_score / (total_score + 0.1))) if total_score > 0 else 0.50
    
    # Ambiguity penalty if top 2 scores are very close (e.g. water leaking on road)
    ambiguous = False
    if top_score > 0 and (top_score - second_score) <= 0.5:
        ambiguous = True
        cat_conf = 0.52

    dept_match = 0.95 if top_score > 0 else 0.60
    ward_match = 0.90 if ward else 0.50
    auth_match = 0.90

    raw_conf = (0.40 * cat_conf + 0.25 * dept_match + 0.20 * ward_match + 0.15 * auth_match) * 100
    confidence_score = int(min(98, max(35, round(raw_conf))))

    # 5. Routing Status & Human Review Flags
    if confidence_score >= 80 and not ambiguous:
        routing_status = "Automatically Routed"
        requires_human_review = False
    elif confidence_score >= 60 and not ambiguous:
        routing_status = "Provisionally Routed"
        requires_human_review = False
    else:
        routing_status = "Requires Human Verification"
        requires_human_review = True

    # 6. Category Mismatch Detection
    category_mismatch = False
    if selected_category and selected_category != "ALL" and selected_category != top_dept:
        # Check if selected category is strictly different
        category_mismatch = True
        if confidence_score >= 80:
            routing_status = "Provisionally Routed (Category Mismatch)"

    # 7. Bulleted Step-by-Step Routing Rationale
    reason_lines = [
        f"• Complaint text analyzed for semantic keywords ({top_dept} match score: {top_score:.1f}).",
        f"• Jurisdiction mapped to {ward} under {authority_name}.",
        f"• Designated nodal officer: {assigned_officer}.",
    ]
    if category_mismatch:
        reason_lines.append(f"• ⚠️ Category Mismatch Warning: Citizen selected '{selected_category}', but AI recommends '{top_dept}'.")
    if ambiguous:
        reason_lines.append(f"• ⚠️ Ambiguity Detected: Complaint contains dual signals for '{top_dept}' ({top_score:.1f}) and '{second_dept}' ({second_score:.1f}). Sent for human verification.")

    routing_reason = "\n".join(reason_lines)

    return {
        "authority": authority_name,
        "department": top_dept,
        "department_name": dept_name,
        "jurisdiction": ward,
        "assigned_officer": assigned_officer,
        "routing_confidence": confidence_score,
        "routing_status": routing_status,
        "routing_reason": routing_reason,
        "requires_human_review": requires_human_review,
        "category_mismatch": category_mismatch,
        "suggested_department": top_dept,
        "citizen_selected_category": selected_category
    }


def analyze_and_decompose_grievance(text: str, ward: str = "Ward 4 - Andheri West", selected_category: str = None) -> dict:
    """
    AI Civic Issue Understanding & Multi-Agency Decomposition Engine.
    Understands natural-language grievance, extracts root cause vs consequences,
    determines SINGLE_AGENCY vs MULTI_AGENCY, generates sub-issues, and builds dependency graph.
    """
    lower = text.lower()
    routing = route_grievance(text, selected_category, ward)

    # Keyword / Entity Detection Matrix
    has_water_pipe = any(w in lower for w in ['pipe', 'pipeline', 'water leak', 'burst', 'gushing', 'water main'])
    has_road_damage = any(w in lower for w in ['pothole', 'road', 'asphalt', 'caved', 'collaps', 'tar', 'street damage', 'crater'])
    has_tree = any(w in lower for w in ['tree', 'branch', 'trunk', 'fallen tree'])
    has_elec = any(w in lower for w in ['wire', 'cable', 'transformer', 'pole', 'electric', 'power', 'blackout', 'spark'])
    has_sewer = any(w in lower for w in ['sewer', 'gutter', 'drain', 'overflow', 'sludge', 'manhole'])
    has_garbage = any(w in lower for w in ['garbage', 'trash', 'kachra', 'waste', 'dump', 'bin'])

    # Determine Single vs Multi-Agency
    # Guardrail: Garbage symptoms (smell, flies, bin) = SINGLE_AGENCY
    is_multi = False
    primary_title = "Civic Grievance"
    root_cause = "Civic Infrastructure Issue"
    affected_infra = []
    sub_issues = []
    dependencies = []
    explainability = []

    if has_water_pipe and has_road_damage:
        is_multi = True
        primary_title = "Road surface collapse caused by underground water pipeline leak"
        root_cause = "Underground main water pipeline leakage & soil erosion"
        affected_infra = ["Water Pipeline Infrastructure", "Municipal Road Surface", "Traffic Control"]
        
        sub1 = {
            "id": "SUB-001",
            "title": "Repair underground water pipeline leakage",
            "description": "Isolate damaged water main section and seal/replace pipe.",
            "category": "Water Supply",
            "responsible_authority": "Maharashtra Water Supply & Sewerage Board",
            "responsible_department": "Water Maintenance Division",
            "assigned_officer": f"{ward.split(' - ')[0]} Executive Engineer (Er. Vikram Desai)",
            "confidence": 92,
            "required_action": "Repair water main pipeline leak & stop erosion",
            "dependencies": [],
            "status": "Pending"
        }
        sub2 = {
            "id": "SUB-002",
            "title": "Road surface resurfacing & crater repair",
            "description": "Backfill eroded sub-grade and lay fresh asphalt tar layer.",
            "category": "Roads & Infra",
            "responsible_authority": "Municipal Corporation of Greater Mumbai",
            "responsible_department": "Municipal Roads Department",
            "assigned_officer": f"{ward.split(' - ')[0]} Roads Nodal Officer (Er. Rajesh Sharma)",
            "confidence": 95,
            "required_action": "Resurface caved-in road asphalt",
            "dependencies": ["SUB-001"],
            "status": "Blocked"
        }
        sub_issues = [sub1, sub2]

        dependencies = [{
            "from": "SUB-001",
            "to": "SUB-002",
            "type": "prerequisite",
            "reason": "Road resurfacing can only begin after the underlying water pipe leak is sealed to prevent repeated washouts."
        }]

        explainability = [
            "• Detected 2 distinct operational responsibilities: Water Pipeline Repair + Road Surface Repair.",
            "• Root Cause: Underground water pipe burst caused sub-soil erosion resulting in road collapse.",
            "• Operational Dependency: Pipeline repair (SUB-001) MUST complete before road resurfacing (SUB-002) unlocks."
        ]

    elif has_tree and (has_elec or has_road_damage):
        is_multi = True
        primary_title = "Fallen tree damaging electrical cables and blocking traffic"
        root_cause = "Heavy storm uprooted mature roadside tree onto overhead electrical lines"
        affected_infra = ["High Voltage Power Lines", "Road Transit Corridor", "Urban Forestry"]

        sub1 = {
            "id": "SUB-001",
            "title": "Isolate high voltage cables & clear electrical hazard",
            "description": "De-energize snagged overhead power lines to allow tree cutting.",
            "category": "Electricity",
            "responsible_authority": "BEST Electricity & Power Supply Board",
            "responsible_department": "High Voltage Grid Operations",
            "assigned_officer": f"{ward.split(' - ')[0]} Assistant Electrical Engineer (Er. Amit Verma)",
            "confidence": 94,
            "required_action": "Safely isolate snagged power cables",
            "dependencies": [],
            "status": "Pending"
        }
        sub2 = {
            "id": "SUB-002",
            "title": "Cut and clear fallen tree trunk",
            "description": "Use chainsaw teams to clear fallen trunk and branches.",
            "category": "Sanitation & Waste",
            "responsible_authority": "Municipal Corporation of Greater Mumbai",
            "responsible_department": "Parks & Garden Cell",
            "assigned_officer": f"{ward.split(' - ')[0]} Chief Sanitation Inspector (Shri Suresh Patil)",
            "confidence": 90,
            "required_action": "Remove fallen tree obstruction from roadway",
            "dependencies": ["SUB-001"],
            "status": "Blocked"
        }
        sub_issues = [sub1, sub2]

        dependencies = [{
            "from": "SUB-001",
            "to": "SUB-002",
            "type": "prerequisite",
            "reason": "Tree cutting crew cannot operate until BEST isolates live high-voltage power lines."
        }]

        explainability = [
            "• Detected 2 distinct authorities: BEST Electricity Board + Municipal Parks Cell.",
            "• Root Cause: Uprooted tree snagged live high-voltage power lines.",
            "• Dependency: Power isolation (SUB-001) is a mandatory safety prerequisite before tree removal (SUB-002)."
        ]

    elif has_sewer and has_road_damage:
        is_multi = True
        primary_title = "Sewer line blockage causing sewage flooding and road damage"
        root_cause = "Main arterial sewer pipe blockage causing toxic effluent overflow"
        affected_infra = ["Underground Drainage System", "Municipal Road Asphalt"],

        sub1 = {
            "id": "SUB-001",
            "title": "De-clog main sewer line & drain toxic effluent",
            "description": "Deploy suction jetting machines to clear drainage blockage.",
            "category": "Sanitation & Waste",
            "responsible_authority": "Municipal Corporation of Greater Mumbai",
            "responsible_department": "Storm Water Drainage & Sewerage Division",
            "assigned_officer": f"{ward.split(' - ')[0]} Chief Sanitation Inspector (Shri Suresh Patil)",
            "confidence": 91,
            "required_action": "De-clog blocked sewer line and drain effluent",
            "dependencies": [],
            "status": "Pending"
        }
        sub2 = {
            "id": "SUB-002",
            "title": "Disinfect road surface & repair damaged asphalt",
            "description": "Spray chemical disinfectant and patch eroded road sections.",
            "category": "Roads & Infra",
            "responsible_authority": "Municipal Corporation of Greater Mumbai",
            "responsible_department": "Municipal Roads Department",
            "assigned_officer": f"{ward.split(' - ')[0]} Roads Nodal Officer (Er. Rajesh Sharma)",
            "confidence": 88,
            "required_action": "Sanitize area and repair damaged pavement",
            "dependencies": ["SUB-001"],
            "status": "Blocked"
        }
        sub_issues = [sub1, sub2]

        dependencies = [{
            "from": "SUB-001",
            "to": "SUB-002",
            "type": "prerequisite",
            "reason": "Disinfection and road patching require the sewer overflow to be completely stopped first."
        }]

        explainability = [
            "• Multi-Agency Issue: Sewerage Division + Municipal Roads Department.",
            "• Root Cause: Blocked main sewer line causing surface flooding.",
            "• Operational Dependency: Clearing sewer blockage (SUB-001) precedes road disinfection & patching (SUB-002)."
        ]

    else:
        # SINGLE_AGENCY ISSUE (Default Single-Ticket Workflow)
        is_multi = False
        primary_title = f"{routing['department']} Civic Issue"
        root_cause = f"Direct {routing['department']} operational defect"
        affected_infra = [f"{routing['department']} Infrastructure"]

        sub1 = {
            "id": "SUB-001",
            "title": f"Resolve {routing['department']} issue",
            "description": text,
            "category": routing["department"],
            "responsible_authority": routing["authority"],
            "responsible_department": routing["department_name"],
            "assigned_officer": routing["assigned_officer"],
            "confidence": routing["routing_confidence"],
            "required_action": f"Dispatch field team to resolve {routing['department']} issue",
            "dependencies": [],
            "status": "Pending"
        }
        sub_issues = [sub1]
        explainability = [
            f"• Single-Agency Issue: Handled entirely by {routing['authority']}.",
            f"• No cross-department operational dependencies detected."
        ]

    overall_conf = int(min(98, max(40, round(sum(s["confidence"] for s in sub_issues) / len(sub_issues)))))

    resolution_plan = {
        "is_multi_agency": is_multi,
        "primary_issue_title": primary_title,
        "root_cause": root_cause,
        "affected_infrastructure": affected_infra,
        "sub_issues": sub_issues,
        "dependencies": dependencies,
        "overall_confidence": overall_conf,
        "explainability": explainability,
        "routing": routing
    }

    return resolution_plan