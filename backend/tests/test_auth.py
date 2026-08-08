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

def test_google_auth_config():
    response = client.get("/api/auth/config")
    assert response.status_code == 200
    assert "google_client_id" in response.json()

def test_google_login_flow(monkeypatch):
    def mock_verify_google_id_token(token):
        if token == "invalid-token":
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"email": "alex.morgan@dev.io", "name": "Alex Morgan"}

    monkeypatch.setattr("services.auth_service.verify_google_id_token", mock_verify_google_id_token)

    # Existing user email test
    response = client.post("/api/auth/google", json={
        "token": "valid-mock-token",
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

    def mock_verify_new_user(token):
        return {"email": new_email, "name": "New Google User"}

    monkeypatch.setattr("services.auth_service.verify_google_id_token", mock_verify_new_user)

    response = client.post("/api/auth/google", json={
        "token": "valid-new-token",
        "email": new_email,
        "name": "New Google User"
    })
    assert response.status_code == 200
    assert response.json()["role_required"] is True

    # Invalid role test (must return 400 Bad Request)
    response_invalid_role = client.post("/api/auth/google/complete-role", json={
        "email": new_email,
        "name": "New Google User",
        "role": "ADMIN"
    })
    assert response_invalid_role.status_code == 400
    assert "Invalid role" in response_invalid_role.json()["detail"]

    # Complete valid role
    response_complete = client.post("/api/auth/google/complete-role", json={
        "email": new_email,
        "name": "Temp Test User",
        "role": "CANDIDATE"
    })
    assert response_complete.status_code == 200
    assert response_complete.json()["role"] == "CANDIDATE"
    assert response_complete.json()["provider"] == "GOOGLE"

    # Teardown: delete test user created during test execution
    db = SessionLocal()
    u_clean = db.query(User).filter(User.email == new_email).first()
    if u_clean:
        db.delete(u_clean)
        db.commit()
    db.close()

def test_deleted_account_login_failure():
    # Attempt login with deleted account 'new.google.user@gmail.com'
    response = client.post("/api/auth/login", json={
        "email": "new.google.user@gmail.com",
        "password": "Password123!"
    })
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]





