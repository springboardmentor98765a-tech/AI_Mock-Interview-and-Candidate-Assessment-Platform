import json
import urllib.error
import urllib.request
from html import escape

from config import RESEND_API_KEY, RESEND_FROM_EMAIL


def send_password_reset_email(recipient: str, reset_url: str, expires_in_minutes: int) -> None:
    if not RESEND_API_KEY or not RESEND_FROM_EMAIL:
        raise RuntimeError("Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in server/.env.")

    safe_url = escape(reset_url, quote=True)
    payload = json.dumps({
        "from": RESEND_FROM_EMAIL,
        "to": [recipient],
        "subject": "Reset your SmartHire AI password",
        "html": f"""
            <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
              <h2>Reset your password</h2>
              <p>We received a request to reset your SmartHire AI password.</p>
              <p><a href="{safe_url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none">Reset password</a></p>
              <p>This link expires in {expires_in_minutes} minutes and can be used only once. If you did not request it, you can safely ignore this email.</p>
            </div>
        """,
    }).encode("utf-8")

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "SmartHire-AI/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError("Resend could not send the password reset email.")
    except urllib.error.HTTPError as error:
        raise RuntimeError("Resend could not send the password reset email.") from error
    except urllib.error.URLError as error:
        raise RuntimeError("Could not connect to Resend. Please try again.") from error


def send_notification_email(
    recipient: str,
    subject: str,
    title: str,
    message: str,
    action_label: str = "View on SmartHire AI",
    action_url: str = "http://localhost:8080",
    badge_label: str = "SmartHire AI Notification"
) -> bool:
    """Send a stylized notification email via Resend if configured, or gracefully log."""
    if not RESEND_API_KEY or not RESEND_FROM_EMAIL:
        # Graceful fallback in development or when Resend key is pending
        print(f"[Email Notification Logged] To: {recipient} | Subject: {subject} | Title: {title}")
        return True

    safe_url = escape(action_url, quote=True)
    safe_title = escape(title)
    safe_msg = escape(message).replace("\n", "<br/>")
    safe_badge = escape(badge_label)
    safe_action = escape(action_label)

    payload = json.dumps({
        "from": RESEND_FROM_EMAIL,
        "to": [recipient],
        "subject": subject,
        "html": f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;background-color:#06070f;font-family:'Inter',Segoe UI,-apple-system,sans-serif;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#06070f;padding:40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" max-width="580px" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background:#0d0e1f;border:1px solid #1f2347;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                      <!-- Header -->
                      <tr>
                        <td style="padding:32px 32px 20px 32px;background:linear-gradient(135deg,rgba(99,102,241,0.15) 0%,rgba(168,85,247,0.05) 100%);border-bottom:1px solid #1f2347;">
                          <div style="display:inline-block;background:rgba(99,102,241,0.2);color:#818cf8;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;border:1px solid rgba(99,102,241,0.3);margin-bottom:12px;">
                            {safe_badge}
                          </div>
                          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">{safe_title}</h1>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:28px 32px;color:#cbd5e1;font-size:14px;line-height:1.6;">
                          <p style="margin:0 0 24px 0;color:#94a3b8;">{safe_msg}</p>
                          <div style="text-align:center;margin:32px 0 16px 0;">
                            <a href="{safe_url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#ffffff;font-weight:600;font-size:14px;padding:14px 28px;border-radius:10px;text-decoration:none;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
                              {safe_action} &rarr;
                            </a>
                          </div>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding:20px 32px;background:#090a16;border-top:1px solid #1f2347;color:#64748b;font-size:12px;text-align:center;">
                          SmartHire AI &bull; Intelligent Technical & Behavioral Evaluation Platform
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
        """,
    }).encode("utf-8")

    request = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "SmartHire-AI/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except Exception as e:
        print(f"[Warning] Failed to dispatch email via Resend: {e}")
        return False