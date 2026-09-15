"""Server-side MiMo integration for question generation and answer evaluation.

TTS and STT are handled by Sarvam AI (see services/sarvam.py).
The browser never receives MIMO_API_KEY.
"""
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import MIMO_API_KEY, MIMO_BASE_URL, MIMO_CHAT_MODEL


class MimoError(RuntimeError):
    pass


def configured() -> bool:
    return bool(MIMO_API_KEY)


def _chat(payload: dict) -> dict:
    if not configured():
        raise MimoError("MiMo is not configured. Add MIMO_API_KEY to server/.env and restart FastAPI.")
    body = json.dumps(payload).encode("utf-8")
    request = Request(
        f"{MIMO_BASE_URL}/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {MIMO_API_KEY}"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (401, 403):
            raise MimoError("MiMo credentials were rejected. Check MIMO_API_KEY in server/.env and restart FastAPI.") from error
        raise MimoError(f"MiMo request failed ({error.code}). Please try again shortly.") from error
    except URLError as error:
        raise MimoError("Could not reach the MiMo API.") from error


def _message_content(result: dict) -> str:
    try:
        return result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError) as error:
        raise MimoError("MiMo returned an unexpected response.") from error


def _json_content(result: dict) -> dict | list:
    content = _message_content(result)
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE)
    try:
        return json.loads(content)
    except json.JSONDecodeError as error:
        raise MimoError("MiMo returned invalid structured interview data.") from error


def generate_questions(interview_type: str, difficulty: str, domain: str | None, skills: list[str], count: int) -> list[dict]:
    prompt = (
        "Generate a realistic mock interview. Return ONLY a JSON array with exactly "
        f"{count} objects, each with question_text and category. Interview type: {interview_type}. "
        f"Difficulty: {difficulty}. Domain: {domain or 'general'}. Resume skills: {', '.join(skills) or 'none'}. "
        "Questions must be concise, distinct, and safe for an interview."
    )
    data = _json_content(_chat({
        "model": MIMO_CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.5,
    }))
    if not isinstance(data, list):
        raise MimoError("MiMo did not return a question list.")
    questions = []
    for index, item in enumerate(data[:count], start=1):
        if not isinstance(item, dict) or not isinstance(item.get("question_text"), str):
            continue
        questions.append({
            "question_text": item["question_text"].strip(),
            "category": str(item.get("category") or interview_type.title()),
            "difficulty": difficulty,
            "sequence_no": index,
        })
    if not questions:
        raise MimoError("MiMo did not return usable questions.")
    return questions


def evaluate_answer(question: str, category: str, difficulty: str, answer: str) -> dict:
    prompt = (
        "You are an objective mock-interview evaluator. Evaluate the candidate answer against the question. "
        "Return ONLY JSON with score (0-100), feedback (2 concise sentences), strengths (array), and improvements (array). "
        f"Question: {question}\nCategory: {category}\nDifficulty: {difficulty}\nCandidate answer: {answer}"
    )
    data = _json_content(_chat({
        "model": MIMO_CHAT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2,
    }))
    if not isinstance(data, dict):
        raise MimoError("MiMo did not return an evaluation object.")
    score = max(0, min(100, float(data.get("score", 0))))
    feedback = str(data.get("feedback") or "No feedback returned.")
    return {"score": round(score, 2), "feedback": feedback, "strengths": data.get("strengths", []), "improvements": data.get("improvements", [])}
