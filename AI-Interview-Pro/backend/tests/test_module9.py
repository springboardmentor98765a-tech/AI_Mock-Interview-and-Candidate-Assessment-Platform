"""Run with: python -m pytest tests/test_module9.py tests/test_module8_consent.py"""
from datetime import datetime, timezone, timedelta
from unittest.mock import Mock
import pytest
from fastapi import HTTPException
from test_module8_consent import db, seed
from app.models import InterviewStatusEnum
from app.module9_models import Notification
from app.routes.module9_routes import (
    ReminderIn, add_reminder, cancel_reminder, reminders, reports, download_report,
    download_summary, read_one,
)
from app.notification_service import collect_events, deliver_pending, preferences
from app.config import settings
from app.routes.module8_routes import share_interview, revoke_interview_share
from app.schemas import InterviewShareCreateRequest


def test_reminder_timezone_due_once_cancel_and_owner(db):
    candidate, _, other, _ = seed(db)
    future = datetime.now(timezone.utc) + timedelta(hours=2)
    reminder = add_reminder(ReminderIn(title="Python practice", scheduled_at=future, lead_minutes=15), candidate, db)
    assert reminder["scheduled_at"].endswith("Z")
    with pytest.raises(HTTPException) as exc:
        cancel_reminder(str(reminder["id"]), other, db)
    assert exc.value.status_code == 404
    due = future.replace(tzinfo=None) - timedelta(minutes=14)
    collect_events(db, due)
    collect_events(db, due)
    key = "reminder:" + str(reminder["id"])
    assert db.query(Notification).filter_by(event_key=key).count() == 1
    cancel_reminder(str(reminder["id"]), candidate, db)
    assert reminders(candidate, db)[0]["status"] == "cancelled"


def test_past_reminder_rejected(db):
    candidate, _, _, _ = seed(db)
    with pytest.raises(HTTPException) as exc:
        add_reminder(ReminderIn(title="Past", scheduled_at=datetime.now(timezone.utc)-timedelta(days=1)), candidate, db)
    assert exc.value.status_code == 400


def test_reports_scoped_escaped_and_revoked(db):
    candidate, recruiter, other, interview = seed(db)
    interview.questions[0].answer_text = '<script>alert("x")</script>'
    interview.questions[0].question_feedback = "=HYPERLINK(\"bad\")"
    db.commit()
    assert reports(recruiter, db)["items"] == []
    share = share_interview(str(interview.id), InterviewShareCreateRequest(
        recruiter_id=recruiter.id, consent_acknowledged=True), candidate, db)
    assert len(reports(recruiter, db)["items"]) == 1
    html = download_report(str(interview.id), "html", recruiter, db).body.decode()
    assert '<script>' not in html and '&lt;script&gt;' in html
    csv = download_report(str(interview.id), "csv", recruiter, db).body.decode()
    assert "'=HYPERLINK" in csv
    assert "Performance summary" in download_summary(candidate, db).body.decode()
    for person in [other]:
        with pytest.raises(HTTPException):
            download_report(str(interview.id), "html", person, db)
    revoke_interview_share(str(interview.id), str(share.id), candidate, db)
    with pytest.raises(HTTPException):
        download_report(str(interview.id), "csv", recruiter, db)


def test_email_opt_in_and_delivery_status(db, monkeypatch):
    candidate, _, other, interview = seed(db)
    preferences(db, candidate.id).email_enabled = True
    db.commit()
    collect_events(db)
    item = db.query(Notification).filter_by(user_id=candidate.id).first()
    assert item.email_status == "pending"
    sender = Mock()
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    deliver_pending(db, sender=sender)
    sender.assert_not_called()
    with pytest.raises(HTTPException):
        read_one(str(item.id), other, db)
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test")
    monkeypatch.setattr(settings, "SMTP_FROM", "test@example.com")
    deliver_pending(db, sender=sender)
    sender.assert_called_once()
    assert item.email_status == "sent"
    deliver_pending(db, sender=sender)
    sender.assert_called_once()


def test_email_failure_retries_without_claiming_sent(db, monkeypatch):
    candidate, _, _, _ = seed(db)
    preferences(db, candidate.id).email_enabled = True
    db.commit()
    collect_events(db)
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.test")
    monkeypatch.setattr(settings, "SMTP_FROM", "test@example.com")
    sender = Mock(side_effect=RuntimeError("test failure"))
    now = datetime.utcnow()
    for attempt in range(3):
        deliver_pending(db, now + timedelta(hours=attempt), sender)
    item = db.query(Notification).filter_by(user_id=candidate.id).first()
    assert item.email_status == "failed" and item.attempts == 3


def test_completed_and_expired_alerts_deduplicate(db):
    candidate, _, _, interview = seed(db)
    interview.time_expired = True
    db.commit()
    collect_events(db)
    collect_events(db)
    assert db.query(Notification).filter_by(user_id=candidate.id).count() == 2


def test_http_routes_serialization_and_authentication(db, monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.auth import get_current_user
    from app.database import get_db
    candidate, recruiter, _, interview = seed(db)
    monkeypatch.setattr(settings, "NOTIFICATION_WORKER_ENABLED", False)
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as client:
            assert client.get("/module9/reports").status_code == 401
            app.dependency_overrides[get_current_user] = lambda: candidate
            assert client.get("/module9/reports").json()["items"][0]["id"] == str(interview.id)
            pref = client.get("/module9/preferences").json()
            assert pref["email_enabled"] is False
            response = client.post("/module9/reminders", json={"title":"Practice", "scheduled_at":
                (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "lead_minutes":15})
            assert response.status_code == 201
            assert response.json()["scheduled_at"].endswith("Z")
            assert client.get(f"/module9/reports/{interview.id}/download?format=csv").status_code == 200
            app.dependency_overrides[get_current_user] = lambda: recruiter
            assert client.get("/module9/reports").json()["items"] == []
            assert client.get("/module9/reminders").status_code == 200
    finally:
        app.dependency_overrides.clear()
