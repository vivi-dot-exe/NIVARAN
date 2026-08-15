from sentence_transformers import SentenceTransformer, util
from bertopic import BERTopic
from typing import List, Dict, Optional
import numpy as np

# 1. Load lightweight embedding model on CPU
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
embedder = SentenceTransformer(EMBED_MODEL_NAME)

# 2. Canonical department anchors
DEPARTMENT_ANCHORS = {
    "Public Health & Healthcare": "no working hospitals hospital clinic doctor medical beds dengue malaria ambulance emergency healthcare non-functional doctor missing",
    "Water Supply": "broken water pipe pipeline leakage contaminated tap water sewage low pressure",
    "Roads & Infrastructure": "huge pothole road broken open manhole collapsed footpath damaged divider asphalt",
    "Sanitation & Garbage": "garbage dumping waste overflow trash bin cleaning dead animal smell stench",
    "Electricity & Power": "sparking wire hanging electrical cable power outage transformer blast street light off"
}

# Pre-compute category embeddings
DEPT_NAMES = list(DEPARTMENT_ANCHORS.keys())
DEPT_EMBEDDINGS = embedder.encode(list(DEPARTMENT_ANCHORS.values()), convert_to_tensor=True)

# Urgency anchor embeddings (for dynamic severity score 0-100)
URGENCY_ANCHORS = [
    "major accident imminent life threatening critical risk massive fire hazard explosion electrocution risk no working hospitals emergency",
    "severe blockage daily life disrupted road impassable dirty contaminated drinking water spreading illness non-functional medical clinic",
    "minor inconvenience cosmetic issue non urgent routine maintenance follow up"
]
URGENCY_WEIGHTS = [100, 65, 20]
URGENCY_EMBEDDINGS = embedder.encode(URGENCY_ANCHORS, convert_to_tensor=True)


def analyze_grievance(text: str) -> Dict:
    """
    Zero-shot classifies category and calculates dynamic urgency score (0-100).
    """
    text_emb = embedder.encode(text, convert_to_tensor=True)

    # --- Department Classification ---
    dept_sims = util.cos_sim(text_emb, DEPT_EMBEDDINGS)[0]
    best_dept_idx = int(dept_sims.argmax())
    predicted_category = DEPT_NAMES[best_dept_idx]

    # --- Urgency Score Calculation ---
    urgency_sims = util.cos_sim(text_emb, URGENCY_EMBEDDINGS)[0].cpu().numpy()
    # Softmax-weighted score
    exp_sims = np.exp(urgency_sims * 3)  # temperature scaling
    weights = exp_sims / np.sum(exp_sims)
    calculated_priority = int(np.dot(weights, URGENCY_WEIGHTS))
    calculated_priority = max(10, min(100, calculated_priority))

    return {
        "category": predicted_category,
        "priority_score": calculated_priority,
        "confidence": round(float(dept_sims[best_dept_idx]), 3)
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

    new_emb = embedder.encode(new_text, convert_to_tensor=True)
    existing_embs = embedder.encode(existing_texts, convert_to_tensor=True)
    scores = util.cos_sim(new_emb, existing_embs)[0]

    best_idx = int(scores.argmax())
    if float(scores[best_idx]) >= threshold:
        return best_idx
    return None


def run_batch_clustering(texts: List[str], min_topic_size: int = 3) -> Dict:
    """
    Runs lightweight BERTopic over a batch of complaints to detect emerging trends.
    """
    if len(texts) < min_topic_size:
        return {"topics": {}, "summary": "Dataset too small for clustering"}

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
        if row["Topic"] != -1:  # ignore outlier bucket
            clusters.append({
                "topic_id": int(row["Topic"]),
                "count": int(row["Count"]),
                "name": row["Name"],
                "keywords": [word for word, _ in topic_model.get_topic(row["Topic"])[:5]]
            })

    return {"clusters": clusters, "total_clustered": len(texts)}
