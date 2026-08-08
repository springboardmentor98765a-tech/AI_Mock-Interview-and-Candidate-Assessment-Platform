"""
Shared fixtures. These tests hit a RUNNING server over real HTTP — they are not
TestClient unit tests — so start the API first:

    uvicorn app.main:app --port 8000

then:  .venv/bin/python -m pytest tests/ -v
"""

import os
import time

import httpx
import pytest

BASE = os.environ.get("SMARTHIRE_TEST_BASE", "http://localhost:8000/api")

CANDIDATE = ("candidate.demo@smarthire.dev", "Candidate@123")
RECRUITER = ("recruiter.demo@smarthire.dev", "Recruiter@123")
ADMIN = ("admin.demo@smarthire.dev", "Admin@123")


def _token(email: str, password: str) -> str:
    r = httpx.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Cannot log in as {email}: {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def server_up():
    """Fail fast with a useful message if the API is not running."""
    try:
        r = httpx.get(f"{BASE}/health", timeout=5)
        r.raise_for_status()
    except Exception as exc:
        pytest.exit(f"API not reachable at {BASE} — start uvicorn first. ({exc})", returncode=1)
    return r.json()


@pytest.fixture(scope="session")
def candidate_token():
    return _token(*CANDIDATE)


@pytest.fixture(scope="session")
def recruiter_token():
    return _token(*RECRUITER)


@pytest.fixture(scope="session")
def admin_token():
    return _token(*ADMIN)


@pytest.fixture(scope="session")
def unique_email():
    # example.com, not .test/.local/.invalid — email-validator rejects
    # special-use TLDs, which would make these 422 before reaching any logic.
    return lambda prefix="user": f"{prefix}.{int(time.time() * 1000)}@example.com"


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE, timeout=120) as c:
        yield c
