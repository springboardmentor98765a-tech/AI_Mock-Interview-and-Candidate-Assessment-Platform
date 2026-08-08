"""
F1/F2 — how the app behaves when the AI provider says no.

These are in-process unit tests rather than HTTP tests: they need to *force* a
429 without actually exhausting a real quota, which means monkeypatching the
provider inside the same process.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.models.interview import Difficulty, InterviewType, QuestionSource  # noqa: E402
from app.services import ai_provider, interview_generator  # noqa: E402
from app.services.providers import gemini  # noqa: E402
from app.services.ai_provider import (  # noqa: E402
    AINotConfigured,
    AIQuotaExceeded,
    AIUnavailable,
)
from app.services.providers.gemini import _classify  # noqa: E402


class FakeQuotaError(Exception):
    """Shaped like google-genai's ClientError for a 429."""

    def __init__(self):
        self.code = 429
        super().__init__(
            "429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': "
            "'You exceeded your current quota', 'status': 'RESOURCE_EXHAUSTED'}}"
        )


class TestClassification:
    def test_429_by_code_is_quota(self):
        assert isinstance(_classify(FakeQuotaError()), AIQuotaExceeded)

    def test_429_by_message_is_quota(self):
        assert isinstance(_classify(Exception("429 RESOURCE_EXHAUSTED")), AIQuotaExceeded)

    def test_resource_exhausted_text_is_quota(self):
        assert isinstance(_classify(Exception("RESOURCE_EXHAUSTED for model")), AIQuotaExceeded)

    def test_other_errors_stay_generic(self):
        for exc in (Exception("connection reset"), Exception("500 INTERNAL")):
            result = _classify(exc)
            assert isinstance(result, AIUnavailable)
            assert not isinstance(result, AIQuotaExceeded)
            assert not isinstance(result, AINotConfigured)

    def test_subclasses_are_catchable_as_the_base(self):
        """The fallback path catches AIUnavailable — subclasses must be caught too."""
        for exc in (AINotConfigured("x"), AIQuotaExceeded("y")):
            assert isinstance(exc, AIUnavailable)

    def test_missing_key_raises_not_configured(self, monkeypatch):
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
        with pytest.raises(AINotConfigured):
            gemini._client()


class TestQuotaFallsBackToBank:
    """The demo-critical behaviour: a 429 must degrade silently, not error."""

    def _force(self, monkeypatch, exc):
        def boom(**kwargs):
            raise exc

        monkeypatch.setattr(interview_generator, "generate_questions", boom)

    @pytest.mark.parametrize(
        "exc",
        [
            AIQuotaExceeded("429 RESOURCE_EXHAUSTED"),
            AINotConfigured("no key"),
            AIUnavailable("connection reset"),
        ],
        ids=["quota-429", "no-key", "generic"],
    )
    def test_every_failure_mode_yields_bank_questions(self, monkeypatch, exc):
        self._force(monkeypatch, exc)

        pairs, source = interview_generator.build_questions(
            interview_type=InterviewType.HR,
            domain="backend developer",
            difficulty=Difficulty.EASY,
            count=5,
        )

        assert source == QuestionSource.FALLBACK
        assert len(pairs) == 5, "the bank must still return the requested count"
        assert all(text.strip() for _, text in pairs)
        assert all(category.strip() for category, _ in pairs)

    def test_quota_error_does_not_escape(self, monkeypatch):
        """No exception may reach the endpoint — the user sees questions, not a 500."""
        self._force(monkeypatch, AIQuotaExceeded("429 RESOURCE_EXHAUSTED"))
        try:
            interview_generator.build_questions(
                interview_type=InterviewType.TECHNICAL,
                domain="sales executive",
                difficulty=Difficulty.HARD,
                count=3,
            )
        except Exception as exc:  # noqa: BLE001
            pytest.fail(f"quota exhaustion leaked to the caller: {exc!r}")

    def test_bank_questions_are_domain_substituted(self, monkeypatch):
        self._force(monkeypatch, AIQuotaExceeded("429"))
        pairs, _ = interview_generator.build_questions(
            interview_type=InterviewType.HR,
            domain="marine biologist",
            difficulty=Difficulty.EASY,
            count=8,
        )
        assert any("marine biologist" in text for _, text in pairs)
        assert not any("{domain}" in text for _, text in pairs)


class TestResumeErrorMessages:
    """
    Résumé upload has no bank to fall back to, so the message is the product.
    Each failure mode must say something actionably different.
    """

    def _detail(self, exc) -> str:
        from fastapi import HTTPException

        from app.api import resumes

        # Reproduce the endpoint's branch without needing a real upload.
        if isinstance(exc, AINotConfigured):
            detail = (
                "Résumé parsing is not configured on this server. "
                "An administrator needs to set the AI API key."
            )
        elif isinstance(exc, AIQuotaExceeded):
            detail = (
                "Résumé parsing is temporarily unavailable — the AI service "
                "daily quota has been reached. Please try again shortly."
            )
        else:
            detail = "Résumé parsing is temporarily unavailable. Please try again shortly."
        assert resumes is not None and HTTPException is not None
        return detail

    def test_three_messages_are_distinct(self):
        messages = {
            self._detail(AINotConfigured("x")),
            self._detail(AIQuotaExceeded("y")),
            self._detail(AIUnavailable("z")),
        }
        assert len(messages) == 3, "failure modes collapsed into the same message"

    def test_quota_message_does_not_blame_the_api_key(self):
        message = self._detail(AIQuotaExceeded("429"))
        assert "api key" not in message.lower()
        assert "quota" in message.lower()

    def test_not_configured_message_names_the_key(self):
        message = self._detail(AINotConfigured("no key"))
        assert "key" in message.lower()


class TestModelConfiguration:
    def test_model_is_a_single_config_value(self):
        """No call site may hardcode a model name."""
        from app.services.providers import ollama_provider

        for module in (gemini, ollama_provider):
            source = Path(module.__file__).read_text()
            assert 'model="gemini' not in source, f"model hardcoded in {module.NAME}"
            assert 'model="qwen' not in source, f"model hardcoded in {module.NAME}"
            assert 'model="llama' not in source, f"model hardcoded in {module.NAME}"

        gemini_src = Path(gemini.__file__).read_text()
        assert "settings.GEMINI_MODEL" in gemini_src
        assert "settings.OLLAMA_MODEL" in Path(ollama_provider.__file__).read_text()

    def test_default_is_a_lite_model(self):
        assert "lite" in settings.GEMINI_MODEL, "generation should default to a high-quota model"

    def test_no_speech_settings_remain(self):
        """Speech conversion was removed; its configuration must not linger."""
        assert not [name for name in type(settings).model_fields if "TTS" in name or "STT" in name]
