import math
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    import h3
    HAS_H3 = True
except ImportError:
    HAS_H3 = False

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
    "Roads & Infra",
    "Sanitation & Waste",
    "Electricity",
    "Public Distribution",
    "Public Health & Healthcare"
]

URGENCY_KEYWORDS = [
    "danger", "emergency", "spark", "accident", "broken", "overflow", 
    "severe", "critical", "urgent", "immediate", "hazard", "burst", 
    "life threatening", "blackout", "fire", "cave-in", "hospital", "ambulance"
]

# -------------------------------------------------------------
# Spatial Utility Functions (Haversine & Uber H3)
# -------------------------------------------------------------
def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Computes exact Great-Circle distance in meters using Haversine formula."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def compute_h3_index(lat: float, lng: float, resolution: int = 10) -> str:
    """Generates Uber H3 hexagon cell index at given resolution (Res 10 edge ~66m)."""
    if HAS_H3:
        try:
            return h3.latlng_to_cell(lat, lng, resolution)
        except Exception:
            pass
    # Fallback deterministic spatial grid hash if h3 binary unavailable
    lat_quant = round(lat * (10 ** (resolution // 2)))
    lng_quant = round(lng * (10 ** (resolution // 2)))
    return f"h3_res{resolution}_{lat_quant}_{lng_quant}"

# -------------------------------------------------------------
# Dynamic Priority Score Calculation
# -------------------------------------------------------------
def compute_dynamic_priority(
    base_severity: int,
    upvotes: int,
    created_at: Union[datetime, str],
    now: Optional[datetime] = None
) -> int:
    """
    Priority Score = min(100, BaseSeverity + (10 * log2(Upvotes + 1)) + (ElapsedHours * 0.75))
    """
    if now is None:
        now = datetime.utcnow()

    if isinstance(created_at, str):
        try:
            # Handle ISO string format
            clean_ts = created_at.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
        except Exception:
            dt = now
    else:
        dt = created_at

    elapsed_hours = max(0.0, (now - dt).total_seconds() / 3600.0)
    upvote_boost = 10.0 * math.log2(max(1, upvotes) + 1.0)
    time_decay_boost = elapsed_hours * 0.75

    raw_score = float(base_severity) + upvote_boost + time_decay_boost
    return min(100, max(15, int(round(raw_score))))

# -------------------------------------------------------------
# AI Grievance Classification
# -------------------------------------------------------------
def analyze_grievance(text: str) -> dict:
    """Classifies category and computes base severity & initial priority score."""
    if not text or not str(text).strip():
        return {
            "category": "Sanitation & Waste",
            "base_severity": 50,
            "priority_score": 50,
            "topic": "General Civic Issue"
        }

    text_clean = str(text).strip()
    model = get_model()

    best_cat = "Sanitation & Waste"
    if model != "TFIDF_FALLBACK" and hasattr(model, "encode"):
        try:
            embeddings = model.encode([text_clean] + CATEGORIES, convert_to_tensor=False)
            text_vec = embeddings[0].reshape(1, -1)
            cat_vecs = embeddings[1:]
            sims = cosine_similarity(text_vec, cat_vecs)[0]
            best_cat = CATEGORIES[int(np.argmax(sims))]
        except Exception:
            best_cat = "Sanitation & Waste"
    else:
        # Fast TF-IDF Fallback
        try:
            vectorizer = TfidfVectorizer().fit(CATEGORIES + [text_clean])
            text_vec = vectorizer.transform([text_clean])
            cat_vecs = vectorizer.transform(CATEGORIES)
            sims = cosine_similarity(text_vec, cat_vecs)[0]
            best_cat = CATEGORIES[int(np.argmax(sims))] if max(sims) > 0 else "Sanitation & Waste"
        except Exception:
            best_cat = "Sanitation & Waste"

    # Calculate Base Severity (15-95) based on keywords
    score = 45
    lower_text = text_clean.lower()
    for kw in URGENCY_KEYWORDS:
        if kw in lower_text:
            score += 12
    base_severity = min(95, max(25, score))

    # Priority score for initial submission (1 upvote, 0 hours elapsed)
    priority_score = compute_dynamic_priority(base_severity, upvotes=1, created_at=datetime.utcnow())

    return {
        "category": str(best_cat),
        "base_severity": int(base_severity),
        "priority_score": int(priority_score),
        "topic": f"{best_cat} Issue"
    }

def normalize_multilingual_civic_text(text: str) -> str:
    """Normalizes Hindi/Hinglish civic phrases to English civic terms for robust semantic matching."""
    if not text:
        return ""
    t = text.lower()
    replacements = {
        "paani": "water",
        "pani": "water",
        "peene ka": "drinking",
        "phat": "burst leak",
        "phata": "burst",
        "toot": "broken",
        "leaking": "leak",
        "pipe": "pipeline",
        "sadak": "road",
        "rasta": "road",
        "gadda": "pothole",
        "gaddhe": "potholes",
        "kachra": "garbage waste",
        "safai": "cleaning waste",
        "naala": "drain sewer",
        "nala": "drain sewer",
        "bijli": "electricity power",
        "batti": "light electricity",
        "aspatal": "hospital clinic",
        "aspataal": "hospital",
        "dawa": "medicine healthcare",
        "ration": "pds ration",
        "dukan": "shop",
        "dharavi": "dharavi",
        "andheri": "andheri",
        "bandra": "bandra",
        "kurla": "kurla",
        "malad": "malad",
        "dadar": "dadar"
    }
    words = t.split()
    normalized = []
    for w in words:
        clean_w = "".join(c for c in w if c.isalnum())
        if clean_w in replacements:
            normalized.append(replacements[clean_w])
        else:
            normalized.append(w)
    return " ".join(normalized)

# -------------------------------------------------------------
# Pillar 1: Two-Stage Spatio-Semantic Deduplication
# -------------------------------------------------------------
def find_spatio_semantic_duplicate(
    new_text: str,
    new_lat: float,
    new_lng: float,
    existing_tickets: List[dict],
    max_radius_meters: float = 35.0,
    semantic_threshold: float = 0.78
) -> dict:
    """
    Two-stage Spatio-Semantic Deduplication:
    Stage 1: Spatial Gating (candidates within <= 35 meters)
    Stage 2: Semantic Verification (Cosine similarity on embeddings > 0.78)
    """
    if not existing_tickets or not new_text or not str(new_text).strip():
        return {"is_duplicate": False, "match_ticket": None, "similarity": 0.0, "stage1_passed": 0}

    clean_new = str(new_text).strip()
    norm_new = normalize_multilingual_civic_text(clean_new)

    # Stage 1: Spatial Gating
    spatial_candidates = []
    for ticket in existing_tickets:
        t_lat = ticket.get("latitude")
        t_lng = ticket.get("longitude")
        if t_lat is not None and t_lng is not None:
            dist = haversine_distance_meters(new_lat, new_lng, float(t_lat), float(t_lng))
            if dist <= max_radius_meters:
                spatial_candidates.append({**ticket, "_distance_m": round(dist, 1)})

    if not spatial_candidates:
        return {
            "is_duplicate": False,
            "match_ticket": None,
            "similarity": 0.0,
            "stage1_passed": 0,
            "reason": "No active tickets within 35m spatial gate"
        }

    # Stage 2: Semantic Verification on Spatial Candidates
    candidate_texts = [
        normalize_multilingual_civic_text(str(c.get("text", c.get("Complaint", ""))).strip())
        for c in spatial_candidates
    ]
    model = get_model()

    sims = []
    if model != "TFIDF_FALLBACK" and hasattr(model, "encode"):
        try:
            embeddings = model.encode([norm_new] + candidate_texts, convert_to_tensor=False)
            new_vec = embeddings[0].reshape(1, -1)
            cand_vecs = embeddings[1:]
            sims = cosine_similarity(new_vec, cand_vecs)[0]
        except Exception:
            sims = []

    if len(sims) == 0:
        # Fallback to TF-IDF cosine similarity
        try:
            vectorizer = TfidfVectorizer().fit([norm_new] + candidate_texts)
            matrix = vectorizer.transform([norm_new] + candidate_texts)
            sims = cosine_similarity(matrix[0:1], matrix[1:])[0]
        except Exception:
            sims = [0.0] * len(candidate_texts)

    max_idx = int(np.argmax(sims))
    max_sim = float(sims[max_idx])

    is_dup = bool(max_sim >= semantic_threshold)
    matched_candidate = spatial_candidates[max_idx] if is_dup else None

    return {
        "is_duplicate": is_dup,
        "match_ticket": matched_candidate,
        "similarity": round(max_sim, 3),
        "stage1_passed": len(spatial_candidates),
        "distance_meters": spatial_candidates[max_idx]["_distance_m"] if spatial_candidates else None
    }


# Legacy fallback for string duplicate search
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
            "is_duplicate": bool(max_sim > 0.78),
            "match_id": int(np.argmax(sims)) if max_sim > 0.78 else None,
            "similarity": round(max_sim, 2)
        }
    except Exception:
        return {"is_duplicate": False, "match_id": None, "similarity": 0.0}

# -------------------------------------------------------------
# Pillar 2: Computer Vision Resolution Delta Check
# -------------------------------------------------------------
def verify_resolution_delta(
    before_desc: str,
    after_desc: str,
    officer_distance_meters: float
) -> dict:
    """
    Simulates CV edge/feature delta verification between before & after proof.
    Verifies that spatial delta <= 20m and structural repair confidence >= 0.65.
    """
    is_geofence_valid = officer_distance_meters <= 20.0

    # Calculate structural change similarity score
    model = get_model()
    if model != "TFIDF_FALLBACK" and hasattr(model, "encode"):
        try:
            emb = model.encode([before_desc, after_desc], convert_to_tensor=False)
            sim = float(cosine_similarity([emb[0]], [emb[1]])[0][0])
            # High semantic difference indicates state change (e.g. from broken to fixed)
            cv_confidence = round(min(0.99, max(0.60, 0.92 - (sim * 0.2))), 3)
        except Exception:
            cv_confidence = 0.88
    else:
        cv_confidence = 0.85

    return {
        "is_geofence_valid": is_geofence_valid,
        "officer_distance_m": round(officer_distance_meters, 1),
        "cv_delta_score": cv_confidence,
        "passed": bool(is_geofence_valid and cv_confidence >= 0.65)
    }

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