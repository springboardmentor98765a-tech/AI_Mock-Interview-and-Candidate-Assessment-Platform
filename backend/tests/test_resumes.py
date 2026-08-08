"""Module 2 — résumé upload, validation and extraction."""

import subprocess
import sys
from pathlib import Path

import httpx
import pytest

from .conftest import BASE, auth

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="session", autouse=True)
def make_fixtures():
    """Build the test PDFs once. Needs reportlab (a test-only dependency)."""
    FIXTURES.mkdir(exist_ok=True)
    resume = FIXTURES / "resume.pdf"
    if resume.exists():
        return

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except ImportError:
        pytest.skip("reportlab not installed — pip install reportlab to run résumé tests")

    c = canvas.Canvas(str(resume), pagesize=A4)
    y = 800
    for line in [
        "TEST CANDIDATE", "test.candidate@example.com | +91 90000 00000", "",
        "PROFESSIONAL SUMMARY",
        "Backend engineer with 3 years building APIs and data pipelines.", "",
        "EXPERIENCE",
        "Software Engineer - Acme Corp, Bengaluru (Jan 2023 - Present)",
        "  Built and shipped REST services handling 500k requests a day.",
        "  Reduced median response time from 400ms to 120ms.",
        "Junior Developer - Widgets Ltd, Pune (Jun 2021 - Dec 2022)",
        "  Maintained internal tooling and automated the release pipeline.", "",
        "EDUCATION",
        "B.Tech, Information Technology - Test University, 2021, CGPA 8.2/10", "",
        "SKILLS",
        "API design, debugging, code review, technical writing, teamwork", "",
        "TECHNOLOGIES",
        "Python, FastAPI, PostgreSQL, Redis, Docker, Git, pytest, Linux",
    ]:
        c.drawString(60, y, line)
        y -= 16
    c.save()

    # image-only: a filled rectangle, no text objects at all
    c = canvas.Canvas(str(FIXTURES / "scanned.pdf"), pagesize=A4)
    c.rect(100, 500, 300, 200, fill=1)
    c.save()

    # plain text masquerading as a PDF
    (FIXTURES / "fake.pdf").write_text("Not a PDF at all.\n" * 30)

    # valid magic bytes, then padding past the 5 MB cap
    (FIXTURES / "huge.pdf").write_bytes(resume.read_bytes() + b"\n% " + b"x" * (6 * 1024 * 1024))


def _upload(client, token, name):
    with (FIXTURES / name).open("rb") as fh:
        return client.post("/resumes", headers=auth(token),
                           files={"file": (name, fh, "application/pdf")})


class TestUploadValidation:
    def test_requires_auth(self, client):
        with (FIXTURES / "resume.pdf").open("rb") as fh:
            r = client.post("/resumes", files={"file": ("resume.pdf", fh, "application/pdf")})
        assert r.status_code == 401

    def test_recruiter_cannot_upload(self, client, recruiter_token):
        """Upload is candidate-only."""
        assert _upload(client, recruiter_token, "resume.pdf").status_code == 403

    def test_wrong_magic_bytes_is_400(self, client, candidate_token):
        r = _upload(client, candidate_token, "fake.pdf")
        assert r.status_code == 400
        assert "not a pdf" in r.json()["detail"].lower()

    def test_oversize_is_400(self, client, candidate_token):
        r = _upload(client, candidate_token, "huge.pdf")
        assert r.status_code == 400
        assert "exceeds" in r.json()["detail"].lower()

    def test_scanned_pdf_is_422(self, client, candidate_token):
        r = _upload(client, candidate_token, "scanned.pdf")
        assert r.status_code == 422
        assert "scanned" in r.json()["detail"].lower()

    def test_missing_file_field_is_422(self, client, candidate_token):
        assert client.post("/resumes", headers=auth(candidate_token)).status_code == 422


class TestUploadHappyPath:
    def test_extracts_all_six_components(self, client, candidate_token, server_up):
        r = _upload(client, candidate_token, "resume.pdf")

        if r.status_code == 503:
            pytest.skip("GEMINI_API_KEY not configured — extraction cannot be tested")

        assert r.status_code == 201, r.text
        body = r.json()
        assert body["status"] == "PARSED"
        assert body["parsed_at"] is not None

        ex = body["extracted"]
        assert ex is not None
        assert ex["summary"].strip(), "summary empty"
        assert len(ex["skills"]) > 0, "no skills extracted"
        assert len(ex["technologies"]) > 0, "no technologies extracted"
        assert len(ex["experience"]) > 0, "no experience extracted"
        assert len(ex["education"]) > 0, "no education extracted"
        assert ex["total_experience_years"] > 0

    def test_stored_filename_is_not_client_supplied(self, client, candidate_token):
        """Path-traversal guard: the client filename must never become a path."""
        with (FIXTURES / "resume.pdf").open("rb") as fh:
            r = client.post("/resumes", headers=auth(candidate_token),
                            files={"file": ("../../../../etc/passwd.pdf", fh, "application/pdf")})
        if r.status_code == 503:
            pytest.skip("GEMINI_API_KEY not configured")
        assert r.status_code == 201
        # the label is preserved for display, but nothing escaped the upload dir
        assert not Path("/etc/passwd.pdf").exists()


class TestRetrieval:
    def test_me_requires_candidate_role(self, client, recruiter_token):
        assert client.get("/resumes/me", headers=auth(recruiter_token)).status_code == 403

    def test_me_returns_parsed_resume(self, client, candidate_token):
        r = client.get("/resumes/me", headers=auth(candidate_token))
        if r.status_code == 404:
            pytest.skip("no résumé on file for the demo candidate")
        assert r.status_code == 200
        assert r.json()["status"] == "PARSED", "a FAILED upload is masking the good parse"

    def test_candidate_cannot_view_other_candidates(self, client, candidate_token):
        assert client.get("/resumes/candidate/4", headers=auth(candidate_token)).status_code == 403

    def test_recruiter_can_view_candidate(self, client, recruiter_token):
        r = client.get("/resumes/candidate/4", headers=auth(recruiter_token))
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert r.json()["status"] == "PARSED"

    def test_admin_can_view_candidate(self, client, admin_token):
        r = client.get("/resumes/candidate/4", headers=auth(admin_token))
        assert r.status_code in (200, 404)

    def test_unknown_candidate_is_404(self, client, recruiter_token):
        assert client.get("/resumes/candidate/99999999",
                          headers=auth(recruiter_token)).status_code == 404
