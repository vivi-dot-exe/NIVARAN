import sys
import os
import json
from datetime import datetime, timedelta

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("=== STARTING JANSETU 4 CORE PILLARS SANITY SUITE ===")

# 1. Test database & models
print("\n[1] Testing database and models initialization...")
from database import Base, engine, get_db, SessionLocal
import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()
print("    -> Database schema & SessionLocal initialized successfully.")

# 2. Test ML Engine & Mathematical Formulas
print("\n[2] Testing Pillar 1 & Pillar 2 ML Formulas...")
from ml_engine import (
    compute_dynamic_priority,
    compute_h3_index,
    haversine_distance_meters,
    find_spatio_semantic_duplicate,
    verify_resolution_delta,
    analyze_grievance
)

# Test Haversine Distance
dist_exact = haversine_distance_meters(19.1197, 72.8464, 19.1199, 72.8465)
print(f"    -> Haversine distance between nearby coords: {dist_exact:.2f} meters")
assert dist_exact < 40.0, "Distance calculation mismatch"

# Test H3 Index
h3_cell = compute_h3_index(19.1197, 72.8464, resolution=10)
print(f"    -> Uber H3 Res 10 Cell: {h3_cell}")
assert h3_cell is not None and len(h3_cell) > 5

# Test Dynamic Priority Formula: min(100, BaseSeverity + 10*log2(Upvotes+1) + ElapsedHours*0.75)
p_initial = compute_dynamic_priority(base_severity=50, upvotes=1, created_at=datetime.utcnow())
p_boosted = compute_dynamic_priority(base_severity=50, upvotes=31, created_at=datetime.utcnow() - timedelta(hours=24))
print(f"    -> Priority Score (1 upvote, 0h): {p_initial}")
print(f"    -> Priority Score (31 upvotes, 24h elapsed): {p_boosted}")
assert p_initial >= 50
assert p_boosted > p_initial, "Dynamic priority must scale with upvotes and elapsed time"

# Test Two-Stage Spatio-Semantic Deduplication
existing_mock = [
    {
        "id": "G-1001",
        "text": "Water pipeline burst near Shoppers Stop SV Road flooding road",
        "latitude": 19.1197,
        "longitude": 72.8464,
        "category": "Water Supply"
    },
    {
        "id": "G-9999",
        "text": "Water pipeline burst near Shoppers Stop SV Road flooding road",
        "latitude": 19.2500,  # 15km away in Borivali
        "longitude": 72.8500,
        "category": "Water Supply"
    }
]

# Nearby matching ticket (within 20m)
dup_nearby = find_spatio_semantic_duplicate(
    new_text="SV road Shoppers stop paani pipe phat gayi hai water leak",
    new_lat=19.1198,
    new_lng=72.8464,
    existing_tickets=existing_mock,
    max_radius_meters=35.0,
    semantic_threshold=0.75
)
print(f"    -> Two-Stage Dedup Nearby Check: is_duplicate={dup_nearby['is_duplicate']}, match={dup_nearby.get('match_ticket', {}).get('id') if dup_nearby.get('match_ticket') else None}")
assert dup_nearby["is_duplicate"] is True, "Expected nearby ticket to match"
assert dup_nearby["match_ticket"]["id"] == "G-1001"

# Distant ticket with identical text (15km away) - spatial gate MUST filter it out
dup_distant = find_spatio_semantic_duplicate(
    new_text="Water pipeline burst near Shoppers Stop SV Road flooding road",
    new_lat=19.0500,  # Bandra
    new_lng=72.8400,
    existing_tickets=existing_mock,
    max_radius_meters=35.0
)
print(f"    -> Two-Stage Dedup Distant Check (Bandra vs Andheri): is_duplicate={dup_distant['is_duplicate']}, stage1_passed={dup_distant['stage1_passed']}")
assert dup_distant["is_duplicate"] is False, "Distant complaint must NOT trigger false duplicate across wards"

# 3. Test FastAPI Microservice Endpoints
print("\n[3] Testing FastAPI Microservice Endpoints...")
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 3.1 Create Master Ticket
res_create = client.post("/api/tickets", json={
    "text": "Cave-in on SV Road due to broken main water pipe",
    "location": "Ward 4 - Andheri West",
    "category": "Roads & Infra",
    "latitude": 19.1197,
    "longitude": 72.8464
})
assert res_create.status_code == 201
master_ticket = res_create.json()
t_id = master_ticket["id"]
print(f"    -> [Pillar 1] Created Master Ticket {t_id} with H3 index {master_ticket['h3_index']}")

# 3.2 Test Upvoting
res_upvote = client.post(f"/api/tickets/{t_id}/upvote", json={"citizen_note": "I am also stranded in traffic"})
assert res_upvote.status_code == 200
upvoted = res_upvote.json()
assert upvoted["upvotes"] == 2
print(f"    -> [Pillar 1] Upvoted ticket {t_id}: Upvotes={upvoted['upvotes']}, Priority={upvoted['priority_score']}")

# 3.3 Test Pillar 3: Multi-Agency DAG Split-Ticketing
subtasks_payload = {
    "sub_tasks": [
        {
            "id": "ST-1",
            "title": "Fix Leaking Underground Pipe",
            "department": "Water Supply",
            "assigned_officer": "Er. Rajesh Sharma (Water Board)",
            "status": "In Progress",
            "depends_on": []
        },
        {
            "id": "ST-2",
            "title": "Resurface Road Asphalt",
            "department": "Roads & Infra",
            "assigned_officer": "Tech. Amit Patil (PWD)",
            "status": "Blocked",
            "depends_on": ["ST-1"]
        }
    ]
}
res_split = client.post(f"/api/tickets/{t_id}/split-task", json=subtasks_payload)
assert res_split.status_code == 200
print(f"    -> [Pillar 3] Created DAG split-tasks for {t_id}")

# Attempt to resolve ST-2 prematurely while ST-1 is still pending -> MUST FAIL (Blocked)
res_premature = client.post(f"/api/tickets/{t_id}/subtasks/ST-2/resolve")
assert res_premature.status_code == 400, "Blocked task must not resolve before prerequisite"
print("    -> [Pillar 3] Dependency lock successfully blocked premature ST-2 resolution.")

# Resolve ST-1 -> ST-2 should automatically unlock
res_res_st1 = client.post(f"/api/tickets/{t_id}/subtasks/ST-1/resolve")
assert res_res_st1.status_code == 200
st_updated = json.loads(res_res_st1.json()["sub_tasks"])
st2_status = next(s["status"] for s in st_updated if s["id"] == "ST-2")
assert st2_status == "In Progress", "ST-2 should be unlocked to In Progress after ST-1 resolved"
print(f"    -> [Pillar 3] ST-1 resolved; ST-2 automatically transitioned to: {st2_status}")

# 3.4 Test Pillar 2: Zero-Trust Proof-of-Resolution Protocol
# Ground officer attempts resolution from 500m away -> MUST FAIL with Geofence error
res_geo_fail = client.post(f"/api/tickets/{t_id}/resolve-proof", json={
    "officer_name": "Er. Rajesh Sharma",
    "officer_latitude": 19.1250,  # ~600m away
    "officer_longitude": 72.8500,
    "resolution_notes": "Repaired pipe"
})
assert res_geo_fail.status_code == 400
assert "Geofence Violation" in res_geo_fail.json()["detail"]
print(f"    -> [Pillar 2] Geofence lock successfully rejected distant officer attempt ({res_geo_fail.json()['detail']})")

# Officer within 10m submits proof
res_geo_ok = client.post(f"/api/tickets/{t_id}/resolve-proof", json={
    "officer_name": "Er. Rajesh Sharma",
    "officer_latitude": 19.11975,
    "officer_longitude": 72.84642,
    "resolution_notes": "Pipeline replaced and valve tested."
})
assert res_geo_ok.status_code == 200
proof_res = res_geo_ok.json()
assert proof_res["status"] == "Pending_Verification"
assert proof_res["citizen_otp"] is not None
otp = proof_res["citizen_otp"]
print(f"    -> [Pillar 2] Valid Geofenced Proof accepted. Status: {proof_res['status']}, Dispatched OTP: {otp}")

# 3.5 Test Citizen Verification & Rejection (False Closure Escalation)
# Test citizen rejection flow
res_reject = client.post(f"/api/tickets/{t_id}/verify-resolution", json={
    "action": "reject",
    "rejection_reason": "Water is still leaking into the street"
})
assert res_reject.status_code == 200
rej_ticket = res_reject.json()
assert rej_ticket["status"] == "Escalated"
assert rej_ticket["falsified_attempts"] == 1
assert "Divisional Commissioner" in rej_ticket["assigned_officer"]
print(f"    -> [Pillar 2] Citizen rejection auto-escalated to: {rej_ticket['assigned_officer']} (Falsified count: {rej_ticket['falsified_attempts']})")

# Test citizen approval flow on new ticket
res_new_ticket = client.post("/api/tickets", json={
    "text": "Pothole filled and leveled outside station",
    "location": "Ward 7 - Bandra East",
    "category": "Roads & Infra",
    "latitude": 19.0620,
    "longitude": 72.8480
})
t2_id = res_new_ticket.json()["id"]
client.post(f"/api/tickets/{t2_id}/resolve-proof", json={
    "officer_name": "Tech. Amit Patil",
    "officer_latitude": 19.0620,
    "officer_longitude": 72.8480,
    "resolution_notes": "Asphalt patch completed."
})
t2_updated = client.get("/api/tickets").json()
t2_ticket = next(t for t in t2_updated if t["id"] == t2_id)
t2_otp = t2_ticket["citizen_otp"]

res_approve = client.post(f"/api/tickets/{t2_id}/verify-resolution", json={
    "action": "approve",
    "otp": t2_otp
})
assert res_approve.status_code == 200
assert res_approve.json()["status"] == "Resolved"
print(f"    -> [Pillar 2] Citizen OTP confirmation successfully closed ticket {t2_id}")

# 3.6 Test Pillar 4: Radical Civic SLI Governance Scorecard
res_scorecard = client.get("/api/analytics/governance-scorecard")
assert res_scorecard.status_code == 200
scorecard = res_scorecard.json()
print(f"    -> [Pillar 4] Governance Scorecard: True MTTR={scorecard['true_mttr_hours']}h, JBI={scorecard['jurisdiction_bounce_rate']}%, FCI={scorecard['false_closure_rate']}%")
assert "ward_scorecards" in scorecard
assert len(scorecard["ward_scorecards"]) >= 5
print(f"    -> [Pillar 4] Ward Reliability Scorecards rendered for {len(scorecard['ward_scorecards'])} wards.")

print("\n=======================================================")
print("=== ALL 4 PILLARS UNIT & INTEGRATION TESTS PASSED! ===")
print("=======================================================")

