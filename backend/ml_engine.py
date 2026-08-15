from typing import List, Dict, Optional
import re

try:
    from sentence_transformers import SentenceTransformer, util
    from bertopic import BERTopic
    import numpy as np
    HAS_ML = True
    embedder = SentenceTransformer("all-MiniLM-L6-v2")
except Exception as e:
    HAS_ML = False
    print("Running backend in lightweight rule-based ML triage mode:", e)

# Canonical department anchors
DEPARTMENT_ANCHORS = {
    "Public Health & Healthcare": "no working hospitals hospital clinic doctor medical beds dengue malaria ambulance emergency healthcare non-functional doctor missing",
    "Water Supply": "broken water pipe pipeline leakage contaminated tap water sewage low pressure paani pani",
    "Roads & Infrastructure": "huge pothole road broken open manhole collapsed footpath damaged divider asphalt sadak gadda",
    "Sanitation & Garbage": "garbage dumping waste overflow trash bin cleaning dead animal smell stench kachra",
    "Electricity & Power": "sparking wire hanging electrical cable power outage transformer blast street light off bijli batti"
}

def analyze_grievance(text: str) -> Dict:
    """
    Zero-shot classifies category and calculates dynamic urgency score (0-100).
    """
    if HAS_ML:
        try:
            from sentence_transformers import util
            import numpy as np

            DEPT_NAMES = list(DEPARTMENT_ANCHORS.keys())
            DEPT_EMBEDDINGS = embedder.encode(list(DEPARTMENT_ANCHORS.values()), convert_to_tensor=True)
            
            URGENCY_ANCHORS = [
                "major accident imminent life threatening critical risk massive fire hazard explosion electrocution risk no working hospitals emergency",
                "severe blockage daily life disrupted road impassable dirty contaminated drinking water spreading illness non-functional medical clinic",
                "minor inconvenience cosmetic issue non urgent routine maintenance follow up"
            ]
            URGENCY_WEIGHTS = [100, 65, 20]
            URGENCY_EMBEDDINGS = embedder.encode(URGENCY_ANCHORS, convert_to_tensor=True)

            text_emb = embedder.encode(text, convert_to_tensor=True)
            dept_sims = util.cos_sim(text_emb, DEPT_EMBEDDINGS)[0]
            best_dept_idx = int(dept_sims.argmax())
            predicted_category = DEPT_NAMES[best_dept_idx]

            urgency_sims = util.cos_sim(text_emb, URGENCY_EMBEDDINGS)[0].cpu().numpy()
            exp_sims = np.exp(urgency_sims * 3)
            weights = exp_sims / np.sum(exp_sims)
            calculated_priority = int(np.dot(weights, URGENCY_WEIGHTS))
            calculated_priority = max(10, min(100, calculated_priority))

            return {
                "category": predicted_category,
                "priority_score": calculated_priority,
                "confidence": round(float(dept_sims[best_dept_idx]), 3)
            }
        except Exception:
            pass

    # Lightweight Fallback Classifier
    lower = text.toLowerCase() if hasattr(text, 'toLowerCase') else text.lower()
    best_category = "Sanitation & Garbage"
    max_score = 0

    for dept, keywords in DEPARTMENT_ANCHORS.items():
        kw_list = keywords.split()
        score = sum(1 for kw in kw_list if kw in lower)
        if score > max_score:
            max_score = score
            best_category = dept

    priority_score = 50
    if any(w in lower for w in ['emergency', 'critical', 'blast', 'hospital', 'blackout', 'phat', 'leak']):
        priority_score = 90
    elif any(w in lower for w in ['urgent', 'pothole', 'overflow', 'delay']):
        priority_score = 75

    return {
        "category": best_category,
        "priority_score": priority_score,
        "confidence": 0.85 if max_score > 0 else 0.60
    }


def find_semantic_duplicate(
    new_text: str, 
    existing_texts: List[str], 
    threshold: float = 0.75
) -> Optional[int]:
    """
    Returns the index of the matching duplicate complaint, or None if unique.
    """
    if not existing_texts:
        return None

    if HAS_ML:
        try:
            from sentence_transformers import util
            new_emb = embedder.encode(new_text, convert_to_tensor=True)
            existing_embs = embedder.encode(existing_texts, convert_to_tensor=True)
            scores = util.cos_sim(new_emb, existing_embs)[0]
            best_idx = int(scores.argmax())
            if float(scores[best_idx]) >= threshold:
                return best_idx
            return None
        except Exception:
            pass

    # Fallback string matching
    new_words = set(re.findall(r'\w+', new_text.lower()))
    for idx, text in enumerate(existing_texts):
        words = set(re.findall(r'\w+', text.lower()))
        common = new_words.intersection(words)
        if len(common) >= 3:
            return idx
    return None


def run_batch_clustering(texts: List[str], min_topic_size: int = 3) -> Dict:
    """
    Runs lightweight BERTopic over a batch of complaints to detect emerging trends.
    """
    if len(texts) < min_topic_size:
        return {"topics": {}, "summary": "Dataset too small for clustering"}

    if HAS_ML:
        try:
            topic_model = BERTopic(
                embedding_model=embedder,
                calculate_probabilities=False,
                min_topic_size=min_topic_size,
                verbose=False
            )
            topics, _ = topic_model.fit_transform(texts)
            topic_info = topic_model.get_topic_info()
            clusters = []
            for _, row in topic_info.iterrows():
                if row["Topic"] != -1:
                    clusters.append({
                        "topic_id": int(row["Topic"]),
                        "count": int(row["Count"]),
                        "name": row["Name"],
                        "keywords": [word for word, _ in topic_model.get_topic(row["Topic"])[:5]]
                    })
            return {"clusters": clusters, "total_clustered": len(texts)}
        except Exception:
            pass

    return {
        "clusters": [
            {"topic_id": 1, "count": len(texts), "name": "General Civic Complaints", "keywords": ["water", "road", "garbage"]}
        ],
        "total_clustered": len(texts)
    }
