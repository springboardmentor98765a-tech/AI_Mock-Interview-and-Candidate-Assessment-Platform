"""Focused checks for the explainable observable engagement estimate."""
from app.main import calculate_engagement_score


def summary(eye_contact=80, attention=80, face_visible=100, eyes_closed=0, emotion=None):
    return {
        "monitoring_checks": 100,
        "face_visible_checks": face_visible,
        "eyes_closed_checks": eyes_closed,
        "attention_analysis": {
            "attention_score": attention,
            "components": {"eye_contact_percentage": eye_contact},
        },
        "emotion_analysis": {
            "status": "success",
            "emotion_distribution": emotion or {
                "neutral": 0.80, "happiness": 0.10, "surprise": 0.10,
            },
        },
    }


def test_perfect_values():
    result = calculate_engagement_score(summary(100, 100, 100, 0, {"neutral": 1.0}))
    assert result["engagement_score"] == 100
    assert result["engagement_level"] == "High"


def test_low_values():
    result = calculate_engagement_score(summary(10, 20, 20, 0, {"neutral": 0.20, "sadness": 0.20, "anger": 0.20, "fear": 0.20, "surprise": 0.20}))
    assert result["engagement_level"] == "Low"


def test_mixed_values_are_medium():
    result = calculate_engagement_score(summary(70, 70, 75, 5, {"neutral": 0.65, "happiness": 0.35}))
    assert 50 <= result["engagement_score"] <= 79
    assert result["engagement_level"] == "Medium"


def test_boundaries():
    for value, expected_level in [(49, "Low"), (50, "Medium"), (79, "Medium"), (80, "High")]:
        result = calculate_engagement_score(summary(value, value, value, 0, {"neutral": value / 100}))
        assert result["engagement_score"] == value
        assert result["engagement_level"] == expected_level


def test_missing_and_invalid_data_is_safe():
    assert calculate_engagement_score({})["status"] == "not_available"
    result = calculate_engagement_score({"attention_analysis": {"attention_score": None, "components": {"eye_contact_percentage": "bad"}}})
    assert result["status"] == "not_available"
    assert result["engagement_score"] is None


if __name__ == "__main__":
    test_perfect_values()
    test_low_values()
    test_mixed_values_are_medium()
    test_boundaries()
    test_missing_and_invalid_data_is_safe()
    print("Engagement tests passed.")
