"""
Google Gemini provider.

Extracted unchanged from the original single-module provider — this is the same
code that has been serving the app, now selectable via AI_PROVIDER=gemini.
Text only: question generation and résumé extraction.
"""

import logging
from typing import List, Optional

from app.core.config import settings
from app.services.providers.base import (
    AINotConfigured,
    AIQuotaExceeded,
    AIUnavailable,
    GeneratedQuestion,
    GeneratedQuestionSet,
    QUESTION_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
    question_prompt,
    resume_prompt,
)

logger = logging.getLogger(__name__)

NAME = "gemini"


def _classify(exc: Exception) -> AIUnavailable:
    """429 is the quota case; anything else stays generic."""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    text = str(exc)
    if code == 429 or "RESOURCE_EXHAUSTED" in text or "429" in text[:8]:
        return AIQuotaExceeded(text)
    return AIUnavailable(text)


def is_reachable() -> tuple[bool, str]:
    """Key presence only — probing the API would burn quota on every health check."""
    if not settings.ai_enabled:
        return False, "GEMINI_API_KEY is not set."
    return True, "ok"


def _client():
    if not settings.ai_enabled:
        raise AINotConfigured("GEMINI_API_KEY is not set.")
    from google import genai

    return genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_questions(
    *,
    interview_type: str,
    domain: str,
    difficulty: str,
    count: int,
) -> List[GeneratedQuestion]:
    """
    Ask the model for `count` interview questions.

    Raises AIUnavailable if there is no key or the call fails, so the caller can
    fall back to the built-in bank.
    """
    system = QUESTION_SYSTEM_PROMPT
    prompt = question_prompt(
        interview_type=interview_type, domain=domain, difficulty=difficulty, count=count
    )

    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_schema=GeneratedQuestionSet,
            ),
        )
        parsed: Optional[GeneratedQuestionSet] = getattr(response, "parsed", None)

        # Older/edge responses may only populate .text — parse it as a fallback.
        if parsed is None and getattr(response, "text", None):
            parsed = GeneratedQuestionSet.model_validate_json(response.text)

    except AIUnavailable:
        raise
    except Exception as exc:  # network, auth, quota, schema refusal
        logger.warning("AI question generation failed: %s", exc)
        raise _classify(exc) from exc

    if parsed is None or not parsed.questions:
        raise AIUnavailable("The model returned no questions.")

    return parsed.questions[:count]


def extract_resume(resume_text: str) -> "ExtractedResume":
    """
    Module 2: pull structured data out of a résumé's text.

    All six spec components — skills, technologies, experience, education,
    total years and summary — come back from this single call, constrained to
    the ExtractedResume schema so there is no JSON to hand-parse.

    Imported lazily from app.schemas.resume to avoid a circular import: the
    schema module imports nothing from here, but the endpoint imports both.
    """
    from app.schemas.resume import ExtractedResume

    system = RESUME_SYSTEM_PROMPT
    prompt = resume_prompt(resume_text)

    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_schema=ExtractedResume,
            ),
        )
        parsed = getattr(response, "parsed", None)

        if parsed is None and getattr(response, "text", None):
            parsed = ExtractedResume.model_validate_json(response.text)

    except AIUnavailable:
        raise
    except Exception as exc:
        logger.warning("Résumé extraction failed: %s", exc)
        raise _classify(exc) from exc

    if parsed is None:
        raise AIUnavailable("The model returned no structured résumé data.")

    return parsed
