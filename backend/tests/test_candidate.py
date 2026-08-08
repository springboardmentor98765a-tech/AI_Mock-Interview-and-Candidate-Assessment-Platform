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

def test_multiple_candidate_accounts_session_mapping():
    # Candidate 1: David Chen
    res1 = client.post("/api/auth/login", json={"email": "david.chen@mit.edu", "password": "Password123!"})
    assert res1.status_code == 200
    token1 = res1.json()["access_token"]
    prof1 = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {token1}"}).json()
    assert prof1["email"] == "david.chen@mit.edu"
    assert prof1["name"] == "David Chen"

    # Candidate 2: Harshitha Narahari
    res2 = client.post("/api/auth/login", json={"email": "harshitha@example.com", "password": "Password123!"})
    assert res2.status_code == 200
    token2 = res2.json()["access_token"]
    prof2 = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {token2}"}).json()
    assert prof2["email"] == "harshitha@example.com"
    assert prof2["name"] == "Harshitha Narahari"

    # Confirm distinct mapping and no cross-talk
    assert prof1["user_id"] != prof2["user_id"]
    assert prof1["name"] != prof2["name"]

def test_candidate_no_profile_row_fallback():
    # Register a new candidate user directly in DB without creating a CandidateProfile record
    from database import SessionLocal
    from models.user import User
    from models.candidate import CandidateProfile
    from security.jwt import create_access_token

    email = "noprofile.test@dev.io"
    db = SessionLocal()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        db.delete(existing)
        db.commit()

    from security.passwords import hash_password
    user_np = User(
        name="No Profile Candidate",
        email=email,
        password=hash_password("Password123!"),
        role="CANDIDATE",
        provider="LOCAL",
        is_active=True
    )
    db.add(user_np)
    db.commit()
    db.refresh(user_np)
    np_user_id = user_np.id
    db.close()

    token = create_access_token({"sub": str(np_user_id), "email": email, "role": "CANDIDATE"})
    
    # Request profile endpoint
    response = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "No Profile Candidate"
    assert data["email"] == email
    assert data["ats_score"] == 85.0
    assert data["interview_score"] == 90.0
    assert data["preferred_role"] == "Software Engineer"

    # Teardown
    db = SessionLocal()
    u_clean = db.query(User).filter(User.id == np_user_id).first()
    if u_clean:
        db.delete(u_clean)
        db.commit()
    db.close()

def test_concurrency_simultaneous_recruiter_and_candidate_actions():
    import concurrent.futures

    # Obtain token for candidate David Chen
    res_cand = client.post("/api/auth/login", json={"email": "david.chen@mit.edu", "password": "Password123!"})
    cand_token = res_cand.json()["access_token"]

    # Obtain token for recruiter Sarah Jenkins
    res_rec = client.post("/api/auth/login", json={"email": "sarah@nexusinc.com", "password": "Password123!"})
    rec_token = res_rec.json()["access_token"]

    def candidate_action():
        res = client.get("/api/candidate/profile", headers={"Authorization": f"Bearer {cand_token}"})
        return res.status_code, res.json()

    def recruiter_action():
        # Recruiter generates or updates an interview template
        res = client.post("/api/recruiter/interviews/generate", headers={"Authorization": f"Bearer {rec_token}"}, json={
            "domain": "Software Engineering",
            "interview_type": "Technical",
            "difficulty": "Medium",
            "questions_count": 5,
            "candidate_id": 3
        })
        return res.status_code

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f_cand = executor.submit(candidate_action)
        f_rec = executor.submit(recruiter_action)
        
        cand_status, cand_data = f_cand.result()
        rec_status = f_rec.result()

    assert cand_status == 200
    assert cand_data["email"] == "david.chen@mit.edu"
    assert cand_data["name"] == "David Chen"
    assert rec_status in (200, 201)

