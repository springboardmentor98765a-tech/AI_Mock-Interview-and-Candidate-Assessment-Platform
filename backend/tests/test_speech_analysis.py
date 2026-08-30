"""
Modules 4 and 5 — the parts that must be arithmetic rather than opinion.

These are in-process unit tests with no network: the measured half of the
analysis, the timer arithmetic, and the guard that stops an invented transcript
reaching a candidate's record. The AI half is exercised through mocks in
test_ollama_provider.py; there is no test asserting what a model *says*,
because that is not a property the suite can hold.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.session_timing import (  # noqa: E402
    MAX_QUESTION_SECONDS,
    MIN_QUESTION_SECONDS,
    elapsed_seconds,
    overrun_seconds,
    per_question_seconds,
    question_seconds_spent,
    remaining_seconds,
    session_budget_seconds,
)
from app.services.scoring import rating_label  # noqa: E402
from app.services.speech_analysis import (  # noqa: E402
    MAX_PLAUSIBLE_WPM,
    analyse_pace,
    count_fillers,
    summarise,
    transcript_is_plausible,
)


class TestFillerCounting:
    def test_counts_vocalised_pauses(self):
        result = count_fillers("Um, well, uh, I think er yes")
        assert result["by_word"] == {"um": 1, "uh": 1, "er": 1}
        assert result["total"] == 3

    def test_counts_multi_word_fillers(self):
        result = count_fillers("It was, you know, fine, I mean mostly fine")
        assert result["by_word"]["you know"] == 1
        assert result["by_word"]["i mean"] == 1

    def test_discourse_markers_are_not_fillers(self):
        """
        The whole point of the split. "I like Python" is not filler use of
        'like', and counting it would hand the candidate a wrong number.
        """
        result = count_fillers("I like Python and I write it well, so I am right")
        assert result["total"] == 0, "ordinary words counted as fillers"
        assert set(result["discourse_markers"]) == {"like", "well", "so", "right"}

    def test_rate_withheld_for_short_answers(self):
        """One 'um' in eight words is not a 12-per-100 habit."""
        assert count_fillers("um yes I did that thing then")["per_100_words"] is None

    def test_rate_given_once_long_enough(self):
        text = "um " + " ".join(f"word{i}" for i in range(40))
        result = count_fillers(text)
        assert result["per_100_words"] == pytest.approx(2.4, abs=0.1)

    def test_punctuation_does_not_break_matching(self):
        assert count_fillers("Um... uh, er!")["total"] == 3

    def test_case_insensitive(self):
        assert count_fillers("UM Uh ER")["total"] == 3

    def test_empty_transcript_is_zero_not_an_error(self):
        result = count_fillers("")
        assert result["total"] == 0
        assert result["per_100_words"] is None


class TestPace:
    def test_words_per_minute(self):
        text = " ".join(f"word{i}" for i in range(30))
        result = analyse_pace(text, 15.0)
        assert result["available"] is True
        assert result["words_per_minute"] == 120
        assert result["verdict"] == "comfortable"

    @pytest.mark.parametrize(
        "words,seconds,verdict",
        [(20, 30.0, "slow"), (30, 15.0, "comfortable"), (60, 15.0, "fast")],
    )
    def test_verdicts(self, words, seconds, verdict):
        text = " ".join(f"word{i}" for i in range(words))
        assert analyse_pace(text, seconds)["verdict"] == verdict

    def test_no_duration_means_unavailable_not_zero(self):
        """A pace of 0 would be a fabricated measurement. It must be withheld."""
        result = analyse_pace("some words here", None)
        assert result["available"] is False
        assert "words_per_minute" not in result

    def test_very_short_recording_is_unavailable(self):
        assert analyse_pace("two words", 1.0)["available"] is False

    def test_thresholds_are_reported(self):
        """The verdict is a judgement against a threshold, so show the threshold."""
        result = analyse_pace(" ".join(["w"] * 30), 15.0)
        assert result["comfortable_range"] == [110, 160]


class TestTranscriptPlausibility:
    """
    The guard against confabulation.

    The speech model invents fluent interview answers for audio it cannot
    decode — verified against a real recording, which produced three different
    "answers" across three runs at temperature 0. These tests pin the
    arithmetic that catches it.
    """

    def test_normal_speech_passes(self):
        text = " ".join(f"word{i}" for i in range(30))  # 30 words in 15s = 120 wpm
        assert transcript_is_plausible(text, 15.0)[0] is True

    def test_impossible_rate_is_rejected(self):
        text = " ".join(f"word{i}" for i in range(40))  # 40 words in 3s = 800 wpm
        plausible, reason = transcript_is_plausible(text, 3.0)
        assert plausible is False
        assert "faster than anyone speaks" in reason

    def test_silence_is_plausible(self):
        """An empty transcript is a real outcome and must not be flagged."""
        assert transcript_is_plausible("", 5.0)[0] is True
        assert transcript_is_plausible("", None)[0] is True

    def test_missing_duration_cannot_be_verified(self):
        """Unverifiable is reported as such, never waved through."""
        plausible, reason = transcript_is_plausible("some real words", None)
        assert plausible is False
        assert "could not be checked" in reason

    def test_too_short_to_check(self):
        plausible, reason = transcript_is_plausible("hi", 0.5)
        assert plausible is False
        assert "too short" in reason

    def test_boundary_is_the_stated_threshold(self):
        """60 words in 60s is 60 wpm; the cut is at MAX_PLAUSIBLE_WPM."""
        just_over = " ".join(["w"] * (MAX_PLAUSIBLE_WPM + 30))
        just_under = " ".join(["w"] * (MAX_PLAUSIBLE_WPM - 30))
        assert transcript_is_plausible(just_over, 60.0)[0] is False
        assert transcript_is_plausible(just_under, 60.0)[0] is True

    def test_reason_says_the_recording_is_safe(self):
        """A discarded transcript must not read as a lost answer."""
        _, reason = transcript_is_plausible(" ".join(["w"] * 40), 3.0)
        assert "recording is saved" in reason


class TestSummary:
    def test_no_analyses_is_unavailable_not_zero(self):
        result = summarise([])
        assert result["available"] is False
        assert result["analysed_answers"] == 0

    def test_skipped_and_unanalysed_are_excluded(self):
        result = summarise([None, {"available": False, "reason": "skipped"}])
        assert result["available"] is False

    def test_totals_add_up(self):
        entries = [
            {
                "available": True,
                "transcript_word_count": 50,
                "fillers": {"total": 2, "by_word": {"um": 2}},
                "pace": {"available": True, "words_per_minute": 120},
                "communication": {"available": True, "grammar_issues": [1, 2]},
            },
            {
                "available": True,
                "transcript_word_count": 50,
                "fillers": {"total": 4, "by_word": {"um": 1, "uh": 3}},
                "pace": {"available": True, "words_per_minute": 140},
                "communication": {"available": True, "grammar_issues": []},
            },
        ]
        result = summarise(entries)
        assert result["filler_total"] == 6
        assert result["filler_by_word"] == {"uh": 3, "um": 3}
        assert result["pace"]["average_words_per_minute"] == 130
        assert result["grammar_issue_total"] == 2

    def test_average_reports_how_many_it_averaged(self):
        """'142 wpm' over one answer is a different claim from over eight."""
        entries = [
            {
                "available": True,
                "transcript_word_count": 40,
                "fillers": {"total": 0, "by_word": {}},
                "pace": {"available": True, "words_per_minute": 130},
            },
            {
                "available": True,
                "transcript_word_count": 40,
                "fillers": {"total": 0, "by_word": {}},
                "pace": {"available": False, "reason": "no duration"},
            },
        ]
        result = summarise(entries)
        assert result["pace"]["measured_over_answers"] == 1
        assert result["analysed_answers"] == 2

    def test_summary_score_unavailable_when_answers_carry_no_score(self):
        """
        An analysis written before Module 5's scoring existed has no "score" key at
        all — summarise must report that as unscored, not crash or invent one.
        """
        result = summarise(
            [
                {
                    "available": True,
                    "transcript_word_count": 40,
                    "fillers": {"total": 1, "by_word": {"um": 1}},
                    "pace": {"available": True, "words_per_minute": 130},
                }
            ]
        )
        assert result["score"]["available"] is False
        assert result["score"]["graded_answers"] == 0

    def test_summary_rolls_up_score_when_present(self):
        """The interview-level score is the average of its answers' scores."""
        result = summarise(
            [
                {
                    "available": True,
                    "transcript_word_count": 40,
                    "fillers": {"total": 0, "by_word": {}},
                    "pace": {"available": True, "words_per_minute": 130},
                    "score": {"available": True, "overall": 90},
                },
                {
                    "available": True,
                    "transcript_word_count": 35,
                    "fillers": {"total": 0, "by_word": {}},
                    "pace": {"available": True, "words_per_minute": 125},
                    "score": {"available": True, "overall": 70},
                },
            ]
        )
        assert result["score"]["available"] is True
        assert result["score"]["overall"] == 80.0
        assert result["score"]["rating"] == rating_label(80.0)
        assert result["score"]["graded_answers"] == 2


class TestQuestionTimer:
    def test_budget_is_split_across_questions(self):
        assert per_question_seconds(30, 10) == 180  # 30 min / 10 questions

    def test_floored_so_a_question_is_answerable(self):
        """60 questions in 5 minutes is 5s each, which is not an interview."""
        assert per_question_seconds(5, 60) == MIN_QUESTION_SECONDS

    def test_capped(self):
        assert per_question_seconds(180, 1) == MAX_QUESTION_SECONDS

    def test_no_questions_does_not_divide_by_zero(self):
        assert per_question_seconds(30, 0) == MIN_QUESTION_SECONDS

    def test_zero_minutes_floors_rather_than_zeroes(self):
        """A zero-second countdown would be a broken interview, not a strict one."""
        assert per_question_seconds(0, 5) == MIN_QUESTION_SECONDS


class _FakeInterview:
    """A stand-in with just the attributes the timing functions read."""

    def __init__(self, **kwargs):
        self.started_at = kwargs.get("started_at")
        self.completed_at = kwargs.get("completed_at")
        self.paused_at = kwargs.get("paused_at")
        self.total_paused_seconds = kwargs.get("total_paused_seconds", 0)
        self.question_seconds = kwargs.get("question_seconds")
        self.questions = kwargs.get("questions", [])


class _FakeQuestion:
    def __init__(self, asked_at=None, answered_at=None, skipped_at=None):
        self.asked_at = asked_at
        self.answered_at = answered_at
        self.skipped_at = skipped_at


def _ago(seconds):
    return datetime.now(timezone.utc) - timedelta(seconds=seconds)


class TestElapsed:
    def test_unstarted_is_none_not_zero(self):
        """Zero would claim it started and no time passed. It has not started."""
        assert elapsed_seconds(_FakeInterview()) is None

    def test_running_measures_to_now(self):
        assert elapsed_seconds(_FakeInterview(started_at=_ago(60))) == pytest.approx(60, abs=2)

    def test_finished_measures_to_the_end(self):
        """A finished interview's duration must not grow as time passes."""
        interview = _FakeInterview(started_at=_ago(600), completed_at=_ago(300))
        assert elapsed_seconds(interview) == pytest.approx(300, abs=2)

    def test_paused_time_is_excluded(self):
        interview = _FakeInterview(started_at=_ago(100), total_paused_seconds=40)
        assert elapsed_seconds(interview) == pytest.approx(60, abs=2)

    def test_an_open_pause_stops_the_clock(self):
        """
        The pause in progress has not been added to the total yet, so it has to
        be counted here — otherwise the clock ticks on while paused.
        """
        interview = _FakeInterview(started_at=_ago(100), paused_at=_ago(30))
        assert elapsed_seconds(interview) == pytest.approx(70, abs=2)

    def test_never_negative(self):
        """Clock skew or a hand-edited row must not produce negative time."""
        interview = _FakeInterview(started_at=_ago(10), total_paused_seconds=9999)
        assert elapsed_seconds(interview) == 0


class TestRemaining:
    def _interview(self, elapsed, per_question=60, questions=3):
        return _FakeInterview(
            started_at=_ago(elapsed),
            question_seconds=per_question,
            questions=[_FakeQuestion() for _ in range(questions)],
        )

    def test_budget_is_per_question_times_questions(self):
        assert session_budget_seconds(self._interview(0)) == 180

    def test_remaining_counts_down(self):
        assert remaining_seconds(self._interview(60)) == pytest.approx(120, abs=2)

    def test_floored_at_zero_not_negative(self):
        """Overrun is its own field; remaining must never go negative."""
        assert remaining_seconds(self._interview(300)) == 0

    def test_overrun_reported_separately(self):
        assert overrun_seconds(self._interview(300)) == pytest.approx(120, abs=2)

    def test_no_overrun_while_within_budget(self):
        assert overrun_seconds(self._interview(60)) == 0

    def test_no_clock_means_none_not_zero(self):
        """An interview with no countdown has unknown remaining time, not zero."""
        interview = _FakeInterview(started_at=_ago(60), question_seconds=None)
        assert session_budget_seconds(interview) is None
        assert remaining_seconds(interview) is None


class TestTimeOnQuestion:
    def test_asked_to_answered(self):
        q = _FakeQuestion(asked_at=_ago(90), answered_at=_ago(30))
        assert question_seconds_spent(q) == pytest.approx(60, abs=2)

    def test_asked_to_skipped(self):
        q = _FakeQuestion(asked_at=_ago(50), skipped_at=_ago(20))
        assert question_seconds_spent(q) == pytest.approx(30, abs=2)

    def test_open_question_is_none(self):
        """Using 'now' would give a number that changes on every read."""
        assert question_seconds_spent(_FakeQuestion(asked_at=_ago(10))) is None

    def test_never_asked_is_none(self):
        assert question_seconds_spent(_FakeQuestion()) is None


class TestTimerRespondsToSetup:
    """
    The clock has to reflect the interview the candidate actually chose.

    Before this, difficulty and type had no effect and every short interview
    came out at the clamp — which reads as a timer that never changes.
    """

    def test_harder_gets_more_time(self):
        easy = per_question_seconds(30, 5, difficulty="EASY", interview_type="TECHNICAL")
        hard = per_question_seconds(30, 5, difficulty="HARD", interview_type="TECHNICAL")
        assert hard > easy

    def test_type_changes_the_clock(self):
        hr = per_question_seconds(30, 5, difficulty="MEDIUM", interview_type="HR")
        aptitude = per_question_seconds(30, 5, difficulty="MEDIUM", interview_type="APTITUDE")
        assert aptitude > hr, "aptitude needs working-out time; HR is recall"

    def test_same_count_different_setup_differs(self):
        """The exact defect reported: same question count, identical timer."""
        a = per_question_seconds(30, 3, difficulty="EASY", interview_type="HR")
        b = per_question_seconds(30, 3, difficulty="HARD", interview_type="APTITUDE")
        assert a != b

    def test_short_interviews_are_no_longer_flattened(self):
        """1, 2 and 3 questions used to all clamp to exactly 10:00."""
        seconds = {
            per_question_seconds(30, n, difficulty="MEDIUM", interview_type="TECHNICAL")
            for n in (2, 3, 4)
        }
        assert len(seconds) > 1, "short interviews still collapse to one value"

    def test_unknown_setup_degrades_to_the_plain_split(self):
        """An unrecognised value must not raise or zero the clock."""
        plain = per_question_seconds(30, 5)
        assert per_question_seconds(30, 5, difficulty="WHATEVER", interview_type="NONSENSE") == plain

    def test_still_clamped_at_both_ends(self):
        assert per_question_seconds(1, 60, difficulty="EASY", interview_type="HR") == MIN_QUESTION_SECONDS
        assert per_question_seconds(180, 1, difficulty="HARD", interview_type="APTITUDE") == MAX_QUESTION_SECONDS

    def test_case_insensitive(self):
        assert per_question_seconds(30, 5, difficulty="hard", interview_type="aptitude") == \
               per_question_seconds(30, 5, difficulty="HARD", interview_type="APTITUDE")
