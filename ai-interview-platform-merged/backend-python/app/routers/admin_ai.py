"""
Module 1 — Admin "Manage AI configurations".

Deliberately scoped: this does NOT let anyone view or edit API keys
through the browser (keys stay in .env, which is the right place for
secrets — a web-editable secrets store would be a real security
regression, not a feature). What it DOES give an admin:

  - Read-only visibility into which providers are actually configured
    right now, and in what fallback order.
  - One safe, non-secret, platform-wide toggle: force every interview
    to be scored by the deterministic simulator instead of calling an
    LLM at all (useful for demos, cost control, or if a provider is
    acting up) — the same flip a developer would otherwise have to SSH
    in and edit .env for.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.platform_settings import ai_scoring_disabled
from app.security import CurrentUser, require_roles

router = APIRouter(prefix="/api/admin/ai", tags=["admin-ai-config"])


class AiStatusOut(BaseModel):
    providerOrder: list[str]
    providers: dict[str, bool]  # provider name -> "is a key/endpoint configured"
    aiScoringDisabled: bool


class SetAiScoringRequest(BaseModel):
    disabled: bool


def _build_ai_status(db: Session) -> AiStatusOut:
    return AiStatusOut(
        providerOrder=config.AI_PROVIDER_ORDER,
        providers={
            "ollama": True,  # local endpoint, always "configured" — reachability isn't known until called
            "gemini": bool(config.GEMINI_API_KEYS),
            "openai": bool(config.OPENAI_API_KEY),
            "grok": bool(config.GROK_API_KEY),
        },
        aiScoringDisabled=ai_scoring_disabled(db),
    )


@router.get("/status", response_model=AiStatusOut)
def get_ai_status(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles("admin"))):
    return _build_ai_status(db)


@router.patch("/scoring", response_model=AiStatusOut)
def set_ai_scoring(
    body: SetAiScoringRequest,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(require_roles("admin")),
):
    from sqlalchemy import text

    # Table is normally created lazily by the Node service's settingsStore
    # (see backend/utils/settingsStore.js) — created here too so this
    # endpoint is self-sufficient even if Node hasn't started yet.
    db.execute(
        text(
            "CREATE TABLE IF NOT EXISTS platform_settings ("
            "key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT NOW())"
        )
    )
    db.execute(
        text(
            "INSERT INTO platform_settings (key, value, updated_at) VALUES ('disable_ai_scoring', :value, NOW()) "
            "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()"
        ),
        {"value": "true" if body.disabled else "false"},
    )
    db.commit()
    return _build_ai_status(db)
