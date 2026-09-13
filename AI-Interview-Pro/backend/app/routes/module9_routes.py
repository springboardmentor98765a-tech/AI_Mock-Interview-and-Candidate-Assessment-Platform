"""Module 9 — owner-only notifications, reminders and consent-scoped reports."""
import csv
import io
import uuid
from datetime import datetime, timezone, timedelta
from html import escape
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, AwareDatetime
from sqlalchemy.orm import Session, joinedload
from app.auth import get_current_user, require_role
from app.database import get_db
from app.models import User, Interview, InterviewStatusEnum, InterviewShareConsent, ShareStatusEnum
from app.module9_models import Notification, InterviewReminder
from app.notification_service import preferences, smtp_ready

router = APIRouter(prefix="/module9", tags=["Notifications & Reports"])


def identifier(value):
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise HTTPException(400, "Invalid identifier.")


def iso(value):
    return value.isoformat() + "Z" if value else None


class PreferencesIn(BaseModel):
    email_enabled: bool
    reminders_enabled: bool
    session_alerts_enabled: bool
    performance_enabled: bool


class ReminderIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    scheduled_at: AwareDatetime
    lead_minutes: int = Field(default=15, ge=0, le=1440)


def preference_out(pref):
    return {**{key: getattr(pref, key) for key in PreferencesIn.model_fields},
            "email_configured": smtp_ready()}


@router.get("/preferences")
def get_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = preferences(db, user.id)
    db.commit()
    return preference_out(pref)


@router.put("/preferences")
def put_preferences(data: PreferencesIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = preferences(db, user.id)
    for key, value in data.model_dump().items():
        setattr(pref, key, value)
    db.commit()
    return preference_out(pref)


@router.get("/notifications")
def inbox(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Notification).filter_by(user_id=user.id)
    return {"unread": query.filter(Notification.read_at.is_(None)).count(),
        "items": [{"id": n.id, "kind": n.kind, "title": n.title, "body": n.body,
                   "created_at": iso(n.created_at), "read": n.read_at is not None,
                   "email_status": ("not_configured" if n.email_status == "pending" and not smtp_ready() else n.email_status)}
                  for n in query.order_by(Notification.created_at.desc()).limit(100).all()]}


@router.post("/notifications/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter_by(user_id=user.id, read_at=None).update({"read_at": datetime.utcnow()})
    db.commit()
    return {"ok": True}


@router.post("/notifications/{notification_id}/read")
def read_one(notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(Notification).filter_by(id=identifier(notification_id), user_id=user.id).first()
    if not item:
        raise HTTPException(404, "Notification not found.")
    item.read_at = item.read_at or datetime.utcnow()
    db.commit()
    return {"ok": True}


def reminder_out(r):
    return {"id": r.id, "title": r.title, "scheduled_at": iso(r.scheduled_at),
            "remind_at": iso(r.remind_at), "status": r.status}


@router.get("/reminders")
def reminders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [reminder_out(r) for r in db.query(InterviewReminder).filter_by(user_id=user.id)
            .order_by(InterviewReminder.scheduled_at.desc()).limit(100).all()]


@router.post("/reminders", status_code=201)
def add_reminder(data: ReminderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scheduled = data.scheduled_at.astimezone(timezone.utc).replace(tzinfo=None)
    if scheduled <= datetime.utcnow() or scheduled > datetime.utcnow() + timedelta(days=366):
        raise HTTPException(400, "Choose a future time within the next year.")
    if not data.title.strip():
        raise HTTPException(400, "Enter a reminder title.")
    if db.query(InterviewReminder).filter_by(user_id=user.id, status="scheduled").count() >= 50:
        raise HTTPException(400, "You already have 50 pending reminders.")
    item = InterviewReminder(user_id=user.id, title=data.title.strip(), scheduled_at=scheduled,
        remind_at=scheduled - timedelta(minutes=data.lead_minutes))
    db.add(item)
    db.commit()
    return reminder_out(item)


@router.delete("/reminders/{reminder_id}")
def cancel_reminder(reminder_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(InterviewReminder).filter_by(id=identifier(reminder_id), user_id=user.id).with_for_update().first()
    if not item:
        raise HTTPException(404, "Reminder not found.")
    item.status = "cancelled"
    pending = db.query(Notification).filter_by(event_key="reminder:" + str(item.id), email_status="pending").first()
    if pending:
        pending.email_status = "disabled"
    db.commit()
    return {"ok": True}


def authorized_interviews(user, db):
    query = db.query(Interview).options(joinedload(Interview.questions), joinedload(Interview.user))
    if user.role == "candidate":
        query = query.filter(Interview.user_id == user.id)
    elif user.role == "recruiter":
        allowed = db.query(InterviewShareConsent.interview_id).filter_by(
            recruiter_id=user.id, status=ShareStatusEnum.active)
        query = query.filter(Interview.id.in_(allowed))
    elif user.role != "admin":
        raise HTTPException(403, "Choose an account role first.")
    return query.filter(Interview.status == InterviewStatusEnum.completed)


def rating(value):
    if value is None:
        return "Not scored"
    for floor, label in [(90, "Excellent"), (75, "Good"), (60, "Average"), (40, "Needs Improvement")]:
        if value >= floor:
            return label
    return "Poor"


def report_row(i):
    return {"id": i.id, "candidate": i.user.full_name, "domain": i.domain,
            "type": i.interview_type.value, "completed_at": iso(i.completed_at),
            "score": i.overall_score, "rating": rating(i.overall_score)}


def performance(rows):
    scores = [i.overall_score for i in rows if i.overall_score is not None]
    dimensions = {}
    for attr in ["communication_score", "confidence_score", "technical_score", "professionalism_score"]:
        values = [getattr(q, attr) for i in rows for q in i.questions
                  if q.answer_text and getattr(q, attr) is not None]
        dimensions[attr] = round(sum(values) / len(values), 1) if values else None
    return {"completed": len(rows), "scored": len(scores),
            "average": round(sum(scores) / len(scores), 1) if scores else None,
            "best": max(scores) if scores else None, "dimensions": dimensions}


@router.get("/reports")
def reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = authorized_interviews(user, db).order_by(Interview.completed_at.desc()).all()
    return {"summary": performance(rows), "items": [report_row(i) for i in rows]}


def safe_cell(value):
    value = "" if value is None else str(value)
    return "'" + value if value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")) else value


def csv_response(rows, name):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows([[safe_cell(c) for c in row] for row in rows])
    return Response("\ufeff" + output.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}.csv"', "Cache-Control": "no-store"})


@router.get("/reports/summary/download")
def download_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = authorized_interviews(user, db).order_by(Interview.completed_at.desc()).all()
    totals = performance(rows)
    return csv_response([["Performance summary", "Value"], ["Completed interviews", totals["completed"]],
        ["Scored interviews", totals["scored"]], ["Average", totals["average"]], ["Best", totals["best"]],
        *[[k.replace("_", " "), v] for k, v in totals["dimensions"].items()], [],
        ["Candidate", "Domain", "Type", "Completed UTC", "Overall score", "Rating"],
        *[[i.user.full_name, i.domain, i.interview_type.value, iso(i.completed_at), i.overall_score, rating(i.overall_score)] for i in rows]],
        "performance-summary")


@router.get("/reports/{interview_id}/download")
def download_report(interview_id: str, format: Literal["html", "csv"] = "html",
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    i = authorized_interviews(user, db).filter(Interview.id == identifier(interview_id)).first()
    if not i:
        raise HTTPException(404, "Report unavailable or sharing permission revoked.")
    fields = ["communication_score", "confidence_score", "technical_score", "professionalism_score", "overall_score"]
    if format == "csv":
        return csv_response([["Candidate", i.user.full_name], ["Domain", i.domain], ["Overall", i.overall_score],
            ["Rating", rating(i.overall_score)], [], ["Question", "Answer", *fields, "Feedback"],
            *[[q.question_text, q.answer_text or "Not answered", *[getattr(q, f) for f in fields], q.question_feedback or ""] for q in i.questions]],
            "interview-report-" + str(i.id))
    e = lambda value: escape(str(value)) if value is not None else "Not available"
    sections = "".join(f'<section><h2>Question {index}</h2><p>{e(q.question_text)}</p>'
        f'<h3>Your response</h3><p>{e(q.answer_text or "Not answered")}</p><dl>' +
        "".join(f'<dt>{e(f.replace("_", " ").title())}</dt><dd>{e(getattr(q, f))}</dd>' for f in fields) +
        f'</dl><h3>Feedback</h3><p>{e(q.question_feedback or "No feedback recorded")}</p></section>'
        for index, q in enumerate(i.questions, 1))
    document = f'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Interview report</title>
    <style>body{{font:16px/1.6 system-ui;color:#172033;max-width:850px;margin:40px auto;padding:24px}}
    header{{border-bottom:3px solid #2563eb;padding-bottom:24px}}h1{{font-size:32px}}h2{{font-size:21px}}
    section{{border-bottom:1px solid #ccd4df;padding:20px 0}}p{{white-space:pre-wrap;overflow-wrap:anywhere}}
    dl{{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;padding:16px}}dd{{text-align:right}}
    @media print{{body{{margin:0;padding:10mm}}h2,h3{{break-after:avoid}}dl{{break-inside:avoid}}}}</style>
    <header><p>AI INTERVIEW PRO · PERFORMANCE REPORT</p><h1>{e(i.domain)} interview</h1>
    <p>{e(i.user.full_name)} · {e(i.interview_type.value)} · {e(i.difficulty.value)}</p>
    <p>Completed: {e(iso(i.completed_at))}</p><h2>{e(i.overall_score)} / 100 · {rating(i.overall_score)}</h2></header>
    <p>Saved interview evidence; scores are practice assessments, not a hiring decision.
    Use your browser’s Print → Save as PDF to keep a PDF copy.</p>{sections}</html>'''
    return Response(document, media_type="text/html; charset=utf-8", headers={
        "Content-Disposition": f'attachment; filename="interview-report-{i.id}.html"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"})
