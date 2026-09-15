"""
Email Notification Service
Handles email template rendering, SMTP email delivery, simulation fallbacks,
and persistent DB email logging for candidate mock interview events.
"""

import os
import uuid
import smtplib
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional, Tuple

from backend.config import settings
from backend.database import db


def _render_email_template(
    notification_type: str,
    user_name: str,
    details: Dict[str, Any]
) -> Tuple[str, str]:
    """
    Renders professional responsive HTML and subject lines based on actual interview parameters.
    """
    app_name = settings.APP_NAME
    primary_color = "#6366f1"
    
    if notification_type == "interview_scheduled":
        subject = f"Interview Scheduled: {details.get('title', 'AI Mock Interview')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid {primary_color}; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">⚡ {app_name}</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your upcoming mock interview session has been successfully scheduled.</p>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid {primary_color};">
                <p style="margin: 4px 0;"><strong>Session Title:</strong> {details.get('title', 'Technical Interview')}</p>
                <p style="margin: 4px 0;"><strong>Domain:</strong> {details.get('domain', 'Full Stack')}</p>
                <p style="margin: 4px 0;"><strong>Difficulty:</strong> {details.get('difficulty', 'Medium')}</p>
                <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> {details.get('scheduled_time', 'Upcoming')}</p>
                <p style="margin: 4px 0;"><strong>Duration:</strong> {details.get('duration_minutes', 45)} minutes</p>
            </div>
            <p>Automated reminders will be delivered according to your notification preferences.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "interview_reminder":
        subject = f"Reminder: Your Mock Interview is starting in {details.get('reminder_label', 'soon')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">⏰ Interview Reminder</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>This is a reminder that your AI Mock Interview session is scheduled to begin <strong>{details.get('reminder_label', 'shortly')}</strong>.</p>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 4px 0;"><strong>Session:</strong> {details.get('title', 'AI Mock Interview')}</p>
                <p style="margin: 4px 0;"><strong>Scheduled Time:</strong> {details.get('scheduled_time', 'Today')}</p>
                <p style="margin: 4px 0;"><strong>Type:</strong> {details.get('type', 'Technical')} ({details.get('domain', 'General')})</p>
            </div>
            <p>Please ensure your microphone and webcam permissions are active in your browser before beginning.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "interview_rescheduled":
        subject = f"Interview Rescheduled: {details.get('title', 'AI Mock Interview')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #38bdf8; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">📅 Interview Rescheduled</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your mock interview session has been updated to a new scheduled time.</p>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #38bdf8;">
                <p style="margin: 4px 0;"><strong>New Time:</strong> {details.get('scheduled_time', 'Updated')}</p>
                <p style="margin: 4px 0;"><strong>Session Title:</strong> {details.get('title', 'AI Mock Interview')}</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "interview_cancelled":
        subject = f"Interview Cancelled: {details.get('title', 'AI Mock Interview')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">❌ Interview Cancelled</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your scheduled mock interview (<strong>{details.get('title', 'Session')}</strong>) has been cancelled.</p>
            <p>You can schedule another interview session anytime from your candidate portal.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "interview_completed":
        subject = f"Interview Completed: {details.get('domain', 'Technical')} Session"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">✅ Session Completed</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Congratulations on completing your mock interview session!</p>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #10b981;">
                <p style="margin: 4px 0;"><strong>Interview ID:</strong> {details.get('interview_id', 'N/A')}</p>
                <p style="margin: 4px 0;"><strong>Domain:</strong> {details.get('domain', 'Full Stack')}</p>
                <p style="margin: 4px 0;"><strong>Questions Attempted:</strong> {details.get('questions_attempted', 0)}/{details.get('total_questions', 0)}</p>
                <p style="margin: 4px 0;"><strong>Duration:</strong> {details.get('duration_seconds', 0)} seconds</p>
            </div>
            <p>Your AI assessment scoring and feedback evaluation are currently being processed.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "assessment_available":
        overall_score = details.get('overall_score', 'N/A')
        subject = f"Assessment Ready: Score {overall_score}/100 for {details.get('domain', 'Mock Interview')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid {primary_color}; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">📊 Assessment Ready</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your multi-pillar AI assessment evaluation has been compiled and is now ready for review.</p>
            <div style="background-color: #1e293b; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid {primary_color};">
                <p style="margin: 4px 0; font-size: 18px;"><strong>Overall Score:</strong> <span style="color: #38bdf8;">{overall_score}/100</span> ({details.get('recommendation', 'Good')})</p>
                <p style="margin: 4px 0;"><strong>Technical Relevance:</strong> {details.get('technical_score', 'N/A')}/100</p>
                <p style="margin: 4px 0;"><strong>Communication:</strong> {details.get('communication_score', 'N/A')}/100</p>
                <p style="margin: 4px 0;"><strong>Confidence:</strong> {details.get('confidence_score', 'N/A')}/100</p>
                <p style="margin: 4px 0;"><strong>Professionalism:</strong> {details.get('professionalism_score', 'N/A')}/100</p>
            </div>
            <p>Visit your dashboard to view complete granular question feedback and download your official report.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    elif notification_type == "report_generated":
        subject = f"Official Performance Report Generated: {details.get('domain', 'Assessment')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <div style="border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #ffffff; margin: 0;">📄 Performance Report Generated</h2>
            </div>
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>Your official PDF Performance Assessment Report (Report ID: <strong>{details.get('report_id', 'N/A')}</strong>) has been generated.</p>
            <p>You can download the PDF and export performance CSVs directly from your candidate reports dashboard.</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    else:
        subject = f"{app_name} Notification: {details.get('title', 'Update')}"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
            <p>Hello <strong>{user_name}</strong>,</p>
            <p>{details.get('message', 'You have a new update in your AI Interview Portal.')}</p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px;">Best regards,<br/>The {app_name} Team</p>
        </div>
        """

    return subject, body_html


def send_email_notification(
    user_id: str,
    recipient_email: str,
    user_name: str,
    notification_type: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Sends an email notification via SMTP or logging simulation and records the event in the DB.
    Never exposes passwords or sensitive credentials in logs or DB records.
    """
    details = details or {}
    subject, body_html = _render_email_template(notification_type, user_name, details)
    email_log_id = f"email_{uuid.uuid4().hex[:10]}"
    now_iso = datetime.datetime.now().isoformat()

    # Check if real SMTP credentials are provided and simulation mode is off
    has_smtp_creds = bool(settings.EMAIL_HOST and settings.EMAIL_USERNAME and settings.EMAIL_PASSWORD)
    should_send_real_smtp = has_smtp_creds and not settings.EMAIL_SIMULATION_MODE

    status = "sent"
    error_message = None

    if should_send_real_smtp:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = recipient_email
            
            part_html = MIMEText(body_html, "html")
            msg.attach(part_html)

            if settings.EMAIL_USE_TLS:
                server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10)

            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, [recipient_email], msg.as_string())
            server.quit()
            status = "sent"
        except Exception as e:
            status = "failed"
            error_message = str(e)
    else:
        # Simulation mode: record realistic delivery
        status = "sent"

    # Persist log in DB without credentials
    log_entry = {
        "id": email_log_id,
        "user_id": user_id,
        "notification_type": notification_type,
        "recipient_email": recipient_email,
        "subject": subject,
        "status": status,
        "sent_at": now_iso,
        "error_message": error_message
    }
    db.email_logs[email_log_id] = log_entry

    return log_entry
