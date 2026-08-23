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
    AnswerScore,
    COMMUNICATION_SYSTEM_PROMPT,
    CommunicationAssessment,
    GeneratedQuestion,
    GeneratedQuestionSet,
    PRONUNCIATION_SYSTEM_PROMPT,
    PronunciationNotes,
    QUESTION_SYSTEM_PROMPT,
    RESUME_SYSTEM_PROMPT,
    SCORE_SYSTEM_PROMPT,
    communication_prompt,
    question_prompt,
    resume_prompt,
    score_prompt,
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


# --------------------------------------------------------------------------
# Module 5 — communication analysis
# --------------------------------------------------------------------------


def analyse_communication(*, question: str, transcript: str) -> CommunicationAssessment:
    """Grammar and communication-quality review of one transcript. Text only."""
    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=communication_prompt(question=question, transcript=transcript),
            config=types.GenerateContentConfig(
                system_instruction=COMMUNICATION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=CommunicationAssessment,
            ),
        )
        parsed = getattr(response, "parsed", None)

        if parsed is None and getattr(response, "text", None):
            parsed = CommunicationAssessment.model_validate_json(response.text)

    except AIUnavailable:
        raise
    except Exception as exc:
        logger.warning("Communication assessment failed: %s", exc)
        raise _classify(exc) from exc

    if parsed is None:
        raise AIUnavailable("The model returned no communication assessment.")

    return parsed


def score_answer(
    *, question: str, transcript: str, interview_type: str, domain: str, difficulty: str
) -> AnswerScore:
    """Module 6: grade one transcript against the fixed rubric. Text only."""
    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=score_prompt(
                question=question,
                transcript=transcript,
                interview_type=interview_type,
                domain=domain,
                difficulty=difficulty,
            ),
            config=types.GenerateContentConfig(
                system_instruction=SCORE_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=AnswerScore,
            ),
        )
        parsed = getattr(response, "parsed", None)

        if parsed is None and getattr(response, "text", None):
            parsed = AnswerScore.model_validate_json(response.text)

    except AIUnavailable:
        raise
    except Exception as exc:
        logger.warning("Answer scoring failed: %s", exc)
        raise _classify(exc) from exc

    if parsed is None:
        raise AIUnavailable("The model returned no answer score.")

    return parsed


def speech_to_text(audio: bytes, mime_type: str = "audio/webm") -> str:
    """
    Transcribe one recorded answer.

    Returns the transcript as plain text. An empty string is a legitimate
    result — the candidate may have recorded silence — and is NOT an error, so
    callers must distinguish "said nothing" from "transcription failed".

    Two deliberate choices here, both about confabulation. Given a recording it
    cannot make out, this model will sometimes invent a fluent, plausible
    interview answer rather than return nothing:

      The prompt never mentions interviews. Saying "transcribe this interview
      answer" hands the model the genre to invent in, and it takes it.

      temperature=0, so the same recording gives the same reading twice.
      Variation between identical inputs is the symptom that exposes invention,
      and a caller comparing two runs should not be seeing sampling noise.

    Neither is sufficient. The caller MUST still check the result against the
    recording's real duration — see speech_analysis.transcript_is_plausible.
    """
    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_STT_MODEL,
            contents=[
                types.Part.from_bytes(data=audio, mime_type=mime_type),
                (
                    "Transcribe any speech in this audio file verbatim. "
                    "Include filler sounds such as 'um' and 'uh' exactly where "
                    "they occur — they are part of what was said. Do not "
                    "correct grammar, do not summarise, and do not add "
                    "commentary. Output only the words that are audibly "
                    "present. If the audio contains no intelligible speech, or "
                    "you cannot decode it, output NO_SPEECH and nothing else. "
                    "Never invent words that are not in the recording."
                ),
            ],
            config=types.GenerateContentConfig(temperature=0.0),
        )
    except AIUnavailable:
        raise
    except Exception as exc:
        logger.warning("Transcription failed: %s", exc)
        raise _classify(exc) from exc

    text = (getattr(response, "text", None) or "").strip()

    # The sentinel means "nothing was said", which is exactly what an empty
    # transcript means to every caller.
    if text.upper().startswith("NO_SPEECH"):
        return ""

    return text


def assess_pronunciation(audio: bytes, mime_type: str = "audio/webm") -> PronunciationNotes:
    """
    Listening notes on the recording — intelligibility, not a score.

    Needs the audio itself, so this is Gemini-only: Ollama serves no speech
    models and there is no local equivalent to fall back to.
    """
    try:
        from google.genai import types

        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_STT_MODEL,
            contents=[
                types.Part.from_bytes(data=audio, mime_type=mime_type),
                "Assess how intelligible this spoken answer was.",
            ],
            config=types.GenerateContentConfig(
                system_instruction=PRONUNCIATION_SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=PronunciationNotes,
            ),
        )
        parsed = getattr(response, "parsed", None)

        if parsed is None and getattr(response, "text", None):
            parsed = PronunciationNotes.model_validate_json(response.text)

    except AIUnavailable:
        raise
    except Exception as exc:
        logger.warning("Pronunciation assessment failed: %s", exc)
        raise _classify(exc) from exc

    if parsed is None:
        raise AIUnavailable("The model returned no pronunciation notes.")

    return parsed
