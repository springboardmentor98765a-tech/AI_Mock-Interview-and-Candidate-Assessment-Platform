import pytest
from fastapi import HTTPException

from app.models import AuthProviderEnum, FeedbackSubmission, RoleEnum, User
from app.routes.feedback_routes import FeedbackIn, list_feedback, submit_feedback
from app.utils import hash_password
from test_module8_consent import db


def payload(email="visitor@example.com"):
    return FeedbackIn(
        name="Project Visitor",
        email=email,
        category="suggestion",
        rating=5,
        message="Please add more domain-specific interview practice options.",
    )


def test_feedback_is_persisted_for_admin_review(db):
    response = submit_feedback(payload(), db)
    assert response["message"].startswith("Thank you")
    saved = db.query(FeedbackSubmission).filter_by(email="visitor@example.com").one()
    assert saved.category == "suggestion"
    assert saved.rating == 5

    administrator = User(
        full_name="Admin",
        email="feedback-admin@example.com",
        password_hash=hash_password("Admin123"),
        role=RoleEnum.admin,
        auth_provider=AuthProviderEnum.local,
        is_active=True,
    )
    db.add(administrator)
    db.commit()
    inbox = list_feedback(administrator, db)
    assert inbox[0]["email"] == "visitor@example.com"


def test_feedback_is_rate_limited_per_email(db):
    submit_feedback(payload("repeat@example.com"), db)
    with pytest.raises(HTTPException) as exc:
        submit_feedback(payload("repeat@example.com"), db)
    assert exc.value.status_code == 429
