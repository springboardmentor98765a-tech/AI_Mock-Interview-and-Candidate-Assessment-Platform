"""Milestone 3 — Speech Analysis & AI Monitoring.

Pure-text analysis run server-side on every submitted answer:
- filler-word detection (um, uh, like, you know, ...)
- speech pace (words per minute), using time_taken_seconds as the
  denominator — meaningful for voice answers; still computed for
  typed ones as a rough "how fast did they write" signal.

No external API or model needed for either of these — they're
deterministic and run instantly, so unlike question generation or
scoring there's no fallback path required.
"""

import re
from typing import Optional, TypedDict

# Common filler words/phrases in spoken English interview answers.
# Multi-word phrases are matched first so "you know" isn't double
# counted as filler-"know" (not filler) + nothing.
FILLER_PHRASES = [
    "you know what i mean",
    "you know",
    "i mean",
    "sort of",
    "kind of",
    "basically",
    "actually",
    "literally",
    "honestly",
    "so yeah",
    "um",
    "umm",
    "uh",
    "uhh",
    "er",
    "erm",
    "like",
    "well",
]

_WORD_RE = re.compile(r"[A-Za-z']+")


class SpeechMetrics(TypedDict):
    word_count: int
    filler_word_count: int
    filler_words_found: list[str]
    words_per_minute: Optional[int]


def analyze_answer(answer_text: str, time_taken_seconds: Optional[int]) -> SpeechMetrics:
    """Computes filler-word count and words-per-minute for one answer.
    Safe on empty/short input — returns zeros/None rather than raising,
    since this runs on every answer submit and must never block it."""
    text = (answer_text or "").strip()
    words = _WORD_RE.findall(text)
    word_count = len(words)

    lowered = f" {text.lower()} "
    filler_found: list[str] = []
    filler_count = 0
    remaining = lowered
    for phrase in FILLER_PHRASES:
        pattern = r"\b" + re.escape(phrase) + r"\b"
        matches = re.findall(pattern, remaining)
        if matches:
            filler_count += len(matches)
            filler_found.append(phrase)
            # Blank out matched phrase so a substring like "like" inside
            # "you know" isn't recounted separately.
            remaining = re.sub(pattern, " ", remaining)

    wpm: Optional[int] = None
    if time_taken_seconds and time_taken_seconds > 0 and word_count > 0:
        wpm = round(word_count / (time_taken_seconds / 60.0))

    return {
        "word_count": word_count,
        "filler_word_count": filler_count,
        "filler_words_found": filler_found,
        "words_per_minute": wpm,
    }


class GrammarCheck(TypedDict):
    issue_count: int
    issues: list[str]


# Deterministic, rule-based grammar spot-checks — NOT a full NLP
# grammar model (that would need an external API/library this
# environment doesn't have). Catches common, easy-to-detect issues
# reliably rather than guessing at subtler grammar mistakes, so it
# never reports a false "issue" it can't actually justify.
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")
_REPEATED_WORD_RE = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)
_A_BEFORE_VOWEL_RE = re.compile(r"\ba ([aeiouAEIOU]\w*)\b")
_AN_BEFORE_CONSONANT_RE = re.compile(r"\ban ([^aeiouAEIOU\s]\w*)\b")
_DOUBLE_SPACE_RE = re.compile(r"  +")


def check_grammar(answer_text: str) -> GrammarCheck:
    """Best-effort, rule-based grammar spot-check. Flags: sentences not
    starting with a capital letter, immediately repeated words
    ("the the"), "a"/"an" mismatches, and doubled spaces. Returns zero
    issues on empty input rather than raising."""
    text = (answer_text or "").strip()
    if not text:
        return {"issue_count": 0, "issues": []}

    issues: list[str] = []

    sentences = [s for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]
    lowercase_starts = sum(1 for s in sentences if s[:1].isalpha() and s[:1].islower())
    if lowercase_starts:
        issues.append(f"{lowercase_starts} sentence(s) not starting with a capital letter")

    repeated = _REPEATED_WORD_RE.findall(text)
    if repeated:
        issues.append(f"{len(repeated)} immediately repeated word(s) (e.g. \"{repeated[0]} {repeated[0]}\")")

    article_issues = len(_A_BEFORE_VOWEL_RE.findall(text)) + len(_AN_BEFORE_CONSONANT_RE.findall(text))
    if article_issues:
        issues.append(f'{article_issues} "a"/"an" mismatch(es)')

    if _DOUBLE_SPACE_RE.search(text):
        issues.append("extra spacing between words")

    return {"issue_count": len(issues), "issues": issues}


def keyword_match_percentage(answer_text: str, expected_keywords: Optional[str]) -> Optional[int]:
    """% of the question's expected keywords found in the answer, by
    whole-word/phrase case-insensitive match. Returns None (not 0)
    when there are no expected keywords to check against, so callers
    can distinguish "no data" from "matched nothing"."""
    if not expected_keywords:
        return None
    keywords = [k.strip() for k in expected_keywords.split(",") if k.strip()]
    if not keywords:
        return None
    lowered = f" {(answer_text or '').lower()} "
    hits = 0
    for kw in keywords:
        pattern = r"\b" + re.escape(kw.lower()) + r"\b"
        if re.search(pattern, lowered):
            hits += 1
    return round((hits / len(keywords)) * 100)


def communication_signal_summary(
    filler_word_count: Optional[int],
    words_per_minute: Optional[int],
    word_count: int,
    grammar_issue_count: Optional[int] = None,
    pronunciation_confidence: Optional[int] = None,
) -> str:
    """One-line, human-readable read on the speech metrics — used to
    fold real computed signals into the AI scoring prompt instead of
    the AI guessing communication quality from text content alone."""
    parts: list[str] = []
    if word_count == 0:
        return "no answer given"
    if filler_word_count is not None:
        ratio = filler_word_count / max(word_count, 1)
        if ratio > 0.08:
            parts.append(f"heavy filler-word use ({filler_word_count} filler words)")
        elif filler_word_count > 0:
            parts.append(f"light filler-word use ({filler_word_count} filler words)")
        else:
            parts.append("no filler words detected")
    if words_per_minute is not None:
        if words_per_minute < 90:
            parts.append(f"slow pace ({words_per_minute} wpm)")
        elif words_per_minute > 180:
            parts.append(f"very fast pace ({words_per_minute} wpm)")
        else:
            parts.append(f"good pace ({words_per_minute} wpm)")
    if grammar_issue_count is not None:
        parts.append("no grammar issues flagged" if grammar_issue_count == 0 else f"{grammar_issue_count} grammar issue(s) flagged")
    if pronunciation_confidence is not None:
        if pronunciation_confidence < 60:
            parts.append(f"low speech-recognition confidence ({pronunciation_confidence}%, may indicate unclear pronunciation)")
        else:
            parts.append(f"clear speech recognition confidence ({pronunciation_confidence}%)")
    return ", ".join(parts) if parts else "no speech metrics available"
