from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["ai_mode"] == "local"

def test_test_case_generation():
    response = client.post("/api/test-cases/generate", json={
        "requirement": "A registered user can sign in with a valid email and password."
    })
    assert response.status_code == 200
    assert response.json()["count"] >= 5
