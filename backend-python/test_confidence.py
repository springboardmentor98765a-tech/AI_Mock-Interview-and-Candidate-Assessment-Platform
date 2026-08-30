"""Focused checks for the observable confidence-indicator calculation."""
from app.main import calculate_confidence_indicator


def monitoring(eye_contact=80, attention=80, engagement=80):
    return {
        "attention_analysis": {
            "attention_score": attention,
            "components": {"eye_contact_percentage": eye_contact},
        },
        "engagement_analysis": {"engagement_score": engagement},
    }


def speech(words=130, fillers=0, seconds=60):
    return [{"word_count": words, "filler_count": fillers, "speech_seconds": seconds}]


def test_perfect_values():
    result = calculate_confidence_indicator(monitoring(100, 100, 100), speech())
    assert result["confidence_score"] == 100
    assert result["confidence_level"] == "High confidence indicators"


def test_low_values():
    result = calculate_confidence_indicator(monitoring(10, 20, 20), speech(20, 20, 60))
    assert result["confidence_level"] == "Low confidence indicators"


def test_medium_values():
    result = calculate_confidence_indicator(monitoring(70, 70, 70), speech(100, 2, 50))
    assert 50 <= result["confidence_score"] <= 79
    assert result["confidence_level"] == "Moderate confidence indicators"


def test_boundaries_without_speech_data():
    for value, expected in [(49, "Low confidence indicators"), (50, "Moderate confidence indicators"), (79, "Moderate confidence indicators"), (80, "High confidence indicators")]:
        result = calculate_confidence_indicator(monitoring(value, value, value), [])
        assert result["confidence_score"] == value
        assert result["confidence_level"] == expected


def test_missing_none_and_invalid_data_are_safe():
    assert calculate_confidence_indicator({}, [])["status"] == "not_available"
    result = calculate_confidence_indicator(
        {"attention_analysis": {"attention_score": None, "components": {"eye_contact_percentage": "bad"}}, "engagement_analysis": {"engagement_score": None}},
        [{"word_count": "invalid", "filler_count": None, "speech_seconds": -1}],
    )
    assert result["status"] == "not_available"
    assert result["confidence_score"] is None


if __name__ == "__main__":
    test_perfect_values()
    test_low_values()
    test_medium_values()
    test_boundaries_without_speech_data()
    test_missing_none_and_invalid_data_are_safe()
    print("Confidence tests passed.")
