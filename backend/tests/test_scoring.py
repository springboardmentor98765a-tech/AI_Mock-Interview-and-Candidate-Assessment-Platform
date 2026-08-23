"""
Module 6 — pure arithmetic over already-computed per-answer scores.

In-process unit tests: app.services.scoring makes no AI call and touches no
database, so there is nothing here that needs a running server.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import scoring  # noqa: E402


def _score(**overrides):
    axes = {"communication": 80, "confidence": 80, "technical_relevance": 80, "professionalism": 80}
    axes.update(overrides)
    return axes


class TestWeightedOverall:
    def test_uniform_axes_return_the_same_number(self):
        assert scoring.weighted_overall(_score()) == 80.0

    def test_weights_sum_to_one(self):
        assert round(sum(scoring.WEIGHTS.values()), 6) == 1.0

    def test_matches_the_spec_formula(self):
        # Overall = communication*0.30 + confidence*0.25 + technical_relevance*0.30
        #           + professionalism*0.15
        axes = {"communication": 100, "confidence": 0, "technical_relevance": 50, "professionalism": 20}
        expected = 100 * 0.30 + 0 * 0.25 + 50 * 0.30 + 20 * 0.15
        assert scoring.weighted_overall(axes) == round(expected, 1)

    def test_technical_relevance_and_communication_are_weighted_equally(self):
        """Both carry 30% — swapping their values must not change the result."""
        a = scoring.weighted_overall(_score(communication=90, technical_relevance=40))
        b = scoring.weighted_overall(_score(communication=40, technical_relevance=90))
        assert a == b


class TestRatingLabel:
    def test_boundaries_match_the_spec_rubric(self):
        assert scoring.rating_label(100) == "Excellent"
        assert scoring.rating_label(90) == "Excellent"
        assert scoring.rating_label(89.9) == "Good"
        assert scoring.rating_label(75) == "Good"
        assert scoring.rating_label(74.9) == "Average"
        assert scoring.rating_label(60) == "Average"
        assert scoring.rating_label(59.9) == "Needs Improvement"
        assert scoring.rating_label(40) == "Needs Improvement"
        assert scoring.rating_label(39.9) == "Poor"
        assert scoring.rating_label(0) == "Poor"


class TestAggregateScore:
    def test_averages_only_scored_answers(self):
        analyses = [
            {"available": True, "score": {"available": True, "overall": 80}},
            {"available": True, "score": {"available": True, "overall": 60}},
        ]
        assert scoring.aggregate_score(analyses) == 70.0

    def test_skipped_and_unscored_answers_are_excluded_not_zeroed(self):
        """
        A question never attempted, or scored, must not drag the average down
        as if it had been answered badly — it contributes nothing at all.
        """
        analyses = [
            {"available": True, "score": {"available": True, "overall": 90}},
            None,  # skipped
            {"available": False, "reason": "not transcribed"},  # analysed but no transcript
            {"available": True, "score": {"available": False, "reason": "provider down"}},
        ]
        assert scoring.aggregate_score(analyses) == 90.0

    def test_nothing_scored_returns_none_not_zero(self):
        analyses = [None, {"available": False, "reason": "skipped"}]
        assert scoring.aggregate_score(analyses) is None

    def test_empty_list_returns_none(self):
        assert scoring.aggregate_score([]) is None
