import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def get_candidate_token():
    res = client.post("/api/auth/login", json={
        "email": "alex.morgan@dev.io",
        "password": "Password123!"
    })
    return res.json()["access_token"]

def test_get_candidate_profile():
    token = get_candidate_token()
    response = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alex.morgan@dev.io"
    assert "ats_score" in data

def test_update_candidate_profile():
    token = get_candidate_token()
    response = client.put("/api/candidate/profile", headers={"Authorization": f"Bearer {token}"}, json={
        "skills": "React, TypeScript, Python, FastAPI",
        "phone": "+1 555 999 8888"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "+1 555 999 8888"
    assert "FastAPI" in data["skills"]
