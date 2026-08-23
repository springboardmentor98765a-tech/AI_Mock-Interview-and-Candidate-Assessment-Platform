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


# --------------------------------------------------------------------------
# Module 5 — communication analysis
# --------------------------------------------------------------------------


class GrammarIssue(BaseModel):
    """
    One grammatical problem, anchored to the words that caused it.

    `excerpt` is mandatory and must be text the candidate actually said. An
    issue with nothing to point at is unreviewable — the candidate cannot tell
    whether the model found a real mistake or invented one.
    """

    excerpt: str = Field(description="The exact phrase from the transcript, quoted verbatim.")
    issue: str = Field(description="What is wrong with it, in one short sentence.")
    suggestion: str = Field(description="The corrected phrasing.")


class CommunicationAssessment(BaseModel):
    """
    The AI-judgement half of Module 5.

    Everything here is an opinion, not a measurement, and the API labels it as
    such. There is deliberately no number on this model: the qualitative notes
    and the scored rubric are produced by separate calls (see
    `score_answer` / AnswerScore), so a communication outage costs the notes
    without silently changing anyone's score.
    """

    grammar_issues: List[GrammarIssue] = Field(
        default_factory=list,
        description="Empty when the answer is grammatically sound. Do not pad it.",
    )
    clarity: str = Field(description="How clearly the point came across, one or two sentences.")
    structure: str = Field(description="Whether the answer had a beginning, middle and end.")
    conciseness: str = Field(description="Whether it rambled or was too terse.")
    strengths: List[str] = Field(default_factory=list, description="What the candidate did well.")
    improvements: List[str] = Field(
        default_factory=list, description="Specific, actionable changes for next time."
    )


class AnswerScore(BaseModel):
    """
    Module 6 — the interview scoring rubric.

    Unlike CommunicationAssessment, this IS a graded judgement: each axis is
    0-100 against the platform's fixed rubric (communication 30%, confidence
    25%, technical relevance 30%, professionalism 15%), combined by
    app.services.scoring into the interview's overall score. It is still an
    AI opinion of one answer, not a certified evaluation — the API and UI
    both say so wherever the number is shown.
    """

    communication: int = Field(
        ge=0, le=100, description="Grammar, clarity and structure of the answer."
    )
    confidence: int = Field(
        ge=0,
        le=100,
        description=(
            "How assured and decisive the delivery sounds — directness, hedging "
            "language, filler use. Judged from the transcript, not the audio."
        ),
    )
    technical_relevance: int = Field(
        ge=0,
        le=100,
        description=(
            "How directly and how thoroughly the content answers the specific "
            "question asked, for the stated role and difficulty."
        ),
    )
    professionalism: int = Field(
        ge=0, le=100, description="Tone and interview-appropriate language."
    )
    rationale: str = Field(
        description="One or two sentences justifying the four scores together."
    )


class PronunciationNotes(BaseModel):
    """
    Listening notes on the recording itself.

    Intentionally qualitative. Real pronunciation scoring needs phoneme-level
    forced alignment against a reference, which this platform does not do — so
    the honest output is "here is what was hard to catch", not a number
    dressed up as a measurement.
    """

    intelligibility: str = Field(
        description=(
            "One of: clear, mostly clear, occasionally unclear, hard to follow. "
            "Judge only how easy the speech was to understand."
        )
    )
    unclear_words: List[str] = Field(
        default_factory=list,
        description="Specific words that were hard to make out. Empty if none were.",
    )
    notes: str = Field(
        description="Brief observations on articulation, volume and delivery. No score."
    )


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


COMMUNICATION_SYSTEM_PROMPT = (
    "You are a communication coach reviewing one spoken interview answer. "
    "You are given a transcript of speech, not written prose — so ignore "
    "missing punctuation and capitalisation, which are artefacts of "
    "transcription rather than mistakes the candidate made. "
    "Judge only what was said. Never invent a quotation: every excerpt you "
    "give must appear verbatim in the transcript. If the answer is "
    "grammatically sound, return an empty list rather than manufacturing an "
    "issue to look thorough. Do not evaluate whether the answer is factually "
    "correct or a good interview answer — only how it was communicated."
)

SCORE_SYSTEM_PROMPT = (
    "You are an interview assessor grading one spoken interview answer against "
    "a fixed rubric. Score each of four dimensions from 0 to 100: "
    "communication is grammar, clarity and structure; confidence is how "
    "assured and decisive the delivery sounds — penalise hedging and filler "
    "language, reward directness; technical_relevance is how directly and how "
    "thoroughly the content answers the specific question asked for the "
    "stated role and difficulty; professionalism is tone and "
    "interview-appropriate language. Grade only this answer as given — do not "
    "reward length for its own sake, and do not invent facts about the "
    "candidate. An empty, silent or off-topic answer should score low on "
    "technical_relevance and confidence rather than being refused."
)

PRONUNCIATION_SYSTEM_PROMPT = (
    "You are listening to a recording of one spoken interview answer. Report "
    "only how intelligible the speech was: articulation, pace of delivery, "
    "volume, and any specific words that were hard to make out. "
    "Do not assess accent, and do not treat a regional or non-native accent as "
    "a defect — an accent is not a pronunciation problem. Do not score the "
    "speaker, and do not comment on the content of the answer."
)


def communication_prompt(*, question: str, transcript: str) -> str:
    return (
        "Review how this answer was communicated.\n\n"
        f"QUESTION ASKED:\n{question}\n\n"
        f"TRANSCRIPT OF THE SPOKEN ANSWER:\n{transcript}\n\n"
        "Give clarity, structure and conciseness as short observations. List "
        "grammar issues only where the phrasing is genuinely wrong, quoting the "
        "candidate's own words. Strengths and improvements should be specific "
        "to this answer — generic advice that would fit any answer is useless."
    )


def score_prompt(
    *, question: str, transcript: str, interview_type: str, domain: str, difficulty: str
) -> str:
    return (
        "Grade this interview answer.\n\n"
        f"INTERVIEW TYPE: {interview_type}\n"
        f"ROLE / DOMAIN: {domain}\n"
        f"DIFFICULTY: {difficulty}\n\n"
        f"QUESTION ASKED:\n{question}\n\n"
        f"TRANSCRIPT OF THE SPOKEN ANSWER:\n{transcript}\n\n"
        "Score communication, confidence, technical_relevance and "
        "professionalism from 0-100 each, and give one short rationale "
        "covering all four together."
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
