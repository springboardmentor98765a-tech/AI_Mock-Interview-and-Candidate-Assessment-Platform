import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models.user import User

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_candidate_registration():
    email = "test.candidate.unit@dev.io"
    db = SessionLocal()
    u = db.query(User).filter(User.email == email).first()
    if u:
        db.delete(u)
        db.commit()
    db.close()

    response = client.post("/api/auth/register/candidate", json={
        "name": "Unit Candidate",
        "email": email,
        "password": "SecurePassword123!",
        "phone": "+15551234567",
        "college": "Test University",
        "degree": "B.S.",
        "branch": "CS",
        "graduation_year": 2026,
        "skills": "Python, FastAPI",
        "preferred_role": "Backend Engineer"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "CANDIDATE"
    assert data["email"] == email

def test_duplicate_email_registration():
    email = "alex.morgan@dev.io"
    response = client.post("/api/auth/register/candidate", json={
        "name": "Duplicate Candidate",
        "email": email,
        "password": "Password123!"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_success():
    response = client.post("/api/auth/login", json={
        "email": "alex.morgan@dev.io",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "CANDIDATE"

def test_login_invalid_password():
    response = client.post("/api/auth/login", json={
        "email": "alex.morgan@dev.io",
        "password": "WrongPassword"
    })
    assert response.status_code == 401

def test_google_login_flow():
    # Existing user email test
    response = client.post("/api/auth/google", json={
        "token": "mock-token",
        "email": "alex.morgan@dev.io",
        "name": "Alex Morgan"
    })
    assert response.status_code == 200
    assert response.json()["role_required"] is False

    # New user email test (requires role choice)
    new_email = "new.google.user@gmail.com"
    db = SessionLocal()
    u2 = db.query(User).filter(User.email == new_email).first()
    if u2:
        db.delete(u2)
        db.commit()
    db.close()

    response = client.post("/api/auth/google", json={
        "token": "mock-token",
        "email": new_email,
        "name": "New Google User"
    })
    assert response.status_code == 200
    assert response.json()["role_required"] is True

    # Complete role
    response_complete = client.post("/api/auth/google/complete-role", json={
        "email": new_email,
        "name": "New Google User",
        "role": "CANDIDATE"
    })
    assert response_complete.status_code == 200
    assert response_complete.json()["role"] == "CANDIDATE"
    assert response_complete.json()["provider"] == "GOOGLE"


