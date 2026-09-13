"""Durable inbox and email outbox. No notification mail is sent without opt-in."""
import base64
import logging
import smtplib
import ssl
import threading
import time
from datetime import datetime, timedelta
from email.message import EmailMessage
import httpx
from sqlalchemy import or_
from app.config import settings
from app.models import User, Interview, InterviewStatusEnum, InterviewShareConsent, ShareStatusEnum
from app.module9_models import Notification, NotificationPreference, InterviewReminder

log = logging.getLogger(__name__)
_gmail_token = {"value": "", "expires_at": 0.0}
_gmail_token_lock = threading.Lock()


def preferences(db, user_id):
    pref = db.get(NotificationPreference, user_id)
    if pref is None:
        pref = NotificationPreference(user_id=user_id, email_enabled=False,
            reminders_enabled=True, session_alerts_enabled=True, performance_enabled=True)
        db.add(pref)
        db.flush()
    return pref


def smtp_ready():
    """Backward-compatible name used by routes and existing tests."""
    gmail_ready = bool(
        settings.GMAIL_CLIENT_ID
        and settings.GMAIL_CLIENT_SECRET
        and settings.GMAIL_REFRESH_TOKEN
        and settings.GMAIL_FROM
    )
    return gmail_ready or bool(settings.SMTP_HOST and settings.SMTP_FROM)


def _gmail_access_token():
    now = time.time()
    with _gmail_token_lock:
        if _gmail_token["value"] and _gmail_token["expires_at"] > now + 60:
            return _gmail_token["value"]
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "refresh_token": settings.GMAIL_REFRESH_TOKEN,
                "grant_type": "refresh_token",
            },
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        _gmail_token["value"] = payload["access_token"]
        _gmail_token["expires_at"] = now + int(payload.get("expires_in", 3600))
        return _gmail_token["value"]


def _send_via_gmail_api(message):
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii").rstrip("=")
    response = httpx.post(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        headers={"Authorization": f"Bearer {_gmail_access_token()}"},
        json={"raw": raw},
        timeout=10,
    )
    response.raise_for_status()


def _deliver_message(message):
    if settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET \
            and settings.GMAIL_REFRESH_TOKEN and settings.GMAIL_FROM:
        _send_via_gmail_api(message)
        return
    connection = smtplib.SMTP_SSL if settings.SMTP_SSL else smtplib.SMTP
    with connection(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as client:
        if not settings.SMTP_SSL:
            client.starttls(context=ssl.create_default_context())
        if settings.SMTP_USERNAME:
            client.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        client.send_message(message)


def enabled(pref, kind):
    return getattr(pref, {"reminder": "reminders_enabled", "session": "session_alerts_enabled",
                          "performance": "performance_enabled"}[kind])


def notify(db, user_id, key, kind, title, body):
    if db.query(Notification.id).filter_by(event_key=key).first():
        return
    pref = preferences(db, user_id)
    if not enabled(pref, kind):
        return
    db.add(Notification(user_id=user_id, event_key=key, kind=kind, title=title, body=body,
        email_status="pending" if pref.email_enabled else "disabled"))
    db.flush()


def collect_events(db, now=None):
    now = now or datetime.utcnow()
    due = db.query(InterviewReminder).filter(
        InterviewReminder.status == "scheduled", InterviewReminder.remind_at <= now
    ).order_by(InterviewReminder.remind_at).limit(100).with_for_update(skip_locked=True).all()
    for reminder in due:
        user = db.get(User, reminder.user_id)
        if user and user.is_active:
            notify(db, user.id, "reminder:" + str(reminder.id), "reminder", "Interview reminder",
                   f"{reminder.title} is scheduled for {reminder.scheduled_at:%Y-%m-%d %H:%M} UTC.")
        reminder.status = "delivered"
    # Recent state changes only: do not send old historical interviews as new alerts.
    for state, timestamp, kind, title in [
        (InterviewStatusEnum.in_progress, Interview.started_at, "session", "Interview session started"),
        (InterviewStatusEnum.completed, Interview.completed_at, "performance", "Your interview report is ready"),
    ]:
        key_prefix = "started:" if kind == "session" else "completed:"
        interviews = db.query(Interview).filter(Interview.status == state,
            timestamp >= now - timedelta(days=1)).order_by(timestamp.desc()).all()
        for interview in interviews:
            user = db.get(User, interview.user_id)
            if user and user.is_active:
                score = "Not scored" if interview.overall_score is None else f"{interview.overall_score:.1f}/100"
                notify(db, user.id, key_prefix + str(interview.id), kind, title,
                       f"{interview.domain} • {interview.interview_type.value}. " +
                       (f"Overall score: {score}. Open Notifications & Reports for the full breakdown."
                        if kind == "performance" else "Your session is in progress. Return to the interview tab to continue."))
                if kind == "performance" and interview.time_expired:
                    notify(db, user.id, "expired:" + str(interview.id), "session", "Interview time limit reached",
                           f"Your {interview.domain} interview ended when its timer expired. Saved responses are available in your report.")
    for share in db.query(InterviewShareConsent).filter(InterviewShareConsent.updated_at >= now-timedelta(days=1)).all():
        recipient = db.get(User, share.recruiter_id)
        if recipient and recipient.is_active:
            active = share.status == ShareStatusEnum.active
            notify(db, recipient.id, f"share:{share.id}:{share.updated_at.isoformat()}", "session",
                   "Interview shared with you" if active else "Interview access revoked",
                   "Your shared interview list has changed. Open Shared Interviews to review your current access.")
    admins = db.query(User).filter_by(role="admin", is_active=True).all()
    recent_users = db.query(User).filter(User.created_at >= now-timedelta(days=1)).all()
    for admin in admins:
        for interview in db.query(Interview).filter(Interview.started_at >= now-timedelta(days=1)).all():
            notify(db, admin.id, f"activity:{admin.id}:{interview.id}", "session", "Interview activity",
                   "An interview session has started. Open Interview activity to monitor its current status.")
        for account in recent_users:
            notify(db, admin.id, f"registered:{admin.id}:{account.id}", "session", "New account registered",
                   f"{account.full_name} joined as {account.role.value if account.role else 'pending role'}. Open User Management to review.")
    db.commit()


def send_email(recipient, title, body):
    message = EmailMessage()
    message["From"] = settings.GMAIL_FROM or settings.SMTP_FROM
    message["To"] = recipient
    message["Subject"] = "AI Interview Pro — " + title
    message.set_content(body + "\n\nSign in to AI Interview Pro to view your notifications.")
    _deliver_message(message)


def send_password_reset_email(recipient, code):
    """Send a transactional security code regardless of notification opt-in."""
    message = EmailMessage()
    message["From"] = settings.GMAIL_FROM or settings.SMTP_FROM
    message["To"] = recipient
    message["Subject"] = "AI Interview Pro - password reset code"
    message.set_content(
        "Use this verification code to reset your AI Interview Pro password:\n\n"
        f"{code}\n\n"
        "This code expires in 10 minutes and can be used only once. "
        "If you did not request a password reset, ignore this email."
    )
    _deliver_message(message)


def deliver_pending(db, now=None, sender=None):
    now = now or datetime.utcnow()
    sender = sender or send_email
    if not smtp_ready():
        return  # Remain pending, never falsely claim successful delivery.
    rows = db.query(Notification).filter(Notification.email_status == "pending",
        or_(Notification.retry_at.is_(None), Notification.retry_at <= now)
    ).order_by(Notification.created_at).limit(10).with_for_update(skip_locked=True).all()
    for item in rows:
        user = db.get(User, item.user_id)
        pref = preferences(db, item.user_id)
        if not user or not user.is_active or not pref.email_enabled or not enabled(pref, item.kind):
            item.email_status = "disabled"
            continue
        item.attempts += 1
        try:
            sender(user.email, item.title, item.body)
            item.email_status = "sent"
        except Exception:
            # Never expose provider credentials/server details to clients.
            log.warning("Notification email delivery failed; attempt %s", item.attempts)
            item.email_status = "failed" if item.attempts >= 3 else "pending"
            item.retry_at = now + timedelta(minutes=5 * item.attempts)
    db.commit()


def process_notifications():
    from app.database import SessionLocal
    with SessionLocal() as db:
        # One event collector per database; also safe with multiple Uvicorn workers.
        if db.bind.dialect.name == "postgresql":
            from sqlalchemy import text
            if not db.execute(text("SELECT pg_try_advisory_xact_lock(9100921)")).scalar():
                return
        collect_events(db)
        deliver_pending(db)
