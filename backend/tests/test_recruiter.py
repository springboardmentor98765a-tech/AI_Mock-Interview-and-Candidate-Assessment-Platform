import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def get_recruiter_token():
    res = client.post("/api/auth/login", json={
        "email": "sarah@nexusinc.com",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_get_recruiter_profile():
    token = get_recruiter_token()
    response = client.get("/api/recruiter/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Nexus Technologies"

def test_get_candidate_rankings():
    token = get_recruiter_token()
    response = client.get("/api/recruiter/rankings", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    rankings = response.json()
    assert isinstance(rankings, list)
    assert len(rankings) > 0
    first = rankings[0]
    assert "overall_score" in first
    # Verify overall score formula: 0.7*ATS + 0.3*Interview
    expected = round((0.70 * first["ats_score"]) + (0.30 * first["interview_score"]), 2)
    assert first["overall_score"] == expected
