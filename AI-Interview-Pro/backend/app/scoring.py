"""
scoring.py
===========
Real answer analysis for the AI Mock Interview module.

Every submitted answer is scored on four axes (0-100 each):
    technical_score     - how well the answer engages with the technical
                           content of the question / domain / resume skills
    communication_score - structure, length and clarity of the answer
    confidence_score     - presence of hedging / filler language vs.
                           assertive, specific language
    grammar_score        - basic writing-mechanics checks

Primary path: Google Gemini (same model already used for question
generation) is asked to grade the answer and return JSON scores.

Fallback path: if no GEMINI_API_KEY is configured, or the Gemini call
fails for any reason (network, quota, bad response), a deterministic
local heuristic analyzer is used instead. Nothing here is ever a fixed
placeholder number - every score is derived from the actual text the
candidate submitted.
"""

import json
import re

from app.config import settings

# ---------------------------------------------------------------------------
# Gemini client (lazy-initialised, shared pattern with ai_question_generator)
# ---------------------------------------------------------------------------
_gemini_model = None
_gemini_init_attempted = False


def _get_gemini_model():
    global _gemini_model, _gemini_init_attempted

    if _gemini_init_attempted:
        return _gemini_model

    _gemini_init_attempted = True

    if not settings.GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
    except Exception:
        _gemini_model = None

    return _gemini_model


# ---------------------------------------------------------------------------
# Local heuristic analyzer (always available, no network required)
# ---------------------------------------------------------------------------
FILLER_PHRASES = [
    "um", "uh", "umm", "uhh", "erm", "hmm",
    "i think", "i guess", "i mean", "sort of", "kind of",
    "maybe", "probably", "not sure", "i don't know", "i dont know",
    "like i said", "basically", "actually", "just", "you know",
]

ASSERTIVE_MARKERS = [
    "because", "therefore", "specifically", "for example", "for instance",
    "in my experience", "i implemented", "i built", "i designed", "i led",
    "i achieved", "the result was", "this means", "in summary",
]

STRUCTURE_MARKERS = [
    "first", "second", "third", "next", "then", "finally",
    "for example", "for instance", "because", "therefore", "as a result",
    "in summary", "to summarize", "additionally", "furthermore", "however",
]

STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "on",
    "for", "and", "or", "with", "this", "that", "it", "as", "at", "by",
    "be", "i", "you", "we", "they", "he", "she", "my", "your", "our",
    "so", "but", "if", "can", "do", "does", "how", "what", "why", "which",
    "explain", "describe", "tell", "me", "about", "would", "could", "will",
}


def _words(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", (text or "").lower())


def _keywords(text: str) -> set[str]:
    return {w for w in _words(text) if len(w) > 3 and w not in STOPWORDS}


def _score_communication(answer_text: str) -> float:
    words = _words(answer_text)
    word_count = len(words)
    sentences = [s for s in re.split(r"[.!?]+", answer_text or "") if s.strip()]
    sentence_count = max(len(sentences), 1)

    # Length: ideal answers land roughly 30-180 words. Too short or
    # extremely long answers get penalised.
    if word_count == 0:
        length_score = 0
    elif word_count < 10:
        length_score = 25 + word_count * 2
    elif word_count <= 180:
        length_score = 60 + min(word_count, 100) * 0.4
    else:
        length_score = max(60, 100 - (word_count - 180) * 0.15)

    # Structure: multi-sentence answers with connective/structuring
    # language communicate more clearly than a single unbroken blob.
    structure_hits = sum(1 for m in STRUCTURE_MARKERS if m in (answer_text or "").lower())
    structure_score = min(100, 50 + sentence_count * 8 + structure_hits * 6)

    score = 0.6 * length_score + 0.4 * structure_score
    return max(0, min(100, round(score, 1)))


def _score_technical(question_text: str, answer_text: str, domain: str = None, resume_skills=None) -> float:
    answer_words = _words(answer_text)
    if not answer_words:
        return 0.0

    answer_kw = _keywords(answer_text)
    question_kw = _keywords(question_text)
    domain_kw = _keywords(domain or "")
    resume_kw = {s.lower() for s in (resume_skills or [])}

    reference_kw = question_kw | domain_kw | resume_kw
    if not reference_kw:
        overlap_score = 50.0
    else:
        overlap = len(answer_kw & reference_kw)
        overlap_score = min(100, (overlap / max(1, len(reference_kw))) * 140)

    # Reward concrete, technical-sounding content: numbers, and a
    # reasonably rich (non-repetitive) vocabulary.
    has_numbers = bool(re.search(r"\d", answer_text or ""))
    unique_ratio = len(set(answer_words)) / len(answer_words)
    richness_score = min(100, unique_ratio * 100 + (10 if has_numbers else 0))

    length_factor = min(1.0, len(answer_words) / 20)  # very short answers can't be technical

    score = (0.65 * overlap_score + 0.35 * richness_score) * (0.4 + 0.6 * length_factor)
    return max(0, min(100, round(score, 1)))


def _score_confidence(answer_text: str) -> float:
    text_lower = (answer_text or "").lower()
    word_count = len(_words(answer_text))

    if word_count == 0:
        return 0.0

    filler_hits = sum(text_lower.count(p) for p in FILLER_PHRASES)
    assertive_hits = sum(1 for m in ASSERTIVE_MARKERS if m in text_lower)

    # Normalise filler frequency against answer length so a long,
    # otherwise-strong answer isn't wrecked by one stray "actually".
    filler_ratio = filler_hits / max(1, word_count / 15)

    score = 78 - filler_ratio * 14 + assertive_hits * 5

    if word_count < 8:
        score -= 25  # extremely short answers read as unsure / unprepared

    return max(0, min(100, round(score, 1)))


def _score_grammar(answer_text: str) -> float:
    text = (answer_text or "").strip()
    if not text:
        return 0.0

    score = 100.0
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

    # Capitalisation: each sentence should start with a capital letter.
    uncapitalised = sum(1 for s in sentences if s and not s[0].isupper())
    score -= min(30, uncapitalised * 8)

    # Terminal punctuation on the answer as a whole.
    if text[-1] not in ".!?":
        score -= 8

    # Run-on detection: very long sentences (no punctuation breaks).
    words = _words(text)
    avg_sentence_len = len(words) / max(1, len(sentences))
    if avg_sentence_len > 45:
        score -= 15
    elif avg_sentence_len > 30:
        score -= 7

    # Repeated-word typo check ("the the", "is is", ...).
    repeats = len(re.findall(r"\b(\w+)\s+\1\b", text.lower()))
    score -= min(20, repeats * 10)

    # Double spaces / stray punctuation spacing.
    if "  " in text:
        score -= 5

    return max(0, min(100, round(score, 1)))


def _heuristic_analyze(question_text: str, answer_text: str, domain: str = None, resume_skills=None) -> dict:
    communication = _score_communication(answer_text)
    technical = _score_technical(question_text, answer_text, domain, resume_skills)
    confidence = _score_confidence(answer_text)
    grammar = _score_grammar(answer_text)

    overall = round(
        0.35 * technical + 0.25 * communication + 0.20 * confidence + 0.20 * grammar, 1
    )

    return {
        "technical_score": technical,
        "communication_score": communication,
        "confidence_score": confidence,
        "grammar_score": grammar,
        "overall_score": overall,
        "word_count": len(_words(answer_text)),
    }


# ---------------------------------------------------------------------------
# Module 5 - Speech-to-Text & Communication Analysis
# Blends real, browser-captured speech-delivery metrics (filler-word count,
# speaking pace, recognition-confidence-derived pronunciation clarity) into
# the text-based scores above, when the candidate actually used voice input
# for the answer. A no-op when no speech metrics were supplied (i.e. the
# candidate typed their answer) - nothing here is ever a placeholder.
# ---------------------------------------------------------------------------
IDEAL_WPM_MIN = 110
IDEAL_WPM_MAX = 160


def apply_speech_metrics(
    scores: dict,
    filler_word_count: int = None,
    speaking_pace_wpm: float = None,
    pronunciation_score: float = None,
    word_count: int = None,
) -> dict:
    if filler_word_count is None and speaking_pace_wpm is None and pronunciation_score is None:
        return scores

    result = dict(scores)

    # Pace: full marks inside the ideal conversational range for a spoken
    # interview answer, tapering off the further outside it.
    pace_score = None
    if speaking_pace_wpm is not None and speaking_pace_wpm > 0:
        if IDEAL_WPM_MIN <= speaking_pace_wpm <= IDEAL_WPM_MAX:
            pace_score = 100.0
        elif speaking_pace_wpm < IDEAL_WPM_MIN:
            pace_score = max(0.0, 100 - (IDEAL_WPM_MIN - speaking_pace_wpm) * 1.5)
        else:
            pace_score = max(0.0, 100 - (speaking_pace_wpm - IDEAL_WPM_MAX) * 1.2)

    # Filler-word frequency, normalised per 100 words spoken.
    filler_score = None
    if filler_word_count is not None and word_count:
        filler_ratio = (filler_word_count / max(1, word_count)) * 100
        filler_score = max(0.0, 100 - filler_ratio * 12)

    speech_components = [s for s in (pace_score, filler_score) if s is not None]
    if speech_components:
        speech_communication_score = sum(speech_components) / len(speech_components)
        # Real spoken delivery counts for 40% next to the original
        # text-based communication read.
        result["communication_score"] = round(
            0.6 * scores["communication_score"] + 0.4 * speech_communication_score, 1
        )

    if pronunciation_score is not None:
        # Clear, well-recognised speech reads as more confident delivery.
        result["confidence_score"] = round(
            0.75 * scores["confidence_score"] + 0.25 * max(0, min(100, pronunciation_score)), 1
        )

    if filler_score is not None:
        result["confidence_score"] = round(
            0.85 * result.get("confidence_score", scores["confidence_score"]) + 0.15 * filler_score, 1
        )

    result["overall_score"] = round(
        0.35 * result["technical_score"]
        + 0.25 * result["communication_score"]
        + 0.20 * result["confidence_score"]
        + 0.20 * result["grammar_score"],
        1,
    )

    return result


# ---------------------------------------------------------------------------
# Module 6 - Emotion Detection & Eye Tracking
# Lightly blends the session's running facial-expression/eye-contact-based
# confidence signal (from face-api.js running client-side, see
# app/routes/session_routes.py::submit_emotion_samples) into the answer's
# confidence_score. Kept to a 15% weight since the text-based signal is the
# primary, always-available read on any single answer.
# ---------------------------------------------------------------------------
def apply_visual_confidence(scores: dict, avg_visual_confidence: float = None) -> dict:
    if avg_visual_confidence is None:
        return scores

    result = dict(scores)
    result["confidence_score"] = round(
        0.85 * scores["confidence_score"] + 0.15 * max(0, min(100, avg_visual_confidence)), 1
    )
    result["overall_score"] = round(
        0.35 * result["technical_score"]
        + 0.25 * result["communication_score"]
        + 0.20 * result["confidence_score"]
        + 0.20 * result["grammar_score"],
        1,
    )
    return result


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def analyze_answer(question_text: str, answer_text: str, domain: str = None, resume_skills=None) -> dict:
    """
    Score one candidate answer. Tries Gemini first (if configured),
    always falls back to the local heuristic analyzer so scoring never
    fails or produces a placeholder value.
    """
    model = _get_gemini_model()
    heuristic = _heuristic_analyze(question_text, answer_text, domain, resume_skills)

    if model is None or not (answer_text or "").strip():
        return heuristic

    prompt = (
        "You are grading one candidate interview answer. Score it honestly "
        "on four axes from 0 to 100 (integers): technical_score (correctness "
        "and depth relative to the question/domain), communication_score "
        "(clarity and structure), confidence_score (assertive vs hedging "
        "language), grammar_score (writing mechanics).\n\n"
        f"Domain: {domain or 'general'}\n"
        f"Question: {question_text}\n"
        f"Candidate answer: {answer_text}\n\n"
        "Respond with ONLY a JSON object, no markdown fences, in exactly "
        "this shape: "
        '{"technical_score": <int>, "communication_score": <int>, '
        '"confidence_score": <int>, "grammar_score": <int>}'
    )

    try:
        response = model.generate_content(prompt)
        raw = (response.text or "").strip()
        raw = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        data = json.loads(raw)

        def _clamp(v):
            return max(0, min(100, float(v)))

        technical = _clamp(data["technical_score"])
        communication = _clamp(data["communication_score"])
        confidence = _clamp(data["confidence_score"])
        grammar = _clamp(data["grammar_score"])
        overall = round(
            0.35 * technical + 0.25 * communication + 0.20 * confidence + 0.20 * grammar, 1
        )

        return {
            "technical_score": technical,
            "communication_score": communication,
            "confidence_score": confidence,
            "grammar_score": grammar,
            "overall_score": overall,
            "word_count": heuristic["word_count"],
        }
    except Exception:
        return heuristic
