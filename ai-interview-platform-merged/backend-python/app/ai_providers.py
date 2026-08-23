"""
Multi-provider AI engine — dynamic question generation + answer
scoring, with automatic fallback across providers.

Chain (configurable via AI_PROVIDER_ORDER in .env):

    ollama -> gemini (rotates across MULTIPLE keys) -> openai -> grok

Why this exists: a single Gemini API key hits Google's free-tier rate
limit fast, and once it does every "generate" call silently reuses
the same cached/last response, so candidates see repeated questions.
Rotating across several Gemini keys — and falling through to a
completely different provider if every Gemini key is exhausted —
keeps question generation fresh. If every provider fails (no network,
no keys configured, Ollama not running, etc.) callers fall back to
the curated question bank in question_bank.py, so the app still works
with zero API keys / zero setup.

Nothing here raises on failure — every public function returns None
on total failure so callers can fall back gracefully.
"""
import itertools
import json
import random
import re
import threading
from typing import Optional

import requests

from app import config

_JSON_ARRAY_RE = re.compile(r"\[[\s\S]*\]")
_JSON_OBJECT_RE = re.compile(r"\{[\s\S]*\}")

# Round-robins across configured Gemini keys so consecutive generate
# calls spread across keys instead of hammering key #1 every time.
_gemini_key_cycle_lock = threading.Lock()
_gemini_key_cycle = None


def _next_gemini_key_order() -> list[str]:
    """Returns all configured Gemini keys, starting from the next one
    in rotation (so load spreads round-robin across calls)."""
    global _gemini_key_cycle
    if not config.GEMINI_API_KEYS:
        return []
    with _gemini_key_cycle_lock:
        if _gemini_key_cycle is None:
            _gemini_key_cycle = itertools.cycle(range(len(config.GEMINI_API_KEYS)))
        start = next(_gemini_key_cycle)
    n = len(config.GEMINI_API_KEYS)
    order = [(start + i) % n for i in range(n)]
    return [config.GEMINI_API_KEYS[i] for i in order]


def _extract_json(raw: str):
    """LLMs love wrapping JSON in ```json fences or a sentence of
    preamble — pull out the first {...} or [...] block and parse it."""
    if not raw:
        return None
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    for pattern in (_JSON_ARRAY_RE, _JSON_OBJECT_RE):
        m = pattern.search(text)
        if m:
            try:
                return json.loads(m.group(0))
            except (json.JSONDecodeError, ValueError):
                continue
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


# =================================================================
# Per-provider callers — each takes a plain-text prompt, returns the
# model's raw text response, or None on any failure whatsoever.
# =================================================================
def _call_ollama(prompt: str) -> Optional[str]:
    try:
        resp = requests.post(
            f"{config.OLLAMA_BASE_URL}/api/generate",
            json={
                "model": config.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.9},
            },
            timeout=config.AI_REQUEST_TIMEOUT,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data.get("response")
    except (requests.RequestException, ValueError):
        return None


def _call_gemini(prompt: str) -> Optional[str]:
    keys = _next_gemini_key_order()
    for key in keys:
        try:
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent",
                params={"key": key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.9},
                },
                timeout=config.AI_REQUEST_TIMEOUT,
            )
            if resp.status_code == 429:
                # This key is rate-limited — try the next configured key
                # before giving up on Gemini entirely.
                continue
            if resp.status_code != 200:
                continue
            data = resp.json()
            candidates = data.get("candidates") or []
            if not candidates:
                continue
            parts = candidates[0].get("content", {}).get("parts") or []
            text = "".join(p.get("text", "") for p in parts)
            if text:
                return text
        except (requests.RequestException, ValueError):
            continue
    return None


def _call_openai(prompt: str) -> Optional[str]:
    if not config.OPENAI_API_KEY:
        return None
    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {config.OPENAI_API_KEY}"},
            json={
                "model": config.OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.9,
            },
            timeout=config.AI_REQUEST_TIMEOUT,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None


def _call_grok(prompt: str) -> Optional[str]:
    if not config.GROK_API_KEY:
        return None
    try:
        resp = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {config.GROK_API_KEY}"},
            json={
                "model": config.GROK_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.9,
            },
            timeout=config.AI_REQUEST_TIMEOUT,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except (requests.RequestException, ValueError, KeyError, IndexError):
        return None


_PROVIDER_FN = {
    "ollama": _call_ollama,
    "gemini": _call_gemini,
    "openai": _call_openai,
    "grok": _call_grok,
}


def _call_llm_chain(prompt: str) -> Optional[str]:
    """Tries each configured provider in order; returns the first
    non-empty response. None if every provider in the chain failed."""
    for provider in config.AI_PROVIDER_ORDER:
        fn = _PROVIDER_FN.get(provider)
        if fn is None:
            continue
        result = fn(prompt)
        if result:
            return result
    return None


# =================================================================
# Public API — question generation
# =================================================================
def generate_questions_llm(
    interview_type: str,
    category: str,
    difficulty: str,
    domain: Optional[str],
    count: int,
    exclude_texts: Optional[set] = None,
) -> Optional[list[dict]]:
    """Asks the LLM chain for `count` fresh interview questions.
    Returns a list of {"text","category","difficulty"} dicts, or None
    if every provider failed / returned unusable output."""
    domain_clause = f" in the {domain} domain" if domain and category == "Technical" else ""
    # Tell the model what this candidate has already been asked (across
    # their past sessions) so a fresh /generate call doesn't hand them
    # the same questions again. Capped so the prompt doesn't grow
    # unbounded for a candidate with a long history.
    avoid_clause = ""
    if exclude_texts:
        sample = list(exclude_texts)[:25]
        avoid_list = "\n".join(f"- {t}" for t in sample)
        avoid_clause = (
            "\n\nDo NOT repeat or closely paraphrase any of these questions this "
            f"candidate has already been asked before:\n{avoid_list}"
        )
    prompt = (
        f"You are an expert technical interviewer. Generate exactly {count} unique, "
        f"non-repetitive {difficulty}-difficulty {category} interview questions for a "
        f'candidate applying for a "{interview_type}" role{domain_clause}. '
        "Vary the phrasing and topics so no two questions are similar."
        f"{avoid_clause}\n\n"
        "For each question, also give 3-6 short keywords/key concepts a strong answer "
        "should mention (used later to check answer relevance — not shown to the candidate).\n\n"
        'Respond with ONLY a raw JSON array, no markdown, no commentary, in this exact '
        'shape: [{"text": "...", "keywords": ["...", "..."]}]'
    )
    raw = _call_llm_chain(prompt)
    parsed = _extract_json(raw) if raw else None
    if not isinstance(parsed, list):
        return None

    questions = []
    for item in parsed:
        text = None
        keywords: list[str] = []
        if isinstance(item, str):
            text = item.strip()
        elif isinstance(item, dict):
            text = str(item.get("text") or item.get("question") or "").strip()
            raw_keywords = item.get("keywords") or []
            if isinstance(raw_keywords, list):
                keywords = [str(k).strip() for k in raw_keywords if str(k).strip()][:6]
        if text:
            questions.append({"text": text, "category": category, "difficulty": difficulty, "keywords": keywords})

    if not questions:
        return None
    random.shuffle(questions)
    return questions[:count]


# =================================================================
# Public API — answer scoring
# =================================================================
def _clamp(value, lo, hi):
    try:
        value = int(round(float(value)))
    except (TypeError, ValueError):
        return lo
    return max(lo, min(hi, value))


def score_interview_llm(interview_type: str, qa_pairs: list[dict]) -> Optional[dict]:
    """qa_pairs: [{"question","category","answer"}, ...]. Returns a dict
    matching question_bank.generate_assessment()'s shape (score +
    4 skill sub-scores + ai_feedback), or None if every provider
    failed / no answers were substantive enough to score."""
    answered = [p for p in qa_pairs if (p.get("answer") or "").strip()]
    if not answered:
        return None

    transcript = "\n\n".join(
        f'Q{i+1} ({p.get("category", "General")}): {p["question"]}\n'
        f'Candidate answer: {p["answer"].strip()}\n'
        f'Expected keywords: {p.get("expected_keywords") or "n/a"}\n'
        f'Keyword coverage (measured, not self-reported): {p.get("keyword_match", "n/a")}\n'
        f'Speech delivery signal (measured, not self-reported): {p.get("speech_signal", "n/a")}'
        for i, p in enumerate(qa_pairs)
    )
    prompt = (
        f'You are grading a mock interview transcript for a "{interview_type}" role. '
        "Score the candidate fairly based on what they actually said, and factor the "
        "measured speech delivery signal (filler-word usage, speaking pace) into the "
        "communication sub-score specifically, and the measured keyword coverage into "
        "the technical/problem-solving sub-score specifically — both are real measured "
        "data, not a guess. "
        "An unanswered question should pull the relevant skill scores down, not be ignored. "
        "Respond with ONLY raw JSON, no markdown, in this exact shape:\n"
        '{"score": 0-100, "skill_communication": 0-100, "skill_technical": 0-100, '
        '"skill_confidence": 0-100, "skill_problem_solving": 0-100, '
        '"ai_feedback": "2-4 sentences of specific, constructive feedback referencing their actual answers"}\n\n'
        f"Transcript:\n{transcript}"
    )
    raw = _call_llm_chain(prompt)
    parsed = _extract_json(raw) if raw else None
    if not isinstance(parsed, dict):
        return None

    try:
        result = {
            "score": _clamp(parsed.get("score"), 0, 100),
            "skill_communication": _clamp(parsed.get("skill_communication"), 0, 100),
            "skill_technical": _clamp(parsed.get("skill_technical"), 0, 100),
            "skill_confidence": _clamp(parsed.get("skill_confidence"), 0, 100),
            "skill_problem_solving": _clamp(parsed.get("skill_problem_solving"), 0, 100),
            "ai_feedback": str(parsed.get("ai_feedback") or "").strip()
            or "The AI grader scored your answers but did not return written feedback.",
        }
    except (TypeError, ValueError):
        return None
    return result
