"""Focused checks for the final combined observable behavior summary."""
from app.main import build_behavior_summary


def monitoring(eye=80, attention=80, engagement=80, confidence=80, emotion="neutral"):
    return {
        "attention_analysis": {"attention_score": attention, "components": {"eye_contact_percentage": eye}},
        "engagement_analysis": {"engagement_score": engagement},
        "confidence_analysis": {"confidence_score": confidence},
        "emotion_analysis": {"status": "success", "dominant_emotion": emotion},
    }


def test_perfect_values_and_formula():
    result = build_behavior_summary(monitoring(100, 100, 100, 100))
    assert result["overall_behavior_indicator"] == 100
    assert result["overall_behavior_level"] == "Strong"
    assert result["dominant_emotion"] == "neutral"


def test_weighted_formula():
    result = build_behavior_summary(monitoring(50, 80, 60, 40))
    # 30%*80 + 25%*60 + 25%*40 + 20%*50 = 59
    assert result["overall_behavior_indicator"] == 59
    assert result["overall_behavior_level"] == "Moderate"


def test_low_and_medium_values():
    assert build_behavior_summary(monitoring(10, 20, 20, 20))["overall_behavior_level"] == "Needs Improvement"
    assert build_behavior_summary(monitoring(70, 70, 70, 70))["overall_behavior_level"] == "Moderate"


def test_boundaries():
    for value, expected in [(49, "Needs Improvement"), (50, "Moderate"), (79, "Moderate"), (80, "Strong")]:
        result = build_behavior_summary(monitoring(value, value, value, value))
        assert result["overall_behavior_indicator"] == value
        assert result["overall_behavior_level"] == expected


def test_missing_none_and_invalid_data_are_safe():
    assert build_behavior_summary({})["status"] == "not_available"
    result = build_behavior_summary({
        "attention_analysis": {"attention_score": None, "components": {"eye_contact_percentage": "bad"}},
        "engagement_analysis": {"engagement_score": None},
        "confidence_analysis": {"confidence_score": "invalid"},
    })
    assert result["status"] == "not_available"
    assert result["overall_behavior_indicator"] is None


if __name__ == "__main__":
    test_perfect_values_and_formula()
    test_weighted_formula()
    test_low_and_medium_values()
    test_boundaries()
    test_missing_none_and_invalid_data_are_safe()
    print("Behavior summary tests passed.")
