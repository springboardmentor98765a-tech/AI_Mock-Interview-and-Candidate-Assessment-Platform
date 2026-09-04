"""Focused checks for the saved AI interview scoring calculation."""
from app.main import build_interview_scoring, get_performance_rating


def make_llm_scores(communication=80, professionalism=80, technical=(80, 80, 80)):
    return {
        "communication_analysis": {"score": communication, "components": {"speech_clarity": communication}},
        "professionalism_analysis": {"score": professionalism, "components": {"time_management": professionalism}},
        "question_assessments": [
            {"score": score, "components": {"technical_accuracy": score, "keyword_relevance": score,
                                                 "problem_solving": score, "domain_knowledge": score,
                                                 "answer_completeness": score}}
            for score in technical
        ],
    }


def main():
    monitoring = {"confidence_analysis": {"confidence_score": 80}}
    complete = build_interview_scoring(make_llm_scores(), monitoring, [])
    assert complete["technical_relevance_score"] == 80
    assert complete["overall_score"] == 80
    assert complete["performance_rating"] == "Good"

    technical_average = build_interview_scoring(make_llm_scores(technical=(80, 70, 90)), monitoring, [])
    assert technical_average["technical_relevance_score"] == 80

    assert get_performance_rating(90) == "Excellent"
    assert get_performance_rating(75) == "Good"
    assert get_performance_rating(60) == "Average"
    assert get_performance_rating(40) == "Needs Improvement"
    assert get_performance_rating(39) == "Poor"
    assert get_performance_rating(None) == "Not available"

    missing = build_interview_scoring({"question_assessments": [{"score": 120}]}, {}, [])
    assert missing["overall_score"] is None
    assert missing["technical_relevance_score"] is None
    assert missing["unavailable_categories"] == ["communication_score", "confidence_score", "technical_relevance_score", "professionalism_score"]
    print("Interview scoring tests passed: weighting, ratings, technical aggregation, and unavailable values.")


if __name__ == "__main__":
    main()
