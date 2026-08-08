"""
Provider-neutral pieces: the error taxonomy, the output schemas, the prompts,
and the schema-strictness helper.

Nothing here imports a vendor SDK. Each provider module implements the same
small surface against these shared definitions.
"""

from typing import Any, Dict, List, Type

from pydantic import BaseModel, Field


class AIUnavailable(RuntimeError):
    """
    The provider could not answer. Callers fall back to the question bank.

    Subclassed so the API can tell the user *why* — "not configured",
    "quota exhausted" and "server unreachable" need different actions, and
    collapsing them sends people to check a key that is perfectly fine.
    """


class AINotConfigured(AIUnavailable):
    """No API key (cloud) or no base URL (local) is set."""


class AIQuotaExceeded(AIUnavailable):
    """The provider returned 429 / RESOURCE_EXHAUSTED. Retrying later works."""


class AIUnreachable(AIUnavailable):
    """The provider could not be contacted at all — typically a local server that is down."""


class GeneratedQuestion(BaseModel):
    question_text: str = Field(min_length=10)
    category: str = Field(min_length=2, max_length=80)


class GeneratedQuestionSet(BaseModel):
    questions: List[GeneratedQuestion]


def strict_json_schema(model: Type[BaseModel]) -> Dict[str, Any]:
    """
    A JSON schema with every property marked required.

    Constrained decoding only guarantees what the schema *demands*. Our response
    models give every field a default, so a plain `model_json_schema()` lets an
    empty `{}` be a perfectly legal answer — which is schema-valid and useless.
    Marking properties required forces the model to emit each one.
    """
    schema = model.model_json_schema()

    if "properties" in schema:
        schema["required"] = list(schema["properties"].keys())

    for definition in schema.get("$defs", {}).values():
        if definition.get("type") == "object" and "properties" in definition:
            definition["required"] = list(definition["properties"].keys())

    return schema


DIFFICULTY_GUIDANCE = {
    "EASY": (
        "Entry level. Definitions, self-description, and single-step reasoning. "
        "A recent graduate should be able to attempt every question."
    ),
    "MEDIUM": (
        "Mid level. Applied judgement, multi-step reasoning, and questions that "
        "require concrete examples from real experience."
    ),
    "HARD": (
        "Senior level. Trade-offs, failure modes, scale, ambiguity, and "
        "follow-up depth. Answers should be defensible under challenge."
    ),
}

TYPE_GUIDANCE = {
    "HR": (
        "Human-resources screening questions: motivation, background, notice period, "
        "expectations, culture fit. No technical content."
    ),
    "TECHNICAL": (
        "Role-specific technical questions that test hands-on competence in the domain. "
        "For non-engineering domains, ask about the tools and technical craft of that field."
    ),
    "BEHAVIORAL": (
        "Past-behaviour questions in the STAR style (Situation, Task, Action, Result). "
        "Must work for non-technical roles such as sales, HR and operations."
    ),
    "APTITUDE": (
        "MNC-style campus assessment questions: quantitative aptitude, logical reasoning, "
        "data interpretation and verbal ability. Self-contained and objectively answerable. "
        "These are general assessment questions and need not mention the domain."
    ),
}

QUESTION_SYSTEM_PROMPT = (
    "You are an experienced interview panellist writing questions for a mock "
    "interview platform. Return only questions — no answers, no numbering, no "
    "preamble. Each question must be self-contained and end with a question mark "
    "or an explicit instruction. Assign each question a short category label "
    "(1-3 words) describing what it assesses."
)

RESUME_SYSTEM_PROMPT = (
    "You extract structured data from résumés. Record only what the résumé "
    "actually states. Never invent an employer, job title, date, institution "
    "or grade. If a field is not present, leave it empty or null rather than "
    "guessing — an empty list is always better than a plausible fabrication. "
    "Do not infer seniority or skills the candidate has not claimed."
)


def question_prompt(*, interview_type: str, domain: str, difficulty: str, count: int) -> str:
    return (
        f"Write exactly {count} {interview_type} interview questions.\n\n"
        f"Role / domain: {domain}\n"
        f"Difficulty: {difficulty}\n\n"
        f"Interview type guidance: {TYPE_GUIDANCE.get(interview_type, '')}\n"
        f"Difficulty guidance: {DIFFICULTY_GUIDANCE.get(difficulty, '')}\n\n"
        "The questions must be clearly calibrated to the stated difficulty and "
        "specific to the stated role where the interview type calls for it. "
        "Do not repeat a question."
    )


def resume_prompt(resume_text: str) -> str:
    return (
        "Extract this résumé.\n\n"
        "- skills: professional and soft skills the candidate claims.\n"
        "- technologies: concrete tools, languages, frameworks, platforms.\n"
        "- total_experience_years: total professional experience in years as a "
        "number (0 if the candidate is a student or a fresher). Estimate from "
        "the employment dates; do not count internships as full-time unless the "
        "résumé presents them that way.\n"
        "- experience: one entry per employment role, most recent first. "
        "Education must NOT appear here.\n"
        "- education: one entry per qualification. Employers must NOT appear here.\n"
        "- summary: two or three sentences describing the candidate, written in "
        "the third person and based only on what the résumé says.\n\n"
        f"RÉSUMÉ TEXT:\n{resume_text}"
    )
