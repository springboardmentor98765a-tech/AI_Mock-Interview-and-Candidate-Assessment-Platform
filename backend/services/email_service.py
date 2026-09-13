import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

logger = logging.getLogger("email_service")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@smarthire.ai")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500")

def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
    """
    Sends email via SMTP using environment configuration.
    If SMTP host/username is not configured or error occurs, logs cleanly and returns False.
    Does NOT raise exceptions.
    """
    if not SMTP_HOST or not SMTP_USERNAME:
        logger.info(f"SMTP not configured; skipping email delivery to {to_email} (Subject: {subject})")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = EMAIL_FROM
        msg["To"] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(EMAIL_FROM, [to_email], msg.as_string())

        logger.info(f"Email sent successfully to {to_email} (Subject: '{subject}')")
        return True
    except Exception as e:
        logger.warning(f"Email delivery to {to_email} failed: {e}")
        return False


def build_email_wrapper(title: str, body_html: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #F8FAFC; margin: 0; padding: 20px; }}
            .card {{ max-width: 600px; margin: 0 auto; background-color: #1E293B; border-radius: 12px; padding: 30px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }}
            .header {{ font-size: 24px; font-weight: 800; color: #6366F1; margin-bottom: 20px; text-align: center; }}
            .content {{ font-size: 15px; line-height: 1.6; color: #E2E8F0; }}
            .btn {{ display: inline-block; background-color: #6366F1; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 20px; text-align: center; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #94A3B8; text-align: center; border-top: 1px solid #334155; padding-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">SmartHire AI</div>
            <div class="content">
                <h2>{title}</h2>
                {body_html}
            </div>
            <div class="footer">
                &copy; 2026 SmartHire AI — Automated Candidate Assessment Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """


def send_interview_assigned_email(candidate_email: str, candidate_name: str, domain: str, interview_type: str, duration_mins: int):
    subject = "New Mock Interview Assigned — SmartHire AI"
    html = build_email_wrapper(
        "New Mock Interview Assigned",
        f"""
        <p>Hello <strong>{candidate_name}</strong>,</p>
        <p>You have been assigned a new mock interview session on SmartHire AI.</p>
        <ul>
            <li><strong>Domain / Role:</strong> {domain}</li>
            <li><strong>Interview Type:</strong> {interview_type}</li>
            <li><strong>Duration:</strong> {duration_mins} Minutes</li>
        </ul>
        <p>Please log in to your dashboard to review instructions and start the interview.</p>
        <a href="{FRONTEND_URL}/login.html" class="btn">Go to Candidate Dashboard</a>
        """
    )
    send_email(candidate_email, subject, html)


def send_interview_reminder_email(candidate_email: str, candidate_name: str, domain: str, time_label: str):
    subject = f"Reminder: Your SmartHire AI Interview ({domain}) is Coming Up"
    html = build_email_wrapper(
        "Upcoming Interview Reminder",
        f"""
        <p>Hello <strong>{candidate_name}</strong>,</p>
        <p>This is a reminder that your assigned interview for <strong>{domain}</strong> is scheduled {time_label}.</p>
        <p>Make sure your webcam and microphone are working properly before launching the session.</p>
        <a href="{FRONTEND_URL}/login.html" class="btn">Start Interview Session</a>
        """
    )
    send_email(candidate_email, subject, html)


def send_evaluation_ready_email(candidate_email: str, candidate_name: str, domain: str):
    subject = "Your SmartHire AI Interview Report is Ready"
    html = build_email_wrapper(
        "Evaluation Report Ready",
        f"""
        <p>Hello <strong>{candidate_name}</strong>,</p>
        <p>Your performance report for the <strong>{domain}</strong> mock interview has been generated.</p>
        <p>Log in now to view your score breakdown, skill analytics, behavioral analysis, and actionable improvement recommendations.</p>
        <a href="{FRONTEND_URL}/login.html" class="btn">View Evaluation Report</a>
        """
    )
    send_email(candidate_email, subject, html)


def send_score_sharing_confirmation_email(candidate_email: str, candidate_name: str, domain: str, shared: bool):
    status_str = "SHARED with the recruiter" if shared else "KEPT PRIVATE"
    subject = f"Score Sharing Preference Updated — {domain}"
    html = build_email_wrapper(
        "Score Sharing Preference Confirmed",
        f"""
        <p>Hello <strong>{candidate_name}</strong>,</p>
        <p>Your score-sharing preference for your interview <strong>{domain}</strong> has been updated to: <strong>{status_str}</strong>.</p>
        <p>You can manage or revoke score-sharing permissions at any time from your Candidate Dashboard privacy settings.</p>
        <a href="{FRONTEND_URL}/login.html" class="btn">Manage Privacy Settings</a>
        """
    )
    send_email(candidate_email, subject, html)


def send_session_alert_email(candidate_email: str, candidate_name: str, domain: str, alert_title: str, alert_message: str):
    """Sends session alert notification email cleanly without raising exceptions."""
    subject = f"Interview Session Alert — {alert_title}"
    html = build_email_wrapper(
        f"Session Alert: {alert_title}",
        f"""
        <p>Hello <strong>{candidate_name}</strong>,</p>
        <p>An important alert occurred during your interview session for <strong>{domain}</strong>:</p>
        <blockquote style="background-color: #0F172A; padding: 15px; border-left: 4px solid #F59E0B; margin: 15px 0;">
            {alert_message}
        </blockquote>
        <p>If you have questions, please log in to your dashboard to review your session log.</p>
        <a href="{FRONTEND_URL}/login.html" class="btn">View Candidate Dashboard</a>
        """
    )
    send_email(candidate_email, subject, html)

