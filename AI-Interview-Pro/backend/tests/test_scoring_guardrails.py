from app.scoring import (
    analyze_answer,
    apply_answer_quality_guardrails,
    apply_speech_metrics,
)


def score_spoken(question, answer):
    scores = analyze_answer(question, answer, use_ai=False)
    scores = apply_speech_metrics(
        scores,
        filler_word_count=0,
        speaking_pace_wpm=66,
        pronunciation_score=85,
        word_count=scores["word_count"],
    )
    return apply_answer_quality_guardrails(scores, question, answer)


def test_explicit_unknown_cannot_receive_passing_score():
    result = score_spoken(
        "Explain synchronous and asynchronous execution in Python.",
        "i dont know",
    )
    assert result["overall_score"] < 20
    assert result["technical_score"] <= 5
    assert result["scoring_method"] == "heuristic_guarded"


def test_test_question_echo_cannot_be_rewarded_by_speech_clarity():
    result = score_spoken(
        "How would you scale a Java system to handle 10x its current traffic?",
        "how are you scale is our system ahead and current traffic",
    )
    assert result["overall_score"] < 35
    assert result["technical_score"] <= 15
    assert result["confidence_score"] <= 30


def test_substantive_answer_is_not_capped_as_an_echo():
    result = score_spoken(
        "Explain synchronous and asynchronous execution in Python.",
        "Synchronous code waits for each operation to finish. Asynchronous code uses async and await so other work can continue while an input or output operation is waiting.",
    )
    assert result["scoring_method"] == "heuristic"
    assert result["technical_score"] > 15


def test_asr_corrupted_python_question_echo_is_detected():
    result = score_spoken(
        "Walk me through how you would debug a performance issue in a Python application.",
        "walk me through how you would pick day Bhagya performance issue in a Python application",
    )
    assert result["overall_score"] < 20
    assert result["technical_score"] <= 2
    assert "repeats or closely paraphrases" in result["question_feedback"]


def test_asr_corrupted_compiler_question_echo_is_detected():
    result = score_spoken(
        "What's the difference between a compiler and an interpreter, in the context of PostgreSQL?",
        "what is difference between a compiler and inter better in the contest of postgray SQL",
    )
    assert result["overall_score"] < 20
    assert result["technical_score"] <= 2


def test_asr_corrupted_fastapi_question_echo_is_detected():
    result = score_spoken(
        "Name one best practice you always follow when writing FastAPI code, and why.",
        "name one Best package to always follow when right and fast if a good and why",
    )
    assert result["overall_score"] < 20
    assert result["technical_score"] <= 2
