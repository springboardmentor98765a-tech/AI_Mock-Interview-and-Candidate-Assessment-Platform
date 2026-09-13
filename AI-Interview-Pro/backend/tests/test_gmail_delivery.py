from app.config import settings
from app import notification_service


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_gmail_api_is_preferred_and_sends_message(monkeypatch):
    monkeypatch.setattr(settings, "GMAIL_CLIENT_ID", "client")
    monkeypatch.setattr(settings, "GMAIL_CLIENT_SECRET", "secret")
    monkeypatch.setattr(settings, "GMAIL_REFRESH_TOKEN", "refresh")
    monkeypatch.setattr(settings, "GMAIL_FROM", "sender@example.com")
    monkeypatch.setattr(notification_service, "_gmail_token", {"value": "", "expires_at": 0.0})
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        if url.endswith("/token"):
            return FakeResponse({"access_token": "access", "expires_in": 3600})
        return FakeResponse({"id": "message-id"})

    monkeypatch.setattr(notification_service.httpx, "post", fake_post)
    notification_service.send_email("candidate@example.com", "Test", "Delivered")

    assert calls[0][0] == "https://oauth2.googleapis.com/token"
    assert calls[0][1]["data"]["grant_type"] == "refresh_token"
    assert calls[1][0] == "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
    assert calls[1][1]["headers"]["Authorization"] == "Bearer access"
    assert calls[1][1]["json"]["raw"]


def test_email_not_ready_with_partial_gmail_configuration(monkeypatch):
    monkeypatch.setattr(settings, "GMAIL_CLIENT_ID", "client")
    monkeypatch.setattr(settings, "GMAIL_CLIENT_SECRET", "")
    monkeypatch.setattr(settings, "GMAIL_REFRESH_TOKEN", "refresh")
    monkeypatch.setattr(settings, "GMAIL_FROM", "sender@example.com")
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    monkeypatch.setattr(settings, "SMTP_FROM", "")
    assert notification_service.smtp_ready() is False
