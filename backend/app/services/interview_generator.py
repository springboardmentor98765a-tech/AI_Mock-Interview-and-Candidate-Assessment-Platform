"""
Turns a generation request into saved questions.

Tries the AI provider first; on any failure drops to the built-in bank so the
endpoint always returns a usable interview. The caller can tell which happened
from `Interview.source`.
"""

import logging
from typing import List, Tuple

from app.models.interview import Difficulty, InterviewType, QuestionSource
from app.services import question_bank
from app.services.ai_provider import AIUnavailable, generate_questions

logger = logging.getLogger(__name__)

MIN_QUESTIONS = 1
MAX_QUESTIONS = 25


def build_questions(
    *,
    interview_type: InterviewType,
    domain: str,
    difficulty: Difficulty,
    count: int,
) -> Tuple[List[Tuple[str, str]], QuestionSource]:
    """
    Return ([(category, question_text), ...], source).

    Never raises for AI problems — that is the whole point of the fallback.
    """
    domain = domain.strip()

    try:
        generated = generate_questions(
            interview_type=interview_type.value,
            domain=domain,
            difficulty=difficulty.value,
            count=count,
        )
        pairs = [(q.category.strip(), q.question_text.strip()) for q in generated]

        # A short or empty AI response is worse than the bank — treat it as a miss.
        if len(pairs) < count:
            logger.info(
                "AI returned %d/%d questions; topping up from the bank.", len(pairs), count
            )
            filler = question_bank.get_questions(
                interview_type, difficulty, domain, count - len(pairs)
            )
            pairs.extend(filler)

        if pairs:
            return pairs[:count], QuestionSource.AI

        raise AIUnavailable("empty result")

    except AIUnavailable as exc:
        logger.info("Falling back to the built-in question bank: %s", exc)
        pairs = question_bank.get_questions(interview_type, difficulty, domain, count)
        return pairs, QuestionSource.FALLBACK
