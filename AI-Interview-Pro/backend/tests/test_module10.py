"""Module 10 integration and operational-readiness checks."""
from unittest.mock import MagicMock


def test_liveness_contract():
    from app.main import liveness

    assert liveness() == {"status": "alive", "service": "api"}


def test_readiness_reports_dependencies(monkeypatch):
    from app import main

    connection = MagicMock()
    connection.__enter__.return_value = connection
    monkeypatch.setattr(main.engine, "connect", lambda: connection)
    monkeypatch.setattr(main.os, "access", lambda *_: True)
    response = main.readiness()
    assert response.status_code == 200
    assert b'"database":"connected"' in response.body
    assert b'"media_storage":"writable"' in response.body


def test_readiness_fails_when_database_is_unavailable(monkeypatch):
    from app import main

    def unavailable():
        raise RuntimeError("database offline")

    monkeypatch.setattr(main.engine, "connect", unavailable)
    response = main.readiness()
    assert response.status_code == 503
    assert b'"status":"not_ready"' in response.body
