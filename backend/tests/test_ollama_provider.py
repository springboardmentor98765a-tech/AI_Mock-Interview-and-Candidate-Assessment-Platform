"""
Ollama provider — mocked, so these run with no local server and no network.

The live check against a real Ollama server is a separate manual step; these
cover the contract: native structured output, schema-valid results, and the
unreachable path routing into the same fallback the rest of the app relies on.
"""

import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.models.interview import Difficulty, InterviewType, QuestionSource  # noqa: E402
from app.schemas.resume import ExtractedResume  # noqa: E402
from app.services import ai_provider, interview_generator  # noqa: E402
from app.services.providers import gemini, ollama_provider  # noqa: E402
from app.services.providers.base import (  # noqa: E402
    AIUnavailable,
    AIUnreachable,
    GeneratedQuestionSet,
    strict_json_schema,
)

RESUME_JSON = {
    "summary": "A backend engineer with three years of experience.",
    "skills": ["API design", "debugging"],
    "technologies": ["Python", "FastAPI", "PostgreSQL"],
    "total_experience_years": 3.0,
    "experience": [
        {
            "company": "Acme Corp",
            "role": "Software Engineer",
            "start_date": "Jan 2023",
            "end_date": "Present",
            "is_current": True,
            "highlights": ["Built REST services"],
        }
    ],
    "education": [
        {
            "institution": "Test University",
            "degree": "B.Tech",
            "field_of_study": "IT",
            "year": "2021",
            "grade": "8.2/10",
        }
    ],
}

SCORE_JSON = {
    "communication": 78,
    "confidence": 65,
    "technical_relevance": 82,
    "professionalism": 90,
    "rationale": "Clear and on-topic, with some hedging language.",
}

COMMUNICATION_JSON = {
    "grammar_issues": [
        {"excerpt": "I has done", "issue": "Subject-verb agreement.", "suggestion": "I have done"}
    ],
    "clarity": "Direct and to the point.",
    "structure": "Opens with the situation and closes with the result.",
    "conciseness": "A little short — the result needs a sentence more.",
    "strengths": ["Concrete example"],
    "improvements": ["Quantify the outcome"],
}

QUESTIONS_JSON = {
    "questions": [
        {"question_text": "Explain how you would design a caching layer.", "category": "Caching"},
        {"question_text": "Describe a memory leak you have diagnosed.", "category": "Debugging"},
        {"question_text": "Compare relational and document stores here.", "category": "Databases"},
    ]
}


class FakeClient:
    """Stands in for ollama.Client, recording exactly what it was called with."""

    def __init__(self, payload=None, raises=None):
        self.payload = payload
        self.raises = raises
        self.calls = []

    def chat(self, **kwargs):
        self.calls.append(kwargs)
        if self.raises:
            raise self.raises
        return SimpleNamespace(message=SimpleNamespace(content=json.dumps(self.payload)))

    def list(self):
        if self.raises:
            raise self.raises
        return SimpleNamespace(models=[SimpleNamespace(model=settings.OLLAMA_MODEL)])


@pytest.fixture
def use_ollama(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "ollama")


def install(monkeypatch, client):
    monkeypatch.setattr(ollama_provider, "_client", lambda: client)
    return client


class TestStrictSchema:
    """The schema is what makes constrained decoding actually produce content."""

    def test_all_top_level_fields_required(self):
        schema = strict_json_schema(ExtractedResume)
        assert set(schema["required"]) == set(schema["properties"].keys())

    def test_nested_objects_required_too(self):
        schema = strict_json_schema(ExtractedResume)
        for definition in schema.get("$defs", {}).values():
            if definition.get("type") == "object":
                assert definition.get("required"), "nested object left fully optional"

    def test_without_strictness_empty_object_would_validate(self):
        """Why the helper exists: '{}' satisfies the plain schema."""
        assert ExtractedResume.model_validate({}) is not None

    def test_question_schema_is_strict(self):
        schema = strict_json_schema(GeneratedQuestionSet)
        assert "questions" in schema["required"]


class TestStructuredExtraction:
    def test_resume_returns_validated_model(self, monkeypatch, use_ollama):
        install(monkeypatch, FakeClient(RESUME_JSON))
        result = ai_provider.extract_resume("some résumé text")

        assert isinstance(result, ExtractedResume)
        assert result.technologies == ["Python", "FastAPI", "PostgreSQL"]
        assert result.experience[0].company == "Acme Corp"
        assert result.total_experience_years == 3.0

    def test_resume_uses_native_format_not_a_prompt(self, monkeypatch, use_ollama):
        client = install(monkeypatch, FakeClient(RESUME_JSON))
        ai_provider.extract_resume("text")

        call = client.calls[0]
        assert isinstance(call["format"], dict), "format must be a JSON schema, not 'json'"
        assert call["format"]["required"], "schema passed without required fields"
        assert "properties" in call["format"]

    def test_questions_return_validated_models(self, monkeypatch, use_ollama):
        install(monkeypatch, FakeClient(QUESTIONS_JSON))
        questions = ai_provider.generate_questions(
            interview_type="TECHNICAL", domain="backend developer",
            difficulty="MEDIUM", count=3,
        )
        assert len(questions) == 3
        assert questions[0].category == "Caching"

    def test_count_is_respected(self, monkeypatch, use_ollama):
        install(monkeypatch, FakeClient(QUESTIONS_JSON))
        questions = ai_provider.generate_questions(
            interview_type="HR", domain="x", difficulty="EASY", count=2,
        )
        assert len(questions) == 2

    def test_configured_model_is_used(self, monkeypatch, use_ollama):
        monkeypatch.setattr(settings, "OLLAMA_MODEL", "qwen2.5:7b")
        client = install(monkeypatch, FakeClient(QUESTIONS_JSON))
        ai_provider.generate_questions(
            interview_type="HR", domain="x", difficulty="EASY", count=1,
        )
        assert client.calls[0]["model"] == "qwen2.5:7b"

    def test_malformed_json_becomes_AIUnavailable(self, monkeypatch, use_ollama):
        class Broken(FakeClient):
            def chat(self, **kwargs):
                return SimpleNamespace(message=SimpleNamespace(content="not json at all"))

        install(monkeypatch, Broken())
        with pytest.raises(AIUnavailable):
            ai_provider.extract_resume("text")

    def test_empty_response_becomes_AIUnavailable(self, monkeypatch, use_ollama):
        class Empty(FakeClient):
            def chat(self, **kwargs):
                return SimpleNamespace(message=SimpleNamespace(content="   "))

        install(monkeypatch, Empty())
        with pytest.raises(AIUnavailable):
            ai_provider.generate_questions(
                interview_type="HR", domain="x", difficulty="EASY", count=1
            )


class TestUnreachableServer:
    """A stopped local server is the common failure — it must not 500."""

    @pytest.mark.parametrize(
        "exc",
        [
            ConnectionError("[Errno 61] Connection refused"),
            OSError("Failed to connect to localhost:11434"),
            TimeoutError("timed out"),
        ],
        ids=["refused", "connect-fail", "timeout"],
    )
    def test_connection_errors_become_AIUnreachable(self, monkeypatch, use_ollama, exc):
        install(monkeypatch, FakeClient(raises=exc))
        with pytest.raises(AIUnreachable):
            ai_provider.extract_resume("text")

    def test_unreachable_falls_back_to_question_bank(self, monkeypatch, use_ollama):
        """The demo-critical path: Ollama down must still yield questions."""
        install(monkeypatch, FakeClient(raises=ConnectionError("Connection refused")))

        pairs, source = interview_generator.build_questions(
            interview_type=InterviewType.HR,
            domain="backend developer",
            difficulty=Difficulty.EASY,
            count=5,
        )
        assert source == QuestionSource.FALLBACK
        assert len(pairs) == 5
        assert all(text.strip() for _, text in pairs)

    def test_unreachable_is_an_AIUnavailable_subclass(self):
        """So the existing `except AIUnavailable` fallback catches it."""
        assert issubclass(AIUnreachable, AIUnavailable)

    def test_health_reports_server_down(self, monkeypatch, use_ollama):
        install(monkeypatch, FakeClient(raises=ConnectionError("Connection refused")))
        reachable, detail = ollama_provider.is_reachable()
        assert reachable is False
        assert "cannot reach" in detail.lower()

    def test_health_reports_missing_model(self, monkeypatch, use_ollama):
        class WrongModel(FakeClient):
            def list(self):
                return SimpleNamespace(models=[SimpleNamespace(model="something-else:1b")])

        install(monkeypatch, WrongModel())
        reachable, detail = ollama_provider.is_reachable()
        assert reachable is False
        assert "not pulled" in detail.lower()


class TestProviderSelection:
    def test_ollama_selected_by_config(self, monkeypatch, use_ollama):
        assert ai_provider.active_provider() is ollama_provider
        assert ai_provider.active_model() == settings.OLLAMA_MODEL

    def test_gemini_selected_by_config(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
        assert ai_provider.active_provider() is gemini
        assert ai_provider.active_model() == settings.GEMINI_MODEL

    def test_unknown_provider_falls_back_to_gemini(self, monkeypatch):
        monkeypatch.setattr(settings, "AI_PROVIDER", "nonsense")
        assert ai_provider.active_provider() is gemini

    def test_ollama_needs_no_api_key(self, monkeypatch, use_ollama):
        """The whole point: no key, no quota."""
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
        install(monkeypatch, FakeClient(QUESTIONS_JSON))
        questions = ai_provider.generate_questions(
            interview_type="HR", domain="x", difficulty="EASY", count=1
        )
        assert len(questions) == 1

    def test_no_provider_offers_text_to_speech(self):
        """Speech runs one way. Nothing reads the questions aloud."""
        for module in (ai_provider, gemini, ollama_provider):
            assert not hasattr(module, "text_to_speech")

    def test_every_provider_offers_score_answer(self):
        """Module 5's score is text-only, so unlike speech it must follow AI_PROVIDER."""
        for module in (ai_provider, gemini, ollama_provider):
            assert hasattr(module, "score_answer")

    def test_ollama_offers_no_speech_to_text(self):
        """Ollama serves no speech models, so it must not pretend to."""
        assert not hasattr(ollama_provider, "speech_to_text")
        assert not hasattr(ollama_provider, "assess_pronunciation")

    def test_speech_routes_to_gemini_under_ollama(self, monkeypatch, use_ollama):
        """
        The load-bearing rule: selecting Ollama for text must not silently
        disable transcription. Both speech calls go to Gemini regardless.
        """
        seen = {}
        monkeypatch.setattr(
            gemini, "speech_to_text", lambda a, mime_type="audio/webm": seen.setdefault("stt", mime_type) or "hi"
        )
        monkeypatch.setattr(
            gemini,
            "assess_pronunciation",
            lambda a, mime_type="audio/webm": seen.setdefault("pron", mime_type) or object(),
        )

        ai_provider.speech_to_text(b"audio", mime_type="audio/wav")
        ai_provider.assess_pronunciation(b"audio", mime_type="audio/wav")

        assert seen == {"stt": "audio/wav", "pron": "audio/wav"}

    def test_communication_review_follows_the_provider(self, monkeypatch, use_ollama):
        """Grammar review is text, so it stays local when Ollama is selected."""
        client = install(monkeypatch, FakeClient(COMMUNICATION_JSON))
        result = ai_provider.analyse_communication(question="Why?", transcript="Because.")

        assert result.clarity == "Direct and to the point."
        assert isinstance(client.calls[0]["format"], dict), "must use native structured output"

    def test_score_answer_follows_the_provider(self, monkeypatch, use_ollama):
        """Module 5's rubric score is text-only, so it stays local too."""
        client = install(monkeypatch, FakeClient(SCORE_JSON))
        result = ai_provider.score_answer(
            question="Why?",
            transcript="Because.",
            interview_type="HR",
            domain="support lead",
            difficulty="EASY",
        )

        assert result.communication == 78
        assert result.confidence == 65
        assert result.technical_relevance == 82
        assert result.professionalism == 90
        assert isinstance(client.calls[0]["format"], dict), "must use native structured output"

    def test_score_answer_malformed_becomes_AIUnavailable(self, monkeypatch, use_ollama):
        class Broken(FakeClient):
            def chat(self, **kwargs):
                return SimpleNamespace(message=SimpleNamespace(content="not json"))

        install(monkeypatch, Broken())
        with pytest.raises(AIUnavailable):
            ai_provider.score_answer(
                question="Why?", transcript="Because.",
                interview_type="HR", domain="x", difficulty="EASY",
            )

    def test_status_shape(self, monkeypatch, use_ollama):
        install(monkeypatch, FakeClient(QUESTIONS_JSON))
        status = ai_provider.provider_status()
        assert status["provider"] == "ollama"
        assert status["model"] == settings.OLLAMA_MODEL
        # Speech is reported separately from the text provider: it can be down
        # while Ollama is perfectly healthy, and the UI needs to say which.
        assert status["speech_provider"] == "gemini"
        assert set(status) == {
            "provider",
            "model",
            "reachable",
            "detail",
            "speech_provider",
            "speech_model",
            "speech_available",
            "speech_detail",
            "answer_analysis_enabled",
            # Module 6 rides on the same Gemini key as speech, but has its own
            # master switch, so /health reports it separately.
            "behavior_analysis_enabled",
        }
