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
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.models import Interview
from app.platform_settings import ai_scoring_disabled
from app.schemas import AiPerformanceOut
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


# =================================================================
# Module 10 — Admin "AI performance monitoring": real usage data
# (how often a live LLM actually scored an interview vs the offline
# simulator, which provider answered, and whether AI-scored sessions
# trend higher/lower than simulator-scored ones) — a factual
# complement to GET /status, which only reports configured keys.
# =================================================================
@router.get("/performance", response_model=AiPerformanceOut)
def get_ai_performance(db: Session = Depends(get_db), _: CurrentUser = Depends(require_roles("admin"))):
    scored = db.query(Interview).filter(Interview.status == "completed", Interview.score.isnot(None))

    total = scored.count()
    ai_count = scored.filter(Interview.scoring_source == "ai").count()
    simulator_count = scored.filter(Interview.scoring_source == "simulator").count()

    provider_rows = (
        db.query(Interview.scoring_provider, func.count(Interview.id))
        .filter(Interview.scoring_source == "ai", Interview.scoring_provider.isnot(None))
        .group_by(Interview.scoring_provider)
        .all()
    )
    provider_usage = {name: count for name, count in provider_rows}

    def avg_for(source: str):
        val = (
            db.query(func.avg(Interview.score))
            .filter(Interview.status == "completed", Interview.score.isnot(None), Interview.scoring_source == source)
            .scalar()
        )
        return round(val) if val is not None else None

    return AiPerformanceOut(
        total_scored=total,
        ai_scored_count=ai_count,
        simulator_scored_count=simulator_count,
        ai_scored_pct=round((ai_count / total) * 100) if total else 0,
        provider_usage=provider_usage,
        average_score_ai=avg_for("ai"),
        average_score_simulator=avg_for("simulator"),
    )
