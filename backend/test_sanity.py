import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

print("=== STARTING FAST SANITY CHECK ===")

# 1. Test database & models
print("1. Testing database and models initialization...")
from database import Base, engine, get_db, SessionLocal
import models

Base.metadata.create_all(bind=engine)
db = SessionLocal()
print("   -> Database & SessionLocal created successfully.")

# 2. Test ML Engine
print("2. Testing ML Engine lightweight pipeline & signatures...")
from ml_engine import analyze_grievance, find_semantic_duplicate, run_batch_clustering

analysis = analyze_grievance("Massive water pipeline burst near main market causing severe flooding")
assert isinstance(analysis, dict), "Analysis must return a dict"
assert "category" in analysis and "priority_score" in analysis, "Analysis must have category and priority_score"
assert isinstance(analysis["category"], str), "Category must be str"
assert isinstance(analysis["priority_score"], int), "Priority score must be int"
print(f"   -> analyze_grievance returned: {analysis}")

duplicate = find_semantic_duplicate("Pothole on MG Road", ["Big pothole on MG Road", "Water leak in sector 4"])
assert isinstance(duplicate, dict), "Duplicate check must return a dict"
assert "is_duplicate" in duplicate and "similarity" in duplicate, "Missing duplicate fields"
print(f"   -> find_semantic_duplicate returned: {duplicate}")

clusters = run_batch_clustering([
    "Water pipe broken in ward 1",
    "Sewage overflow in sector 2",
    "Potholes on highway 44",
    "Street light not working in street 3",
    "Pipeline leak on 5th street"
])
assert isinstance(clusters, list), "Clusters must return a list"
print(f"   -> run_batch_clustering returned {len(clusters)} cluster(s)")

# 3. Test FastAPI App and Endpoints using FastAPI TestClient
print("3. Testing FastAPI endpoints...")
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Test root redirect
res_root = client.get("/")
assert res_root.status_code in [200, 307], f"Root endpoint failed: {res_root.status_code}"
print("   -> Root docs redirect OK")

# Test POST /api/tickets
ticket_data = {
    "text": "Dangerous live electric wire hanging near public school",
    "location": "Ward 12 - Connaught Place",
}
res_create = client.post("/api/tickets", json=ticket_data)
assert res_create.status_code == 201, f"Create ticket failed: {res_create.status_code} - {res_create.text}"
created_ticket = res_create.json()
assert "id" in created_ticket
assert created_ticket["priority_score"] > 0
print(f"   -> POST /api/tickets OK (Ticket ID: {created_ticket['id']}, Category: {created_ticket['category']}, Priority: {created_ticket['priority_score']})")

# Test GET /api/tickets
res_get = client.get("/api/tickets")
assert res_get.status_code == 200, f"GET tickets failed: {res_get.status_code}"
tickets = res_get.json()
assert len(tickets) > 0, "Expected at least 1 ticket"
print(f"   -> GET /api/tickets OK (Fetched {len(tickets)} tickets)")

# Test PATCH /api/tickets/{id}
ticket_id = created_ticket["id"]
res_patch = client.patch(f"/api/tickets/{ticket_id}", json={"status": "In Progress"})
assert res_patch.status_code == 200, f"Patch ticket failed: {res_patch.status_code}"
assert res_patch.json()["status"] == "In Progress"
print(f"   -> PATCH /api/tickets/{ticket_id} OK")

# Test POST /api/analyze
res_analyze = client.post("/api/analyze", json={"text": "Garbage dump overflowing on street"})
assert res_analyze.status_code == 200
print(f"   -> POST /api/analyze OK: {res_analyze.json()}")

print("=== ALL SANITY TESTS PASSED WITH 0 ERRORS ===")
