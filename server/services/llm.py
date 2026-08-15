"""LLM chat service: Deepseek V4 Flash (AICredits.in) primary → MiMo fallback.

Used for answer evaluation and question generation.
"""
import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from config import (

    AICREDITS_API_KEY,
    AICREDITS_BASE_URL,
    AICREDITS_MODEL,
    MIMO_API_KEY,
    MIMO_BASE_URL,
    MIMO_CHAT_MODEL,
    GEMINI_RESUME_KEY,
    GEMINI_RESUME_KEY_2,
    GEMINI_QUESTION_KEY,
    GEMINI_QUESTION_KEY_2,
    GEMINI_QUESTION_MODEL,
    GEMINI_QUESTION_MODEL_2,
    GEMINI_QUIZ_KEY,
    GEMINI_QUIZ_KEY_2,
    GEMINI_API_KEY,
    GEMINI_MODEL,
)


class LLMError(RuntimeError):
    pass


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 60) -> dict:
    req_headers = {"User-Agent": "SmartHireAI/1.0 (Windows NT 10.0; Win64; x64)"}
    req_headers.update(headers)
    body = json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers=req_headers, method="POST")
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _gemini_chat(prompt: str, is_resume: bool = False, is_quiz: bool = False) -> dict | list:
    if is_quiz:
        key_tuples = [
            (GEMINI_QUIZ_KEY, "gemini-2.0-flash"),
            (GEMINI_QUIZ_KEY_2, "gemini-2.0-flash-lite"),
        ]
    elif is_resume:
        key_tuples = [
            (GEMINI_RESUME_KEY, "gemini-3.5-flash-lite"),
            (GEMINI_RESUME_KEY_2, "gemini-3.1-flash-lite"),
        ]
    else:
        key_tuples = [
            (GEMINI_QUESTION_KEY, GEMINI_QUESTION_MODEL or "gemini-3.6-flash"),
            (GEMINI_QUESTION_KEY_2, GEMINI_QUESTION_MODEL_2 or "gemini-3.5-flash"),
        ]
    errors = []
    for key, model in key_tuples:
        if not key:
            continue
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        try:
            res = _post_json(url, payload, {"Content-Type": "application/json"}, timeout=30)
            text_out = res["candidates"][0]["content"]["parts"][0]["text"].strip()
            clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", text_out, flags=re.IGNORECASE)
            return json.loads(clean_json)
        except Exception as e:
            errors.append(f"Gemini({model}/{key[:10]}...): {e}")

    raise LLMError("Gemini error: " + "; ".join(errors))



def _aicredits_chat(payload: dict) -> dict:
    if not AICREDITS_API_KEY:
        raise LLMError("AICredits is not configured.")
    p = dict(payload)
    p["model"] = AICREDITS_MODEL
    return _post_json(
        f"{AICREDITS_BASE_URL}/chat/completions",
        p,
        {"Content-Type": "application/json", "Authorization": f"Bearer {AICREDITS_API_KEY}"},
    )


def _mimo_chat(payload: dict) -> dict:
    if not MIMO_API_KEY:
        raise LLMError("MiMo is not configured.")
    p = dict(payload)
    p["model"] = MIMO_CHAT_MODEL
    return _post_json(
        f"{MIMO_BASE_URL}/chat/completions",
        p,
        {"Content-Type": "application/json", "Authorization": f"Bearer {MIMO_API_KEY}"},
    )


def _extract_content(result: dict) -> str:
    try:
        msg = result["choices"][0]["message"]
        content = msg.get("content")
        if content:
            return content.strip()
        reasoning = msg.get("reasoning")
        if reasoning:
            return reasoning.strip()
        raise LLMError("Empty model response.")
    except (KeyError, IndexError, AttributeError) as error:
        raise LLMError("Unexpected model response.") from error


def _json_content(result: dict):
    content = _extract_content(result)
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE)
    try:
        return json.loads(content)
    except json.JSONDecodeError as error:
        raise LLMError("Model returned invalid JSON.") from error


def chat_json(payload: dict, is_resume: bool = False, is_quiz: bool = False) -> dict | list:
    """Send a chat request, trying Gemini API keys first, then Deepseek (AICredits), then MiMo."""
    errors = []

    # Extract user prompt string if available
    user_prompt = ""
    messages = payload.get("messages", [])
    if messages and isinstance(messages, list):
        user_prompt = messages[-1].get("content", "")

    if is_quiz:
        gemini_keys_available = bool(GEMINI_QUIZ_KEY or GEMINI_QUIZ_KEY_2)
    elif is_resume:
        gemini_keys_available = bool(GEMINI_RESUME_KEY or GEMINI_RESUME_KEY_2)
    else:
        gemini_keys_available = bool(GEMINI_QUESTION_KEY or GEMINI_QUESTION_KEY_2)

    if user_prompt and gemini_keys_available:
        try:
            return _gemini_chat(user_prompt, is_resume=is_resume, is_quiz=is_quiz)
        except Exception as e:
            errors.append(f"Gemini: {e}")


    if AICREDITS_API_KEY:
        try:
            return _json_content(_aicredits_chat(payload))
        except Exception as e:
            errors.append(f"AICredits: {e}")

    if MIMO_API_KEY:
        try:
            return _json_content(_mimo_chat(payload))
        except Exception as e:
            errors.append(f"MiMo: {e}")

    raise LLMError("No LLM provider available: " + "; ".join(errors))


def configured() -> bool:
    return bool(GEMINI_RESUME_KEY or GEMINI_RESUME_KEY_2 or GEMINI_QUESTION_KEY or GEMINI_QUESTION_KEY_2 or AICREDITS_API_KEY or MIMO_API_KEY)




def generate_questions(
    interview_type: str,
    difficulty: str,
    domain: str | None,
    skills: list[str],
    count: int,
    resume_context: dict | None = None,
) -> list[dict]:
    resume_prompt_part = ""
    if resume_context and isinstance(resume_context, dict):
        cand_name = resume_context.get("candidate_name", "Candidate")
        summary = resume_context.get("summary", "")
        projects = ", ".join(resume_context.get("projects", [])) or "None listed"
        exp = ", ".join(resume_context.get("experience", [])) or "None listed"
        edu = ", ".join(resume_context.get("education", [])) or "None listed"
        tech = ", ".join(resume_context.get("key_technologies", [])) or "None listed"
        res_skills = ", ".join(resume_context.get("skills", [])) or "None listed"

        if interview_type == "technical":
            round_instruction = (
                "Create technical questions specifically probing the projects, architecture decisions, database choices, "
                "frameworks, and programming concepts listed on the candidate's resume. Ask 'how' and 'why' questions about "
                "things they explicitly worked on (e.g. 'You mentioned building X using Y, how did you handle Z?')."
            )
        elif interview_type == "hr":
            round_instruction = (
                "Create HR interview questions probing the candidate's work history, internship experiences, career goals, "
                "achievements, teamwork, and key motivations based on their resume details."
            )
        elif interview_type == "behavioral":
            round_instruction = (
                "Create behavioral (STAR method) questions referencing specific situations, projects, internships, or "
                "team challenges mentioned on the candidate's resume (e.g. leadership, problem-solving, overcoming hurdles)."
            )
        else:
            round_instruction = "Create standard aptitude and analytical questions suitable for the target role."

        resume_prompt_part = (
            f"\n\nCANDIDATE RESUME CONTEXT ({cand_name}):\n"
            f"- Summary: {summary}\n"
            f"- Projects: {projects}\n"
            f"- Experience/Internships: {exp}\n"
            f"- Education: {edu}\n"
            f"- Technical Skills: {res_skills}, {tech}\n\n"
            f"ROUND TAILORING INSTRUCTION:\n{round_instruction}\n"
            "Generate questions that directly leverage this resume context where appropriate. Do NOT just repeat text; evaluate depth."
        )

    prompt = (
        "Generate a realistic mock interview. Return ONLY a JSON array with exactly "
        f"{count} objects, each with question_text and category. Interview type: {interview_type}. "
        f"Difficulty: {difficulty}. Domain: {domain or 'general'}. Skills: {', '.join(skills) or 'none'}."
        f"{resume_prompt_part}\n"
        "Questions must be concise, distinct, professional, and safe for an interview."
    )
    data = chat_json({
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.6,
    }, is_resume=bool(resume_context))

    if not isinstance(data, list):
        raise LLMError("Model did not return a question list.")
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
        raise LLMError("Model did not return usable questions.")
    return questions

