"""
Module 9 — Email notifications.

Best-effort SMTP sender, used today by the interview-reminder scan
(app/routers/notifications.py) and available for any other flow that
wants to back an in-app notification with an email. Nothing here is
required for the service to run: with EMAIL_ENABLED unset/false, or
any required SMTP_* value missing, send_email() just logs and returns
False so a misconfigured or absent mail server never breaks the
request that triggered it — the same graceful-degrade shape as
app/tts_engine.py's gTTS -> pyttsx3 fallback.
"""
import logging
import smtplib
from email.mime.text import MIMEText

from app.config import (
    EMAIL_ENABLED,
    EMAIL_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_TLS,
    SMTP_USER,
)

logger = logging.getLogger("email_engine")


def is_configured() -> bool:
    return bool(EMAIL_ENABLED and SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends a plain-text email. Returns True on success, False on any
    failure or when email sending isn't configured/enabled. Never
    raises — callers can fire this alongside an in-app notify() call
    without a try/except of their own."""
    if not to_email:
        return False

    if not EMAIL_ENABLED:
        logger.info("Email disabled (EMAIL_ENABLED=false) — skipped %r to %s", subject, to_email)
        return False

    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        logger.warning("Email not fully configured (missing SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — skipped %r to %s", subject, to_email)
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM or SMTP_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        return True
    except Exception as exc:  # noqa: BLE001 - any failure should degrade, never break the caller
        logger.warning("Failed to send email %r to %s: %s", subject, to_email, exc)
        return False
