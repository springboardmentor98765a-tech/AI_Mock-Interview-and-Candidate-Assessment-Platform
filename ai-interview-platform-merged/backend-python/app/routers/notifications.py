"""
Module 9 — Notifications & Reports.

The Node service already exposes a minimal GET /api/notifications/me
(newest 10, own + role broadcast) that the four dashboards' bell icon
already calls — that stays as-is. This adds the pieces the guideline
doc's Module 9 asks for that didn't exist anywhere yet, on the same
shared `notifications` table (see app/notify.py):

  * Read/unread management — GET /me (paginated + unread filter),
    PATCH /{id}/read, PATCH /me/read-all, GET /me/unread-count
  * Interview reminders     — POST /reminders/run
  * Session alerts          — see the proctoring-violation notify()
    call added to POST /api/interviews/{id}/violation
  * Email notifications     — app/email_engine.py, used by the
    reminder scan below
  * Downloadable reports / performance summaries — GET
    /me/summary/pdf (the candidate's own aggregate report, alongside
    the existing per-interview GET /api/interviews/{id}/report/pdf)
"""
import io
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.email_engine import send_email
from app.models import Interview, Notification, User
from app.notify import notify
from app.schemas import NotificationOut, ReminderRunOut, UnreadCountOut
from app.security import CurrentUser, get_current_user, require_roles

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

STAFF_ROLES = ("coach", "recruiter", "admin")


def _own_notification_filter(user: CurrentUser):
    return or_(Notification.user_id == user.id, Notification.role == user.role)


# =================================================================
# Read / unread management
# =================================================================
@router.get("/me", response_model=list[NotificationOut])
def list_my_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    q = db.query(Notification).filter(_own_notification_filter(user))
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/me/unread-count", response_model=UnreadCountOut)
def unread_count(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    count = (
        db.query(func.count(Notification.id))
        .filter(_own_notification_filter(user), Notification.is_read.is_(False))
        .scalar()
        or 0
    )
    return UnreadCountOut(unread=count)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: int, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    n = db.get(Notification, notification_id)
    if n is None or (n.user_id != user.id and n.role != user.role):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n


@router.patch("/me/read-all")
def mark_all_read(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)):
    updated = (
        db.query(Notification)
        .filter(_own_notification_filter(user), Notification.is_read.is_(False))
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return {"marked_read": updated}


# =================================================================
# Interview reminders
# =================================================================
@router.post("/reminders/run", response_model=ReminderRunOut)
def run_interview_reminders(
    db: Session = Depends(get_db),
    x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret"),
    authorization: Optional[str] = Header(default=None),
):
    """Scans scheduled interviews starting within REMINDER_WINDOW_HOURS
    and sends a one-time reminder (in-app notification + best-effort
    email) for each. This service has no built-in scheduler, so
    something needs to call this periodically — either a staff/admin
    user from the UI, or an external cron/scheduler authenticated with
    the X-Cron-Secret header (see CRON_SECRET in .env)."""
    if not (config.CRON_SECRET and x_cron_secret == config.CRON_SECRET):
        user = get_current_user(authorization=authorization)
        if user.role not in STAFF_ROLES:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to access this resource")

    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=config.REMINDER_WINDOW_HOURS)
    due = (
        db.query(Interview)
        .filter(
            Interview.status == "scheduled",
            Interview.reminder_sent_at.is_(None),
            Interview.scheduled_at >= now,
            Interview.scheduled_at <= window_end,
        )
        .all()
    )

    sent = 0
    for interview in due:
        candidate = db.get(User, interview.candidate_id)
        when = interview.scheduled_at.strftime("%b %d, %I:%M %p") if interview.scheduled_at else "soon"
        message = f'Reminder: your "{interview.interview_type}" interview is scheduled for {when}.'
        notify(db, user_id=interview.candidate_id, title="Upcoming Interview Reminder", message=message)
        if candidate and candidate.email:
            send_email(candidate.email, "Upcoming Interview Reminder — SmartHire AI", message)
        interview.reminder_sent_at = now
        sent += 1
    db.commit()

    return ReminderRunOut(scanned=len(due), reminders_sent=sent, window_hours=config.REMINDER_WINDOW_HOURS)


# =================================================================
# Downloadable reports / performance summaries
# =================================================================
@router.get("/me/summary/pdf")
def download_performance_summary_pdf(
    db: Session = Depends(get_db), user: CurrentUser = Depends(require_roles("candidate"))
):
    """Aggregate 'performance summary' report across every completed
    interview — complements the existing per-interview
    GET /api/interviews/{id}/report/pdf (Module 1)."""
    rows = (
        db.query(Interview)
        .filter(Interview.candidate_id == user.id, Interview.status == "completed", Interview.score.isnot(None))
        .order_by(Interview.completed_at.asc())
        .all()
    )
    buffer = _build_summary_pdf(user, rows)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="performance-summary.pdf"'},
    )


def _build_summary_pdf(user: CurrentUser, rows: list[Interview]) -> io.BytesIO:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title="Performance Summary")
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Performance Summary", styles["Title"]),
        Paragraph(f"Candidate: {user.full_name or user.email}", styles["Normal"]),
        Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]),
        Spacer(1, 16),
    ]

    if not rows:
        elements.append(Paragraph("No completed interviews yet — take a mock interview to build your report.", styles["Normal"]))
        doc.build(elements)
        buffer.seek(0)
        return buffer

    scores = [r.score for r in rows if r.score is not None]
    avg_score = round(sum(scores) / len(scores)) if scores else 0
    best_score = max(scores) if scores else 0

    overview = Table(
        [
            ["Completed Interviews", str(len(rows))],
            ["Average Score", f"{avg_score}%"],
            ["Best Score", f"{best_score}%"],
        ],
        colWidths=[220, 120],
    )
    overview.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BACKGROUND", (0, 0), (-1, -1), colors.whitesmoke),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements += [overview, Spacer(1, 16)]

    skill_attrs = [
        ("Communication", "skill_communication"),
        ("Confidence", "skill_confidence"),
        ("Technical Relevance", "skill_technical"),
        ("Problem Solving", "skill_problem_solving"),
        ("Professionalism", "skill_professionalism"),
    ]
    skill_rows = []
    weakest_label, weakest_avg = None, 101
    for label, attr in skill_attrs:
        values = [getattr(r, attr) for r in rows if getattr(r, attr) is not None]
        if not values:
            continue
        avg = round(sum(values) / len(values))
        skill_rows.append([label, f"{avg}%"])
        if avg < weakest_avg:
            weakest_avg, weakest_label = avg, label

    if skill_rows:
        elements.append(Paragraph("Skill-Wise Averages", styles["Heading3"]))
        skill_table = Table([["Skill", "Average"]] + skill_rows, colWidths=[220, 120])
        skill_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements += [skill_table, Spacer(1, 16)]

    elements.append(Paragraph("Recent Trend", styles["Heading3"]))
    recent = [r.score for r in rows[-5:] if r.score is not None]
    trend_text = "  \u2192  ".join(f"{s}%" for s in recent) if recent else "Not enough data yet."
    elements.append(Paragraph(trend_text, styles["Normal"]))
    elements.append(Spacer(1, 12))

    if weakest_label:
        elements.append(Paragraph("Suggested Focus Area", styles["Heading3"]))
        elements.append(
            Paragraph(
                f"{weakest_label} ({weakest_avg}%) is your lowest-scoring area on average — prioritize practice here.",
                styles["Normal"],
            )
        )

    doc.build(elements)
    buffer.seek(0)
    return buffer
