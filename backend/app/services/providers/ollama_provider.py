"""
Local Ollama provider — no API key, no daily quota.

Structured output uses Ollama's native `format` parameter with a JSON schema
(constrained decoding), not a "please return JSON" instruction. The response is
therefore parseable directly: no markdown fences to strip and no hand-parsing.

Text only. Ollama serves LLMs, not speech models, so TTS and STT are not
implemented here — the facade routes those elsewhere.
"""

import logging
from typing import List

from app.core.config import settings
from app.services.providers.base import (
    AIUnavailable,
    AIUnreachable,
    GeneratedQuestion,
    GeneratedQuestionSet,
    QUESTION_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
    question_prompt,
    resume_prompt,
    strict_json_schema,
)

logger = logging.getLogger(__name__)

NAME = "ollama"


def _client():
    from ollama import Client

    # A local model on CPU is slow; the default httpx timeout would abort a
    # perfectly healthy generation part-way through.
    return Client(host=settings.OLLAMA_BASE_URL, timeout=settings.OLLAMA_TIMEOUT_SECONDS)


def _wrap(exc: Exception) -> AIUnavailable:
    """
    Connection problems are the common local failure — the server is not
    running, or the port is wrong. Say that, rather than "quota".
    """
    text = str(exc)
    lowered = text.lower()
    if any(
        marker in lowered
        for marker in ("connect", "refused", "timeout", "timed out", "unreachable", "no route")
    ):
        return AIUnreachable(
            f"Cannot reach the local AI model at {settings.OLLAMA_BASE_URL}: {text}"
        )
    return AIUnavailable(text)


def is_reachable() -> tuple[bool, str]:
    """(reachable, detail) — used by /health so a stopped server is obvious."""
    try:
        response = _client().list()
        models = [m.model for m in getattr(response, "models", [])]
        if settings.OLLAMA_MODEL not in models:
            return (
                False,
                f"Server is up but model {settings.OLLAMA_MODEL!r} is not pulled. "
                f"Available: {', '.join(models) or 'none'}",
            )
        return True, "ok"
    except Exception as exc:  # noqa: BLE001
        return False, f"Cannot reach {settings.OLLAMA_BASE_URL}: {exc}"


def _chat(system: str, prompt: str, schema: dict) -> str:
    try:
        response = _client().chat(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            format=schema,  # native structured output — constrained decoding
            options={"temperature": 0.4},
            keep_alive=settings.OLLAMA_KEEP_ALIVE,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ollama call failed: %s", exc)
        raise _wrap(exc) from exc

    content = (response.message.content or "").strip()
    if not content:
        raise AIUnavailable("The local model returned an empty response.")
    return content


def generate_questions(
    *, interview_type: str, domain: str, difficulty: str, count: int
) -> List[GeneratedQuestion]:
    content = _chat(
        QUESTION_SYSTEM_PROMPT,
        question_prompt(
            interview_type=interview_type, domain=domain, difficulty=difficulty, count=count
        ),
        strict_json_schema(GeneratedQuestionSet),
    )

    try:
        parsed = GeneratedQuestionSet.model_validate_json(content)
    except Exception as exc:  # noqa: BLE001
        raise AIUnavailable(f"The local model returned unusable question data: {exc}") from exc

    if not parsed.questions:
        raise AIUnavailable("The local model returned no questions.")

    return parsed.questions[:count]


def extract_resume(resume_text: str):
    from app.schemas.resume import ExtractedResume

    content = _chat(
        RESUME_SYSTEM_PROMPT,
        resume_prompt(resume_text),
        strict_json_schema(ExtractedResume),
    )

    try:
        return ExtractedResume.model_validate_json(content)
    except Exception as exc:  # noqa: BLE001
        raise AIUnavailable(f"The local model returned unusable résumé data: {exc}") from exc
