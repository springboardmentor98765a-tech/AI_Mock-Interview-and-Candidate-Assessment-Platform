"""
The one place the AI vendor is chosen.

Everything else in the app calls `generate_questions` and `extract_resume` and
never imports a vendor SDK. Which implementation runs is a config choice:
AI_PROVIDER=ollama|gemini.

    ollama  local, no API key, no daily quota
    gemini  cloud, needs a key, free-tier daily quota

Both providers are text-only. The interviewer records the candidate's spoken
answer and stores the audio; no speech-to-text or text-to-speech is performed,
so neither provider needs speech models.
"""

import logging
from typing import List

from app.core.config import settings
from app.services.providers import gemini, ollama_provider
from app.services.providers.base import (  # re-exported: callers import these from here
    AINotConfigured,
    AIQuotaExceeded,
    AIUnavailable,
    AIUnreachable,
    GeneratedQuestion,
    GeneratedQuestionSet,
    strict_json_schema,
)

logger = logging.getLogger(__name__)

_PROVIDERS = {
    gemini.NAME: gemini,
    ollama_provider.NAME: ollama_provider,
}

__all__ = [
    "AINotConfigured",
    "AIQuotaExceeded",
    "AIUnavailable",
    "AIUnreachable",
    "GeneratedQuestion",
    "GeneratedQuestionSet",
    "active_provider",
    "extract_resume",
    "generate_questions",
    "provider_status",
    "strict_json_schema",
]


def active_provider():
    """The module handling text operations, per AI_PROVIDER."""
    name = (settings.AI_PROVIDER or "").strip().lower()
    provider = _PROVIDERS.get(name)
    if provider is None:
        logger.warning(
            "Unknown AI_PROVIDER %r — falling back to %s. Valid values: %s",
            settings.AI_PROVIDER,
            gemini.NAME,
            ", ".join(_PROVIDERS),
        )
        return gemini
    return provider


def active_model() -> str:
    return (
        settings.OLLAMA_MODEL
        if active_provider() is ollama_provider
        else settings.GEMINI_MODEL
    )


def provider_status() -> dict:
    """
    For /health. Reports which provider is active, its model, and whether it can
    actually be reached — a stopped local server should be obvious here rather
    than surfacing later as a generic 503 on an upload.
    """
    provider = active_provider()
    reachable, detail = provider.is_reachable()
    return {
        "provider": provider.NAME,
        "model": active_model(),
        "reachable": reachable,
        "detail": detail,
    }


def generate_questions(
    *, interview_type: str, domain: str, difficulty: str, count: int
) -> List[GeneratedQuestion]:
    return active_provider().generate_questions(
        interview_type=interview_type, domain=domain, difficulty=difficulty, count=count
    )


def extract_resume(resume_text: str):
    return active_provider().extract_resume(resume_text)
