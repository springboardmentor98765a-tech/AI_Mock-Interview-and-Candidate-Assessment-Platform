"""
Module 5 — Speech-to-Text & Communication Analysis.

Real-time transcription itself happens client-side (Web Speech API, see
frontend/js/interview-session.js's toggleVoiceInput). This module analyzes
the resulting transcript + timing/confidence signals once an answer is
saved (POST /api/interviews/:id/answers).

Honest scope of each metric — none of this pretends to be more than it is:

- Filler-word detection: a fixed keyword list matched against the transcript
  text. Purely algorithmic, no AI involved, works offline, always available.
- Grammar checking: asks the AI provider chain for a rough issue count +
  one-line feedback. If every provider is unavailable, falls back to a
  handful of cheap heuristics (capitalization, terminal punctuation,
  immediate word repetition) — clearly weaker, and labeled as such.
- Speech pace (WPM): word count over time_taken_seconds, which is already
  tracked per question. For voice answers this approximates real speaking
  pace; for typed answers it's really a "response pace" (typing + thinking
  time), and is labeled differently so it's not misrepresented as speech.
- Pronunciation: there's no phonetic/audio analysis anywhere in this
  project. What's captured here is the Web Speech API's own recognition
  confidence for the candidate's speech (0-1, averaged across final
  results for that answer) — a real, honest proxy for how clearly the
  browser understood them, not a linguistic pronunciation score. Only
  populated for voice answers.
"""
import json
import re
from typing import Optional

from app import ai_providers

# Common, low-false-positive filler words/phrases. Deliberately excludes
# words like "so", "well", "right", "actually" on their own — too likely to
# be normal sentence content rather than a verbal filler — favoring
# precision over exhaustive recall.
FILLER_WORDS = [
    "um", "umm", "ummm",
    "uh", "uhh",
    "erm", "err",
    "like",
    "you know",
    "i mean",
    "kind of",
    "sort of",
    "basically",
    "literally",
]

_FILLER_PATTERNS = [(w, re.compile(r"\b" + re.escape(w) + r"\b", re.IGNORECASE)) for w in FILLER_WORDS]


def count_filler_words(text: str) -> tuple[int, list[str]]:
    """Returns (total_count, list_of_distinct_fillers_found)."""
    if not text:
        return 0, []
    total = 0
    found = []
    for word, pattern in _FILLER_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            total += len(matches)
            found.append(word)
    return total, found


def compute_speech_wpm(text: str, time_taken_seconds: Optional[int]) -> Optional[int]:
    """Words per minute from transcript length over elapsed time. None if
    there isn't enough signal (empty answer, or too little time recorded
    to give a meaningful rate)."""
    if not text or not time_taken_seconds or time_taken_seconds < 3:
        return None
    word_count = len(text.split())
    if word_count == 0:
        return None
    minutes = time_taken_seconds / 60
    return round(word_count / minutes)


def pace_label(wpm: Optional[int], input_mode: str) -> Optional[str]:
    """Conversational speaking pace benchmarks (~110-160 wpm is typical).
    Typed answers get an explicitly different label so a fast typist isn't
    mistaken for a fast talker."""
    if wpm is None:
        return None
    if input_mode != "voice":
        return f"{wpm} wpm (typing pace — not a speech metric)"
    if wpm < 110:
        return f"{wpm} wpm (slower than typical conversational pace)"
    if wpm <= 160:
        return f"{wpm} wpm (natural conversational pace)"
    return f"{wpm} wpm (faster than typical — may be rushing)"


def pronunciation_score_from_confidence(voice_confidence: Optional[float]) -> Optional[int]:
    """0-100 from the Web Speech API's own recognition confidence — see
    module docstring for why this is labeled a proxy, not true
    pronunciation scoring."""
    if voice_confidence is None:
        return None
    return round(max(0.0, min(1.0, voice_confidence)) * 100)


def pronunciation_label(score: Optional[int]) -> Optional[str]:
    if score is None:
        return None
    if score >= 80:
        return f"{score}/100 (speech recognized clearly)"
    if score >= 50:
        return f"{score}/100 (moderate — some words may have been misheard)"
    return f"{score}/100 (low — the browser struggled to recognize speech clearly)"


def _heuristic_grammar_check(text: str) -> tuple[int, str]:
    """Zero-dependency fallback used only if every AI provider is
    unavailable. Deliberately conservative and clearly weaker than the
    AI path — labeled as such in the feedback string."""
    if not text.strip():
        return 0, ""
    issues = 0
    stripped = text.strip()
    if stripped and not stripped[0].isupper():
        issues += 1
    if stripped and stripped[-1] not in ".!?":
        issues += 1
    if re.search(r"\b(\w+)\s+\1\b", text, re.IGNORECASE):
        issues += 1
    feedback = (
        "Basic offline check only (AI grammar checking was unavailable) — "
        "looked at capitalization, sentence-ending punctuation, and repeated words."
    )
    return issues, feedback


def analyze_grammar(text: str) -> tuple[int, str]:
    """Tries the AI provider chain first; falls back to the heuristic
    above so this never blocks answer-saving on an API outage."""
    if not text or not text.strip():
        return 0, ""

    result = ai_providers.analyze_grammar_llm(text)
    if result:
        return result["issue_count"], result["feedback"]

    return _heuristic_grammar_check(text)


def analyze_answer(text: str, time_taken_seconds: Optional[int], input_mode: str, voice_confidence: Optional[float]) -> dict:
    """Runs the full Module 5 pipeline for one answer. Called once per
    POST /api/interviews/:id/answers."""
    filler_count, filler_found = count_filler_words(text)
    grammar_issue_count, grammar_feedback = analyze_grammar(text)
    wpm = compute_speech_wpm(text, time_taken_seconds)
    pronunciation_score = pronunciation_score_from_confidence(voice_confidence) if input_mode == "voice" else None

    return {
        "filler_word_count": filler_count,
        "filler_words_found": json.dumps(filler_found),
        "grammar_issue_count": grammar_issue_count,
        "grammar_feedback": grammar_feedback,
        "speech_wpm": wpm,
        "voice_confidence": voice_confidence if input_mode == "voice" else None,
        "pronunciation_score": pronunciation_score,
    }
