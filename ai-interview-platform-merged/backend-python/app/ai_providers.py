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


def _extract_json_object(raw: str):
    """Like _extract_json, but ALWAYS looks for a top-level {...} object,
    never an array. Needed because _extract_json tries the array pattern
    first — which, for a response like {"test_cases": [...], ...}, would
    greedily match just the test_cases array and silently return that
    instead of the full object."""
    if not raw:
        return None
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text.strip()).strip()
    m = _JSON_OBJECT_RE.search(text)
    if m:
        try:
            return json.loads(m.group(0))
        except (json.JSONDecodeError, ValueError):
            pass
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


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
) -> Optional[list[dict]]:
    """Asks the LLM chain for `count` fresh interview questions.
    Returns a list of {"text","category","difficulty"} dicts, or None
    if every provider failed / returned unusable output."""
    domain_clause = f" in the {domain} domain" if domain and category == "Technical" else ""
    prompt = (
        f"You are an expert technical interviewer. Generate exactly {count} unique, "
        f"non-repetitive {difficulty}-difficulty {category} interview questions for a "
        f'candidate applying for a "{interview_type}" role{domain_clause}. '
        "Vary the phrasing and topics so no two questions are similar. "
        'Respond with ONLY a raw JSON array, no markdown, no commentary, in this exact '
        'shape: [{"text": "..."}, {"text": "..."}]'
    )
    raw = _call_llm_chain(prompt)
    parsed = _extract_json(raw) if raw else None
    if not isinstance(parsed, list):
        return None

    questions = []
    for item in parsed:
        text = None
        if isinstance(item, str):
            text = item.strip()
        elif isinstance(item, dict):
            text = str(item.get("text") or item.get("question") or "").strip()
        if text:
            questions.append({"text": text, "category": category, "difficulty": difficulty})

    if not questions:
        return None
    random.shuffle(questions)
    return questions[:count]


# =================================================================
# Public API — Coding Practice question generation
# =================================================================
def generate_coding_question_llm(
    role: str,
    language: str,
    language_display_name: str,
    difficulty: str = "medium",
    attempts: int = 2,
) -> Optional[dict]:
    """Asks Gemini (specifically — per product decision, not the full
    ollama/gemini/openai/grok chain used for interview questions) for
    one fresh, original stdin/stdout coding problem, complete with a
    reference solution and test cases.

    Self-validation: the reference solution is actually RUN through
    judge.py against the generated test cases before this function
    returns anything. If it doesn't pass 100% of its own test cases —
    i.e. the LLM hallucinated an inconsistent problem — the attempt is
    discarded and retried, up to `attempts` times. This guarantees a
    candidate is never scored against broken/wrong test cases.

    Returns None if every attempt fails (no Gemini key configured,
    network down, or repeated hallucination) — callers fall back to
    the curated, hand-verified bank in coding_bank.py so the feature
    keeps working with zero API keys configured.
    """
    from app.judge import run_submission  # local import: keeps ai_providers/judge decoupled

    prompt = (
        f"You are creating an ORIGINAL {difficulty}-difficulty coding practice problem for a "
        f'candidate applying for a "{role}" role, to be solved in {language_display_name}. '
        "The problem must be solvable by reading input from standard input (stdin) and writing "
        "the answer to standard output (stdout) only — no function signatures or class scaffolding "
        "beyond whatever the language requires to read stdin/write stdout. "
        "Invent a fresh, specific scenario with concrete constraints; do not copy a famous named "
        "problem verbatim, though the underlying concept can be a common one (arrays, strings, "
        "loops, basic math, simple data structures). "
        "Respond with ONLY raw JSON (no markdown fences, no commentary) in exactly this shape:\n"
        '{"title": "short title", '
        '"prompt": "2-5 sentences describing the problem, the exact input format, and the exact '
        'output format, precise enough that input/output are unambiguous", '
        '"test_cases": [{"input": "...", "expected_output": "..."}, ...] with AT LEAST 4 cases '
        "covering normal cases and edge cases, "
        f'"reference_solution": "a complete, correct {language_display_name} program that reads '
        'the described input and prints the described output exactly — this is the answer key, '
        'used only for grading and NEVER shown to the candidate", '
        f'"starter_code": "a {language_display_name} boilerplate shown to the CANDIDATE — it must '
        "contain ONLY input-reading and output-writing scaffolding plus a comment marking where to "
        'write the solution (e.g. \\"// TODO: write your solution here\\"). It must NOT contain any '
        'part of the actual solution logic."}\n'
        "The input/output format must agree exactly across test_cases, reference_solution, and "
        "starter_code (same structure, same whitespace conventions)."
    )

    for _ in range(max(1, attempts)):
        raw = _call_gemini(prompt)
        parsed = _extract_json_object(raw) if raw else None
        if not isinstance(parsed, dict):
            continue

        title = str(parsed.get("title") or "").strip()
        problem_prompt = str(parsed.get("prompt") or "").strip()
        reference_solution = str(parsed.get("reference_solution") or "").strip()
        starter_code = str(parsed.get("starter_code") or "").strip()
        test_cases = parsed.get("test_cases")

        if not (title and problem_prompt and reference_solution and starter_code):
            continue
        if not isinstance(test_cases, list) or len(test_cases) < 3:
            continue

        clean_cases = []
        for tc in test_cases:
            if not isinstance(tc, dict):
                continue
            tc_input = tc.get("input")
            tc_output = tc.get("expected_output")
            if tc_input is None or tc_output is None:
                continue
            clean_cases.append({"input": str(tc_input), "expected_output": str(tc_output)})
        if len(clean_cases) < 3:
            continue

        # Heuristic guard: if the model handed the candidate the answer
        # key as "starter code", that's a failed generation, not a
        # usable one — discard and retry.
        if starter_code.strip() == reference_solution.strip():
            continue

        # The real check: does the reference solution actually pass its
        # own test cases when run through the exact same judge a
        # candidate's submission will go through?
        try:
            result = run_submission(language, reference_solution, clean_cases)
        except Exception:
            continue
        if not result.compiled or result.passed_count != result.total_count or result.total_count == 0:
            continue

        return {
            "title": title,
            "difficulty": difficulty,
            "prompt": problem_prompt,
            "test_cases": clean_cases,
            "starter_code": starter_code,
        }

    return None
# =================================================================
# Public API — Module 5 grammar checking (see app/communication_analysis.py
# for filler-word/pace/pronunciation, which don't need an LLM)
# =================================================================
def analyze_grammar_llm(text: str) -> Optional[dict]:
    """Returns {"issue_count": int, "feedback": str} or None if every
    provider is unavailable/failed — caller falls back to a cheap
    offline heuristic so grammar checking never blocks answer-saving."""
    if not text or not text.strip():
        return None

    prompt = (
        "Review this interview answer transcript for grammar and phrasing "
        "issues only (ignore content/correctness). Respond with ONLY raw JSON, "
        'no markdown, in this exact shape: {"issue_count": 0-10, "feedback": '
        '"one short, specific, constructive sentence about the grammar/phrasing"}.\n\n'
        f"Transcript:\n{text.strip()}"
    )
    raw = _call_llm_chain(prompt)
    parsed = _extract_json_object(raw) if raw else None
    if not isinstance(parsed, dict) or "issue_count" not in parsed:
        return None
    try:
        issue_count = max(0, min(10, int(parsed["issue_count"])))
    except (TypeError, ValueError):
        return None
    feedback = str(parsed.get("feedback") or "").strip() or "No specific grammar feedback returned."
    return {"issue_count": issue_count, "feedback": feedback}


def _clamp(value, lo, hi):
    try:
        value = int(round(float(value)))
    except (TypeError, ValueError):
        return lo
    return max(lo, min(hi, value))


def score_interview_llm(interview_type: str, qa_pairs: list[dict]) -> Optional[dict]:
    """qa_pairs: [{"question","category","answer"}, ...]. Returns a dict
    with the legacy 4 skill sub-scores (kept for backward compatibility
    with existing UI/reports) PLUS Module 7's skill_professionalism and
    a structured 5-part feedback breakdown, or None if every provider
    failed / no answers were substantive enough to score."""
    answered = [p for p in qa_pairs if (p.get("answer") or "").strip()]
    if not answered:
        return None

    transcript = "\n\n".join(
        f'Q{i+1} ({p.get("category", "General")}): {p["question"]}\nCandidate answer: {p["answer"].strip()}'
        for i, p in enumerate(qa_pairs)
    )
    prompt = (
        f'You are grading a mock interview transcript for a "{interview_type}" role, using this '
        "rubric — score each category based only on what the candidate actually said (an unanswered "
        "question should pull the relevant scores down, not be ignored):\n"
        "- skill_communication (0-100): speech clarity, grammar quality, response completeness as written.\n"
        "- skill_confidence (0-100): how confident and assured the answers read (hedging, hesitation "
        "language, decisiveness) — text-only signal, not eye contact.\n"
        "- skill_technical (0-100, 'Technical Relevance'): technical accuracy, keyword relevance, "
        "problem-solving ability, domain knowledge, answer completeness.\n"
        "- skill_professionalism (0-100): response organization and professional tone/language.\n"
        "- skill_problem_solving (0-100): legacy field, same meaning as before.\n\n"
        "Respond with ONLY raw JSON, no markdown, in exactly this shape:\n"
        '{"score": 0-100, "skill_communication": 0-100, "skill_technical": 0-100, '
        '"skill_confidence": 0-100, "skill_problem_solving": 0-100, "skill_professionalism": 0-100, '
        '"ai_feedback": "2-4 sentences of specific, constructive feedback referencing their actual answers", '
        '"feedback": {'
        '"strengths": ["1-3 short, specific strengths"], '
        '"weaknesses": ["1-3 short, specific weaknesses"], '
        '"improvements": ["1-3 short, actionable improvement suggestions"], '
        '"practice_recommendations": ["1-3 short practice suggestions"], '
        '"learning_resources": ["1-3 short resource/topic suggestions to look up"]'
        "}}\n\n"
        f"Transcript:\n{transcript}"
    )
    raw = _call_llm_chain(prompt)
    parsed = _extract_json_object(raw) if raw else None
    if not isinstance(parsed, dict):
        return None

    try:
        result = {
            "score": _clamp(parsed.get("score"), 0, 100),
            "skill_communication": _clamp(parsed.get("skill_communication"), 0, 100),
            "skill_technical": _clamp(parsed.get("skill_technical"), 0, 100),
            "skill_confidence": _clamp(parsed.get("skill_confidence"), 0, 100),
            "skill_problem_solving": _clamp(parsed.get("skill_problem_solving"), 0, 100),
            "skill_professionalism": _clamp(parsed.get("skill_professionalism"), 0, 100),
            "ai_feedback": str(parsed.get("ai_feedback") or "").strip()
            or "The AI grader scored your answers but did not return written feedback.",
        }
    except (TypeError, ValueError):
        return None

    feedback_raw = parsed.get("feedback")
    result["feedback"] = _clean_feedback_lists(feedback_raw) if isinstance(feedback_raw, dict) else None
    return result


def _clean_feedback_lists(raw: dict) -> dict:
    keys = ["strengths", "weaknesses", "improvements", "practice_recommendations", "learning_resources"]
    cleaned = {}
    for key in keys:
        items = raw.get(key)
        if isinstance(items, list):
            cleaned[key] = [str(x).strip() for x in items if str(x).strip()][:5]
        else:
            cleaned[key] = []
    return cleaned
