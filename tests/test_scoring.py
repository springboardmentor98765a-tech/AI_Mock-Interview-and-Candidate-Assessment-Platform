import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services import scoring_engine


def test_weighted_overall_scoring():
    # Weights: Communication 30%, Confidence 25%, Technical 30%, Professionalism 15%
    comm = 80.0
    conf = 90.0
    tech = 85.0
    prof = 70.0

    expected = (80.0 * 0.30) + (90.0 * 0.25) + (85.0 * 0.30) + (70.0 * 0.15)
    overall = scoring_engine.calculate_weighted_overall(comm, conf, tech, prof)

    assert round(overall, 1) == round(expected, 1)


def test_rating_rubric_thresholds():
    assert scoring_engine.get_rating_rubric(95.0) == "Excellent"
    assert scoring_engine.get_rating_rubric(82.0) == "Good"
    assert scoring_engine.get_rating_rubric(68.0) == "Average"
    assert scoring_engine.get_rating_rubric(50.0) == "Needs Improvement"
    assert scoring_engine.get_rating_rubric(30.0) == "Poor"
