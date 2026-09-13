"""Live dashboard evidence, account controls and administration."""
from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.auth import get_current_user, require_role
from app.database import get_db
from app.models import User, Interview, InterviewQuestion, FeedbackSubmission
from app.module9_models import Notification
from app.notification_service import notify, smtp_ready, preferences
from app.routes.module9_routes import authorized_interviews, performance, iso, identifier

router = APIRouter(prefix="/dashboard", tags=["Live dashboards"])

class ProfileIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)

@router.patch("/profile")
def profile(data: ProfileIn, user=Depends(get_current_user), db: Session=Depends(get_db)):
    name = data.full_name.strip()
    if not name:
        raise HTTPException(400, "Enter your name.")
    user.full_name = name
    db.commit()
    return {"full_name": name, "email": user.email, "role": user.role}

@router.get("/evidence")
def evidence(user=Depends(get_current_user), db: Session=Depends(get_db)):
    rows = authorized_interviews(user, db).order_by(Interview.completed_at).all()
    grouped = {}
    for row in rows:
        grouped.setdefault(row.user_id, []).append(row)
    candidates = []
    for uid, interviews in grouped.items():
        summary = performance(interviews)
        scores = [i.overall_score for i in interviews if i.overall_score is not None]
        candidates.append({"id": uid, "name": interviews[0].user.full_name,
            "email": interviews[0].user.email, **summary,
            "growth": round(scores[-1]-scores[0], 1) if len(scores)>1 else None})
    candidates.sort(key=lambda c: (c["average"] is not None, c["average"] or 0), reverse=True)
    return {"summary": performance(rows), "candidates": candidates,
        "trend": [{"id": i.id, "candidate_id": i.user_id, "name": i.user.full_name, "domain": i.domain,
                   "date": iso(i.completed_at), "score": i.overall_score} for i in rows]}

@router.get("/admin")
def admin(user=Depends(require_role("admin")), db: Session=Depends(get_db)):
    db.execute(text("SELECT 1"))
    users = db.query(User).order_by(User.created_at.desc()).all()
    interviews = db.query(Interview).order_by(Interview.created_at.desc()).all()
    questions = db.query(InterviewQuestion).all()
    feedback = db.query(FeedbackSubmission).order_by(FeedbackSubmission.created_at.desc()).limit(100).all()
    scores = [i.overall_score for i in interviews if i.overall_score is not None]
    daily = Counter(i.created_at.strftime("%Y-%m-%d") for i in interviews)
    methods = Counter(q.scoring_method or "Unrecorded" for q in questions if q.overall_score is not None)
    return {"users": [{"id": u.id, "name": u.full_name, "email": u.email,
            "role": u.role, "active": u.is_active, "created": iso(u.created_at)} for u in users],
        "interviews": [{"id": i.id, "candidate": i.user.full_name, "domain": i.domain,
            "status": i.status, "score": i.overall_score, "created": iso(i.created_at)} for i in interviews],
        "daily": dict(sorted(daily.items())[-30:]), "scoring_methods": dict(methods),
        "average": round(sum(scores)/len(scores),1) if scores else None,
        "scored_questions": sum(methods.values()), "answered_questions": sum(bool(q.answer_text) for q in questions),
        "health": {"database": "Connected", "email": "Configured" if smtp_ready() else "Email setup required",
            "failed_emails": db.query(Notification).filter_by(email_status="failed").count()},
        "feedback": [{"id": f.id, "name": f.name, "email": f.email,
            "category": f.category, "rating": f.rating, "message": f.message,
            "status": f.status, "created_at": iso(f.created_at)} for f in feedback],
        "generated_at": iso(datetime.utcnow())}

class StatusIn(BaseModel):
    active: bool

@router.patch("/admin/users/{user_id}")
def user_status(user_id: str, data: StatusIn, user=Depends(require_role("admin")), db: Session=Depends(get_db)):
    target = db.get(User, identifier(user_id))
    if not target:
        raise HTTPException(404, "User not found.")
    if target.role == "admin":
        raise HTTPException(400, "Administrator accounts cannot be disabled here.")
    target.is_active = data.active
    notify(db, user.id, "account:"+str(target.id)+":"+str(datetime.utcnow().timestamp()),
           "session", "Account status updated", f"{target.email}: {'active' if data.active else 'disabled'}.")
    db.commit()
    return {"ok": True}

@router.post("/test-email", status_code=202)
def test_email(user=Depends(get_current_user), db: Session=Depends(get_db)):
    if not smtp_ready():
        raise HTTPException(409, "Configure Gmail API or SMTP email delivery, then restart the backend.")
    pref = preferences(db, user.id)
    if not pref.email_enabled or not pref.session_alerts_enabled:
        raise HTTPException(409, "Enable email notifications and session alerts first.")
    recent = db.query(Notification).filter(Notification.user_id==user.id,
        Notification.title=="Email delivery test", Notification.created_at>datetime.utcnow()-timedelta(minutes=1)).first()
    if recent:
        raise HTTPException(429, "Wait one minute before requesting another test.")
    notify(db, user.id, "email-test:"+str(user.id)+":"+str(datetime.utcnow().timestamp()),
           "session", "Email delivery test", "Email notifications are working for your AI Interview Pro account.")
    db.commit()
    return {"message": "Test queued for your registered email. Check the inbox delivery status shortly."}
