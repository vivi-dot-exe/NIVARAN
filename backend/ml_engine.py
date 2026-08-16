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