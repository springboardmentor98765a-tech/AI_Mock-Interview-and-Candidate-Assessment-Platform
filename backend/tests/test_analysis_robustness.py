"""
Adversarial tests for the Module 5 analysis pipeline.

Every test here was written from a probe that found real behaviour, not from
reading the code and imagining a failure. Each one that fails is documenting a
defect that exists right now; each that passes is pinning a property worth
keeping.

Run:  pytest tests/test_analysis_robustness.py -v
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import scoring  # noqa: E402
from app.services.session_timing import elapsed_seconds, per_question_seconds  # noqa: E402
from app.services.speech_analysis import (  # noqa: E402
    analyse_pace,
    count_fillers,
    summarise,
    transcript_is_plausible,
)


# ---------------------------------------------------------------------------
# D1 — a silent recording is given a pace verdict
# ---------------------------------------------------------------------------


class TestSilenceIsNotAPace:
    def test_empty_transcript_with_valid_duration_is_unavailable(self):
        """
        Zero words over twelve seconds currently reports "0 wpm — slow".

        Nobody spoke, so there is no pace. Calling that "slow" is a judgement
        about a candidate derived from no evidence, which is precisely what
        every other branch of this module refuses to do.
        """
        result = analyse_pace("", 12.0)
        assert result["available"] is False, "silence was given a pace verdict"

    def test_silence_is_not_labelled_slow(self):
        result = analyse_pace("", 12.0)
        assert result.get("verdict") != "slow"
        assert result.get("words_per_minute") != 0


# ---------------------------------------------------------------------------
# D2 — digits are not counted as words
# ---------------------------------------------------------------------------


class TestNumericAnswersAreCounted:
    NUMERIC = "750 minus 450 is 300 and then 850 remains"

    def test_digits_count_towards_word_count(self):
        """
        WORD_RE is [a-z']+, so every number is dropped. This answer is nine
        words and counts as five — and APTITUDE interviews, which the platform
        explicitly supports, are mostly numbers.
        """
        assert count_fillers(self.NUMERIC)["word_count"] == 9

    def test_numeric_answers_do_not_read_as_slow(self):
        """54 wpm is reported as 30 wpm, dragging a normal speaker below the
        'slow' threshold purely for talking about numbers."""
        result = analyse_pace(self.NUMERIC, 10.0)
        assert result["words_per_minute"] == 54


# ---------------------------------------------------------------------------
# D3 — phrase fillers match across word boundaries
# ---------------------------------------------------------------------------


class TestPhraseFillersRespectWordBoundaries:
    @pytest.mark.parametrize(
        "transcript",
        ["Fiji means a lot to me", "The API means the interface", "hi mean value"],
        ids=["fiji", "api", "hi-mean"],
    )
    def test_no_false_filler_from_substring(self, transcript):
        """
        `lowered.count("i mean")` matches inside other words. Any word ending
        in "i" followed by "mean…" invents a filler on the candidate's record.
        """
        assert count_fillers(transcript)["by_word"] == {}

    def test_genuine_phrase_filler_still_counted(self):
        assert count_fillers("It was, you know, fine")["by_word"] == {"you know": 1}


# ---------------------------------------------------------------------------
# D4 — "kind of"/"sort of" are treated as hard fillers
# ---------------------------------------------------------------------------


class TestAmbiguousPhrasesAreNotHardFillers:
    def test_legitimate_kind_of_is_not_a_filler(self):
        """
        "what kind of database" is ordinary English. The module already refuses
        to count "like" and "so" for exactly this reason; "kind of" and
        "sort of" are no less ambiguous and should be treated the same way.
        """
        result = count_fillers("what kind of database did you use")
        assert result["total"] == 0
        assert "kind of" in result["discourse_markers"]


# ---------------------------------------------------------------------------
# D5 — the confabulation guard is blind to numeric transcripts
# ---------------------------------------------------------------------------


class TestGuardSeesNumericTranscripts:
    def test_numeric_confabulation_is_still_caught(self):
        """
        Thirty numeric tokens in 2.5s is 720 wpm and impossible — but the words
        are invisible to the guard, so it passes as plausible.
        """
        transcript = " ".join(str(i) for i in range(30))
        plausible, _ = transcript_is_plausible(transcript, 2.5)
        assert plausible is False


# ---------------------------------------------------------------------------
# D7 — aggregate_score trusts an unavailable score
# ---------------------------------------------------------------------------


class TestAggregateScoreIgnoresUnavailable:
    def test_unavailable_score_is_not_averaged_in(self):
        """
        Only `analysis["available"]` is checked, never `score["available"]`. A
        score block marked unavailable that still carries an `overall` is
        averaged in — one provider change from scoring people on failed calls.
        """
        result = scoring.aggregate_score(
            [{"available": True, "score": {"available": False, "overall": 0}}]
        )
        assert result is None, "an unavailable score was counted as a real zero"

    def test_real_scores_still_average(self):
        result = scoring.aggregate_score(
            [
                {"available": True, "score": {"available": True, "overall": 90}},
                {"available": True, "score": {"available": True, "overall": 70}},
            ]
        )
        assert result == 80.0


# ---------------------------------------------------------------------------
# D8 — weighted_overall raises on a partial rubric
# ---------------------------------------------------------------------------


class TestWeightedOverallIsDefensive:
    def test_missing_axis_does_not_raise_keyerror(self):
        """
        Pydantic guarantees all four axes today. If validation is ever
        loosened, this is an unhandled 500 rather than a degraded score.
        """
        try:
            scoring.weighted_overall(
                {"communication": 80, "confidence": 70, "technical_relevance": 60}
            )
        except KeyError:
            pytest.fail("weighted_overall raised KeyError on a partial rubric")


# ---------------------------------------------------------------------------
# D10 — summarise crashes on malformed stored analysis
# ---------------------------------------------------------------------------


class TestSummariseSurvivesBadStoredData:
    def test_string_total_does_not_crash_the_report(self):
        """
        `analysis` is JSONB read back from the database. One malformed row —
        an older writer, a hand edit, a partial migration — currently raises
        TypeError and takes the whole end-of-interview report with it.
        """
        entries = [
            {
                "available": True,
                "transcript_word_count": 40,
                "fillers": {"total": "3", "by_word": {}},
                "pace": None,
            }
        ]
        try:
            summarise(entries)
        except TypeError as exc:
            pytest.fail(f"one malformed row broke the whole report: {exc}")

    def test_none_sections_are_tolerated(self):
        """This already works and must keep working."""
        result = summarise(
            [{"available": True, "transcript_word_count": 40, "fillers": None, "pace": None}]
        )
        assert result["available"] is True


# ---------------------------------------------------------------------------
# D11 — timing crashes on the advertised SQLite fallback
# ---------------------------------------------------------------------------


class TestTimingHandlesNaiveDatetimes:
    def test_naive_started_at_does_not_crash(self):
        """
        config.py advertises a SQLite fallback, and SQLite returns naive
        datetimes from a DateTime(timezone=True) column. Every timing call then
        raises, which means finishing an interview 500s.
        """

        class Interview:
            started_at = datetime.now()  # naive, exactly as SQLite returns it
            completed_at = None
            paused_at = None
            total_paused_seconds = 0
            question_seconds = 60
            questions = [1, 2, 3]

        try:
            assert elapsed_seconds(Interview()) is not None
        except TypeError as exc:
            pytest.fail(f"naive datetime from the SQLite fallback crashed timing: {exc}")


# ---------------------------------------------------------------------------
# Properties that already hold — pinned so they cannot regress
# ---------------------------------------------------------------------------


class TestExistingGuaranteesHold:
    def test_negative_budget_floors_rather_than_inverts(self):
        assert per_question_seconds(-30, 5) > 0

    def test_negative_question_count_does_not_explode(self):
        assert per_question_seconds(30, -5) > 0

    def test_rating_bands_are_inclusive_at_the_threshold(self):
        assert scoring.rating_label(90) == "Excellent"
        assert scoring.rating_label(89.9) == "Good"
        assert scoring.rating_label(40) == "Needs Improvement"
        assert scoring.rating_label(39.9) == "Poor"

    def test_no_score_returns_none_not_zero(self):
        assert scoring.aggregate_score([]) is None
        assert scoring.aggregate_score([None, {"available": False}]) is None
