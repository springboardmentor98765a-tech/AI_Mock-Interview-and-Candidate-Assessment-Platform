"""
Module 6 — aggregating live tracking samples into a behaviour report.

In-process unit tests: app.services.behavior_analysis is pure arithmetic with
no AI call and no database, so nothing here needs a running server.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import behavior_analysis  # noqa: E402
from app.services.behavior_analysis import MIN_USEFUL_SAMPLES, aggregate  # noqa: E402


def samples(gaze="camera", expression="confident", face_present=True,
            confidence=None, count=1):
    return [
        {
            "gaze": gaze,
            "expression": expression,
            "face_present": face_present,
            "confidence": confidence,
        }
    ] * count


def enough(**kwargs):
    """A run long enough to clear MIN_USEFUL_SAMPLES."""
    return samples(count=MIN_USEFUL_SAMPLES, **kwargs)


# One minute of samples at the tracker's 4Hz.
SECONDS = MIN_USEFUL_SAMPLES / 4


class TestEyeContact:
    def test_all_camera_samples_give_100_percent(self):
        report = aggregate(enough(), SECONDS)
        assert report["available"] is True
        assert report["eye_contact_percent"] == 100

    def test_eye_contact_excludes_down_side_and_away(self):
        """Only "camera" counts. Anything else is not eye contact."""
        mixed = (
            samples(gaze="camera", count=50)
            + samples(gaze="down", count=25)
            + samples(gaze="side", count=15)
            + samples(gaze="away", face_present=False, count=10)
        )
        report = aggregate(mixed, 25.0)
        assert report["eye_contact_percent"] == 50
        assert report["gaze_breakdown"] == {"camera": 50, "down": 25, "side": 15, "away": 10}

    def test_face_absent_samples_are_not_eye_contact(self):
        half_absent = samples(count=50) + samples(
            gaze="away", face_present=False, count=50
        )
        report = aggregate(half_absent, 25.0)
        assert report["eye_contact_percent"] == 50
        assert report["face_present_percent"] == 50


class TestLookAways:
    def test_counts_runs_not_samples(self):
        """
        The distinction the whole metric rests on: twenty consecutive frames
        looking at the keyboard is ONE look-away, not twenty.
        """
        run = samples(count=40) + samples(gaze="down", count=20) + samples(count=40)
        report = aggregate(run, 25.0)
        assert report["look_aways"] == 1

    def test_two_separate_runs_count_twice(self):
        two = (
            samples(count=30)
            + samples(gaze="down", count=20)
            + samples(count=30)
            + samples(gaze="side", count=20)
            + samples(count=30)
        )
        assert aggregate(two, 32.5)["look_aways"] == 2

    def test_single_stray_sample_is_not_a_look_away(self):
        """
        One misclassified frame mid-answer must not tell the candidate they
        looked away. Below the minimum run length it is noise.
        """
        stray = samples(count=50) + samples(gaze="down", count=1) + samples(count=50)
        assert aggregate(stray, 25.25)["look_aways"] == 0

    def test_a_session_ending_while_looking_away_still_counts_it(self):
        trailing = samples(count=60) + samples(gaze="down", count=20)
        assert aggregate(trailing, 20.0)["look_aways"] == 1

    def test_run_threshold_follows_the_observed_sample_rate(self):
        """
        The minimum run is defined in seconds, so halving the sample rate must
        halve the number of samples needed — not silently double the duration
        a look-away has to last.
        """
        # 12 samples of looking down. At 8Hz that is 1.5s (counts); at 2Hz it
        # would be 6s (also counts) — so compare against a rate where it does
        # not: 12 samples at 40Hz is 0.3s, well under the threshold.
        run = samples(count=40) + samples(gaze="down", count=12) + samples(count=40)
        slow = aggregate(run, 92 / 8)  # 8Hz  -> 12 samples = 1.5s
        fast = aggregate(run, 92 / 40)  # 40Hz -> 12 samples = 0.3s
        assert slow["look_aways"] == 1
        assert fast["look_aways"] == 0


class TestNotEnoughData:
    def test_too_few_samples_is_unavailable(self):
        report = aggregate(samples(count=MIN_USEFUL_SAMPLES - 1), 5.0)
        assert report["available"] is False
        assert "reason" in report

    def test_no_samples_is_unavailable_not_zero(self):
        """
        Zero eye contact and no data are different facts — the same
        distinction Interview.overall_score draws between null and 0.
        """
        report = aggregate([], 0.0)
        assert report["available"] is False
        assert "eye_contact_percent" not in report

    def test_none_is_tolerated(self):
        assert aggregate(None, 0.0)["available"] is False

    def test_zero_tracked_seconds_does_not_divide_by_zero(self):
        report = aggregate(enough(), 0.0)
        assert report["available"] is True


class TestExpressions:
    def test_breakdown_is_over_visible_frames_only(self):
        """
        Counting frames where nobody was in shot would report an expression
        for time the candidate was not on camera.
        """
        mixed = samples(expression="confident", count=50) + samples(
            gaze="away", expression="neutral", face_present=False, count=50
        )
        report = aggregate(mixed, 25.0)
        assert report["emotions"] == {"confident": 100}

    def test_breakdown_percentages_sum_to_about_100(self):
        mixed = (
            samples(expression="confident", count=50)
            + samples(expression="nervous", count=30)
            + samples(expression="fear", count=20)
        )
        total = sum(aggregate(mixed, 25.0)["emotions"].values())
        assert 98 <= total <= 102


class TestLabels:
    def test_steady_eye_contact_reads_as_confident(self):
        assert aggregate(enough(), SECONDS)["confidence"] == "Confident"

    def test_very_low_eye_contact_reads_as_nervous(self):
        mostly_down = samples(gaze="down", count=80) + samples(count=20)
        assert aggregate(mostly_down, 25.0)["confidence"] == "Nervous"

    def test_absent_face_reads_as_low_engagement(self):
        absent = samples(gaze="away", face_present=False, count=80) + samples(count=20)
        assert aggregate(absent, 25.0)["engagement"] == "Low"

    def test_full_attention_reads_as_high_engagement(self):
        assert aggregate(enough(), SECONDS)["engagement"] == "High"


class TestSummary:
    def test_mentions_the_dominant_gaze_zone(self):
        mostly_down = samples(gaze="down", count=60) + samples(count=40)
        summary = aggregate(mostly_down, 25.0)["summary"]
        assert "looking down" in summary.lower()

    def test_says_when_there_were_no_look_aways(self):
        assert "never looked away" in aggregate(enough(), SECONDS)["summary"].lower()

    def test_nervous_summary_does_not_claim_to_know_feelings(self):
        """
        Concentration and nerves look alike on a face, and the wording that
        reaches the candidate has to admit that.
        """
        nervous = samples(expression="nervous", count=100)
        summary = aggregate(nervous, 25.0)["summary"]
        assert "concentration" in summary.lower()

    def test_fear_summary_admits_it_is_unreliable(self):
        """Fear is the shakiest of the three; the wording must not oversell."""
        scared = samples(expression="fear", count=100)
        summary = aggregate(scared, 25.0)["summary"].lower()
        assert "least reliable" in summary or "lightly" in summary


class TestConfidencePercent:
    def test_averages_only_frames_the_model_read(self):
        """
        The expression model runs slower than gaze, so most samples carry no
        reading. Counting those as zero would report a composed candidate as
        unconfident purely because the model was busy.
        """
        read = samples(confidence=0.8, count=20)
        unread = samples(confidence=None, count=80)
        assert aggregate(read + unread, 25.0)["confidence_percent"] == 80

    def test_none_when_the_model_never_ran(self):
        """Not measured is not the same as measured at zero."""
        assert aggregate(enough(), SECONDS)["confidence_percent"] is None

    def test_low_confidence_and_low_eye_contact_reads_nervous(self):
        looking_away = samples(gaze="down", confidence=0.1, count=100)
        assert aggregate(looking_away, 25.0)["confidence"] == "Nervous"

    def test_label_falls_back_to_eye_contact_when_unmeasured(self):
        """A model that never loaded must not drag the label down."""
        assert aggregate(enough(), SECONDS)["confidence"] == "Confident"


class TestProvenance:
    def test_report_carries_method_note_and_counts(self):
        report = aggregate(enough(), SECONDS)
        assert report["method_note"] == behavior_analysis.METHOD_NOTE
        assert report["samples"] == MIN_USEFUL_SAMPLES
        assert report["tracked_seconds"] == round(SECONDS, 1)
        assert report["source"] == "live_tracking"

    def test_method_note_disclaims_scoring_and_upload(self):
        note = behavior_analysis.METHOD_NOTE.lower()
        assert "no video was uploaded" in note
        assert "no behaviour score" in note

    def test_no_behaviour_score_field_exists(self):
        """
        Module 6 must never produce a number that ranks a candidate. If one
        appears here, something has gone wrong in the design, not just the code.
        """
        report = aggregate(enough(), SECONDS)
        for banned in ("score", "overall", "rating", "rank"):
            assert banned not in report, f"a ranking field {banned!r} leaked into the report"
