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