"""
ai_question_generator.py
==========================
Generates interview questions dynamically instead of pulling the same
fixed rows from the database every time.

Primary path: Google Gemini (free tier) - given the interview type,
domain, and difficulty, asks the model for a fresh, unique set of
questions each time.

Fallback path: if no GEMINI_API_KEY is configured, or the Gemini call
fails for any reason (network, quota, bad response), we fall back to a
local question bank. The bank itself is randomized and domain-aware
(templates are filled in with the requested domain and shuffled), so
even the fallback doesn't hand back the exact same list on every call.
"""

import json
import random
import re

from app.config import settings

# ---------------------------------------------------------------------------
# Gemini client (lazy-initialised so the app still boots with no API key)
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


def _build_prompt(interview_type: str, domain: str, difficulty: str, num_questions: int, resume_skills: list[str] = None) -> str:
    type_label = {
        "hr": "HR / general fit",
        "technical": "technical",
        "behavioral": "behavioral",
        "aptitude": "aptitude / logical reasoning",
    }.get(interview_type, interview_type)

    skills_instruction = ""
    if resume_skills:
        skills_list = ", ".join(resume_skills)
        skills_instruction = f"""
The candidate's resume lists these skills: {skills_list}.
Base the questions specifically on these skills - test real depth in
at least the top few, not just generic surface-level questions.
"""

    return f"""You are an expert interview panel generating a fresh set of
{type_label} interview questions.

Domain / role focus: {domain}
Difficulty level: {difficulty}
Number of questions required: {num_questions}
{skills_instruction}
Rules:
- Every question must be original and not a generic cliche repeated word-for-word each time.
- Vary phrasing and specific scenarios so two requests never return an identical set.
- Keep each question to a single sentence, clear and interview-appropriate.
- Match the difficulty level requested.
- For "technical" type, questions must be specific to the domain/skills given.
- For "aptitude" type, include quantitative/logical reasoning style questions.

Respond ONLY with a JSON array (no markdown, no commentary), where each
element is an object with exactly these keys:
  "question_text": string
  "category": short lowercase tag for the sub-topic (e.g. "arrays", "teamwork", "probability")

Return exactly {num_questions} objects.
"""


def _parse_gemini_response(raw_text: str, difficulty: str) -> list[dict]:
    # Strip markdown code fences if the model wrapped the JSON in them
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text.strip(), flags=re.MULTILINE)
    data = json.loads(cleaned)

    questions = []
    for item in data:
        text = str(item.get("question_text", "")).strip()
        category = str(item.get("category", "general")).strip().lower() or "general"
        if text:
            questions.append({
                "question_text": text,
                "category": category,
                "difficulty": difficulty,
            })
    return questions


def _generate_with_gemini(interview_type, domain, difficulty, num_questions, resume_skills=None):
    model = _get_gemini_model()
    if model is None:
        return None

    prompt = _build_prompt(interview_type, domain, difficulty, num_questions, resume_skills)

    try:
        response = model.generate_content(prompt)
        questions = _parse_gemini_response(response.text, difficulty)
        if len(questions) >= 1:
            return questions[:num_questions]
        return None
    except Exception:
        # Any failure (quota, network, malformed JSON, etc.) -> fall back
        return None


# ---------------------------------------------------------------------------
# Local fallback bank - randomized + domain-aware templates
# ---------------------------------------------------------------------------
_HR_TEMPLATES = {
    "easy": [
        "Tell me a little about yourself and what interests you about this role.",
        "Why do you want to work in {domain}?",
        "What are your greatest strengths?",
        "Where do you see yourself in three years?",
        "What do you know about our company?",
        "Why did you leave (or want to leave) your last position?",
        "What motivates you at work?",
    ],
    "medium": [
        "Describe a time you disagreed with a manager about {domain}-related work. How did you handle it?",
        "How do you prioritize tasks when everything feels urgent?",
        "What's a professional weakness you're actively working to improve?",
        "How do you handle feedback that feels unfair?",
        "Describe your ideal work environment in {domain}.",
        "Why should we hire you over another candidate for this {domain} role?",
    ],
    "hard": [
        "Tell me about a time you made a significant mistake in {domain} work. What did you learn?",
        "How would you handle being asked to do something you believe is ethically questionable?",
        "Describe a situation where you had to deliver difficult news to a stakeholder.",
        "How do you handle a team member who consistently underperforms?",
        "What would you do in your first 90 days in this {domain} role?",
    ],
}

_BEHAVIORAL_TEMPLATES = {
    "easy": [
        "Tell me about a time you worked well as part of a team.",
        "Describe a time you had to learn something new quickly for {domain}.",
        "Tell me about a goal you set and how you achieved it.",
        "Describe a time you helped a teammate solve a problem.",
    ],
    "medium": [
        "Tell me about a time you had to manage multiple deadlines in {domain} work.",
        "Describe a conflict you had with a coworker and how you resolved it.",
        "Tell me about a time you took initiative without being asked.",
        "Describe a time your plan for a {domain} project failed. What did you do next?",
    ],
    "hard": [
        "Tell me about a time you led a project through a major setback.",
        "Describe a time you had to influence someone senior to you without formal authority.",
        "Tell me about the hardest decision you've made in {domain} and its long-term impact.",
        "Describe a time you had to balance competing priorities from two stakeholders in {domain}.",
    ],
}

_APTITUDE_TEMPLATES = {
    "easy": [
        "If a train travels 60 km in 45 minutes, what is its speed in km/h?",
        "Find the next number in the series: 2, 4, 8, 16, __?",
        "A shopkeeper sells an item for 120 after a 20% profit. What was the cost price?",
        "If today is Tuesday, what day will it be after 17 days?",
    ],
    "medium": [
        "A can complete a task in 6 days, B in 8 days. How long will they take together?",
        "In a class of 40 students, 60% are girls. How many boys are there?",
        "Find the missing number: 3, 7, 15, 31, __?",
        "If the ratio of two numbers is 3:5 and their sum is 96, find the numbers.",
    ],
    "hard": [
        "A boat travels 30 km downstream in 2 hours and returns upstream in 3 hours. Find the speed of the boat in still water.",
        "In how many ways can 5 people be seated around a circular table?",
        "A pipe fills a tank in 4 hours; another empties it in 6 hours. If both are open, how long to fill the tank?",
        "Find the probability of drawing two aces in a row from a standard deck without replacement.",
    ],
}

# Generic technical fallback templates, filled in with the requested domain
_TECHNICAL_TEMPLATES = {
    "easy": [
        "What are the core data types you commonly use in {domain}, and when would you choose each?",
        "Explain, in simple terms, what {domain} is used for in a real project.",
        "What's the difference between a compiler and an interpreter, in the context of {domain}?",
        "Name one best practice you always follow when writing {domain} code, and why.",
    ],
    "medium": [
        "Walk me through how you would debug a performance issue in a {domain} application.",
        "Explain the difference between synchronous and asynchronous execution in {domain}.",
        "How would you design a simple database schema for a small {domain} project?",
        "What's a common pitfall developers run into with {domain}, and how do you avoid it?",
    ],
    "hard": [
        "How would you scale a {domain} system to handle 10x its current traffic?",
        "Explain a trade-off you'd consider when choosing between two architectural approaches in {domain}.",
        "Describe how you'd design {domain} code to be testable and maintainable long-term.",
        "How would you approach optimizing a slow database query in a {domain} system?",
    ],
}

_TEMPLATE_BANKS = {
    "hr": _HR_TEMPLATES,
    "behavioral": _BEHAVIORAL_TEMPLATES,
    "aptitude": _APTITUDE_TEMPLATES,
    "technical": _TECHNICAL_TEMPLATES,
}


def _generate_locally(interview_type, domain, difficulty, num_questions, resume_skills=None):
    bank = _TEMPLATE_BANKS.get(interview_type, _TECHNICAL_TEMPLATES)
    pool = list(bank.get(difficulty, bank.get("medium", [])))

    # Pull in a few from neighboring difficulties too, so there's always
    # enough variety even if a bank is short, and so repeated requests
    # for the same difficulty don't always return the identical set.
    for other_difficulty, questions in bank.items():
        if other_difficulty != difficulty:
            pool.extend(questions)

    random.shuffle(pool)

    # If the candidate has resume skills and this is a technical interview,
    # rotate the {domain} placeholder through their actual skills instead
    # of repeating the same domain string in every question.
    fill_values = resume_skills if (resume_skills and interview_type == "technical") else [domain]

    selected = pool[:num_questions]

    # If still short (very high num_questions), cycle through with reshuffled repeats
    while len(selected) < num_questions:
        random.shuffle(pool)
        selected.extend(pool[: num_questions - len(selected)])

    questions = []
    for i, text in enumerate(selected):
        fill = fill_values[i % len(fill_values)]
        category_base = fill.lower().replace(" ", "-").replace(".", "") or interview_type
        questions.append({
            "question_text": text.format(domain=fill),
            "category": category_base,
            "difficulty": difficulty,
        })
    return questions


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def generate_questions(
    interview_type: str,
    domain: str,
    difficulty: str,
    num_questions: int,
    resume_skills: list[str] = None,
) -> list[dict]:
    """
    Returns a list of dicts: [{"question_text", "category", "difficulty"}, ...]
    Tries Gemini first (if configured), falls back to the local randomized
    bank on any failure so interview generation never hard-fails.

    resume_skills, if provided, biases question content toward the
    candidate's actual resume skills (mainly relevant for technical
    interviews).
    """
    questions = _generate_with_gemini(interview_type, domain, difficulty, num_questions, resume_skills)

    if not questions:
        questions = _generate_locally(interview_type, domain, difficulty, num_questions, resume_skills)

    return questions
