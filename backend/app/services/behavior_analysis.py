"""
Module 6 — turning live tracking samples into an interview's behaviour report.

The candidate's browser watches their camera while they answer (an ML model
running locally — no video is uploaded for this, see
frontend/src/lib/faceTracker.js) and reduces each detection to one small
sample: where they were looking, what their face was doing, whether they were
in frame at all. At the end of the session it posts the samples here.

Everything in this module is pure arithmetic over that array — no AI call, no
I/O, no database. That is deliberate, and the same choice `scoring.py` makes:
the browser is not a trustworthy calculator, and putting the maths in Python
means it can be tested exhaustively instead of hoped about.

Two things this module refuses to do, both for the same reason — the
measurement is not good enough to support them:

  No behaviour score. Eye contact is an uncalibrated estimate; reducing a
  person's demeanour to a number and ranking them on it would dress that
  estimate up as something it is not. Module 5's score and the leaderboard are
  untouched by anything here.

  No claim about feelings. Expression is read from facial action units by
  thresholds (frontend/src/lib/faceTracker.js) — a composed face reads
  confident whether or not the person feels it, and concentration and nerves
  look much alike. The wording that reaches the candidate says what was seen,
  not what they felt.

Worth stating plainly, because the confidence percentage now reaches
recruiters: the expression half is **uncalibrated**. The gaze thresholds were
measured against real recordings and adapt per session; the expression ones
encode a plausible reading of well-known facial action units and nothing
stronger. That is why the confidence *label* leans on eye contact, which is
measured, and lets expression only adjust it.
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Shown with every report. Fixed text, not something a model writes, so the
# disclosure cannot drift.
METHOD_NOTE = (
    "Measured in your browser while you answered, using on-device models — no "
    "video was uploaded for this. Eye contact is an uncalibrated estimate. The "
    "confidence percentage is an estimate of how composed your face looked, "
    "which is not the same as how confident you felt: a calm face scores high "
    "whether or not you were nervous behind it. It is uncalibrated — treat it "
    "as a rough impression. There is no behaviour score, and none of this "
    "affects your interview score."
)

# Below this, there is not enough of a session to say anything honest. At the
# tracker's 4Hz this is about ten seconds.
MIN_USEFUL_SAMPLES = 40

# How long a candidate must be looking away before it counts as a look-away
# rather than a glance. Expressed in seconds and converted using the actual
# observed sample rate, so it does not silently change meaning if the tracker
# is ever re-tuned.
LOOK_AWAY_MIN_SECONDS = 1.5

GAZE_ZONES = ("camera", "down", "side", "away")


def _percentages(counts: Dict[str, int], total: int) -> Dict[str, int]:
    """Whole-number percentages. Rounded, so they may sum to 99 or 101."""
    if total <= 0:
        return {}
    return {key: round(value * 100 / total) for key, value in counts.items() if value}


def _gaze_breakdown(samples: List[dict]) -> Dict[str, int]:
    counts = {zone: 0 for zone in GAZE_ZONES}
    for sample in samples:
        zone = sample.get("gaze")
        if zone in counts:
            counts[zone] += 1
    return _percentages(counts, len(samples))


def _expression_breakdown(samples: List[dict]) -> Dict[str, int]:
    """
    Expression mix, over the samples where a face was actually visible.

    Counting frames where nobody was in shot would report "neutral" for time
    the candidate was not on camera at all.
    """
    visible = [s for s in samples if s.get("face_present")]
    counts: Dict[str, int] = {}
    for sample in visible:
        label = sample.get("expression")
        if label:
            counts[label] = counts.get(label, 0) + 1
    ranked = dict(sorted(counts.items(), key=lambda kv: -kv[1]))
    return _percentages(ranked, len(visible))


def _count_look_aways(samples: List[dict], samples_per_second: float) -> int:
    """
    Sustained looks away from the camera.

    Counts *runs*, not samples: twenty consecutive frames looking at the
    keyboard is one look-away, not twenty. A run shorter than
    LOOK_AWAY_MIN_SECONDS is a glance — or a single misclassified frame — and
    is not counted at all, because a metric that fires on one bad frame would
    tell the candidate something untrue about themselves.
    """
    minimum_run = max(2, round(LOOK_AWAY_MIN_SECONDS * max(samples_per_second, 0.1)))

    look_aways = 0
    run = 0
    for sample in samples:
        if sample.get("gaze") == "camera":
            if run >= minimum_run:
                look_aways += 1
            run = 0
        else:
            run += 1

    # A session that ends while still looking away still ends in a look-away.
    if run >= minimum_run:
        look_aways += 1

    return look_aways


def _confidence_percent(samples: List[dict]) -> Optional[int]:
    """
    The confidence percentage: the expression model's mean P(composed).

    Averaged only over the frames it actually read. The model runs on a slower
    cadence than gaze and may never load at all, so most samples carry no
    reading — counting those as zero would report a confident candidate as
    unconfident purely because the model was busy.

    None when nothing was read, which the caller renders as "not measured"
    rather than 0%.
    """
    scored = [s["confidence"] for s in samples if s.get("confidence") is not None]
    if not scored:
        return None
    return round(sum(scored) * 100 / len(scored))


def _confidence_label(eye_contact: int, confidence_percent: Optional[int]) -> str:
    """
    A coarse label combining the two signals, each with its known worth.

    Eye contact is measured, so it leads. The expression model is genuinely
    good at telling composed from uncomfortable (0.92 AUC) but reads the face,
    not the person — so it adjusts the answer rather than deciding it, and when
    it never ran the label falls back to eye contact alone.
    """
    if confidence_percent is None:
        return "Confident" if eye_contact >= 65 else "Neutral" if eye_contact >= 35 else "Nervous"

    if eye_contact >= 60 and confidence_percent >= 55:
        return "Confident"
    if eye_contact < 35 or confidence_percent < 30:
        return "Nervous"
    return "Neutral"


def _engagement_label(eye_contact: int, face_present: int) -> str:
    if face_present < 50:
        return "Low"
    if eye_contact >= 60 and face_present >= 80:
        return "High"
    if eye_contact >= 35:
        return "Medium"
    return "Low"


def _summarise(
    *,
    eye_contact: int,
    look_aways: int,
    gaze: Dict[str, int],
    expressions: Dict[str, int],
    face_present: int,
) -> str:
    """
    The written summary, assembled from the numbers.

    Templated rather than generated: an LLM given these figures would produce
    smoother prose and would also, sooner or later, say something the data
    does not support. Every clause below is tied to a number above it.
    """
    parts: List[str] = []

    if eye_contact >= 75:
        parts.append(
            f"You held eye contact with the camera for about {eye_contact}% of the "
            "session, which reads as engaged and self-assured."
        )
    elif eye_contact >= 50:
        parts.append(
            f"You looked at the camera for about {eye_contact}% of the session — a "
            "reasonable amount, with room to hold it a little longer."
        )
    else:
        parts.append(
            f"You looked at the camera for about {eye_contact}% of the session. "
            "Interviewers read sustained eye contact as confidence, so this is "
            "the single thing most worth practising."
        )

    down = gaze.get("down", 0)
    side = gaze.get("side", 0)
    if down >= 20 and down >= side:
        parts.append(
            f"About {down}% of the time you were looking down — at notes, a "
            "keyboard or a lower screen."
        )
    elif side >= 20:
        parts.append(
            f"About {side}% of the time you were turned away from the camera, "
            "which usually means a second screen or something off to one side."
        )

    if look_aways == 0:
        parts.append("You never looked away for a sustained stretch.")
    elif look_aways == 1:
        parts.append("You looked away once for a sustained stretch.")
    else:
        parts.append(f"You looked away {look_aways} times for a sustained stretch.")

    if face_present < 80:
        parts.append(
            f"Your face was only in frame for about {face_present}% of the session — "
            "worth checking your camera position before the next one."
        )

    dominant = next(iter(expressions), None)
    if dominant == "confident":
        parts.append("Your expression read as composed for most of the session.")
    elif dominant == "nervous":
        parts.append(
            "Your expression read as uncomfortable for much of the session — "
            "though concentration and nerves look much alike on a face."
        )
    elif dominant == "fear":
        # The shakiest of the three: the facial signature overlaps with plain
        # surprise, and it is uncalibrated. Said softly on purpose.
        parts.append(
            "Parts of the session read as anxious, though this is the least "
            "reliable of the three readings — weigh it lightly."
        )

    return " ".join(parts)


# --------------------------------------------------------------------------
# What a recruiter is allowed to see
# --------------------------------------------------------------------------
#
# Everything here is derived from gaze, which is measured: where the eyes and
# head were pointing, counted. Estimated rather than instrumented, but a real
# observation of a real thing.
#
# `confidence_percent` is included by explicit product decision, and it is the
# one field here NOT derived from measured gaze — it is an uncalibrated
# estimate from facial action units. RECRUITER_METHOD_NOTE says so, and the
# note travels with the data rather than living only in the UI.
#
# Still absent: `emotions` and the written `summary`. A percentage carries its
# own uncertainty visibly; a word like "nervous" beside someone's name does
# not, and a recruiter will remember the word long after any caveat.
#
# `engagement` IS included because, despite the name, it is computed purely
# from eye contact and face presence — both measured — and never from the
# expression classifier.
RECRUITER_VISIBLE_FIELDS = (
    "available",
    "confidence_percent",
    "eye_contact_percent",
    "look_aways",
    "engagement",
    "gaze_breakdown",
    "face_present_percent",
    "samples",
    "tracked_seconds",
)

RECRUITER_METHOD_NOTE = (
    "Attention measured from the candidate's camera during the session. These "
    "are uncalibrated estimates, not instrumented measurements, and they are "
    "submitted by the candidate's own browser — so treat them as context, "
    "never as evidence. Eye-contact norms differ by culture and by "
    "neurodivergence: less eye contact is not worse interviewing. The "
    "confidence percentage estimates how composed the candidate's face looked "
    "and is uncalibrated — a calm face scores high whether or not the person "
    "felt calm, and an animated one scores lower without meaning anything is "
    "wrong. Named emotion readings are excluded here because a label beside "
    "someone's name outlives its caveat."
)


def recruiter_view(report: Optional[dict]) -> Optional[dict]:
    """
    The subset of a behaviour report that is defensible in front of a recruiter.

    Filters rather than recomputes, so this can never disagree with what the
    candidate sees — it is the same numbers, minus the ones that are not
    trustworthy enough to influence a decision about a person.
    """
    if not report:
        return None
    if not report.get("available"):
        return {"available": False, "reason": report.get("reason")}

    view = {k: report[k] for k in RECRUITER_VISIBLE_FIELDS if k in report}
    view["source"] = report.get("source")
    view["method_note"] = RECRUITER_METHOD_NOTE
    return view


def aggregate(
    samples: List[dict],
    tracked_seconds: float,
    alerts_shown: int = 0,
) -> dict:
    """
    Turn one session's samples into the stored behaviour report.

    Returns the `{"available": False, "reason": ...}` shape when there is not
    enough to work with, which the API and UI already handle — the same
    distinction Module 5 draws between "scored zero" and "no data".
    """
    samples = samples or []

    if len(samples) < MIN_USEFUL_SAMPLES:
        return {
            "available": False,
            "reason": (
                "Too little of this session was tracked to report on — the camera "
                "was on for only a moment, or the face model could not see you."
            ),
            "samples": len(samples),
        }

    total = len(samples)
    gaze = _gaze_breakdown(samples)
    expressions = _expression_breakdown(samples)

    eye_contact = gaze.get("camera", 0)
    face_present = round(
        sum(1 for s in samples if s.get("face_present")) * 100 / total
    )

    samples_per_second = total / tracked_seconds if tracked_seconds > 0 else 4.0
    look_aways = _count_look_aways(samples, samples_per_second)
    confidence_percent = _confidence_percent(samples)

    return {
        "available": True,
        "source": "live_tracking",
        "method_note": METHOD_NOTE,
        "confidence": _confidence_label(eye_contact, confidence_percent),
        "confidence_percent": confidence_percent,
        "emotions": expressions,
        "eye_contact_percent": eye_contact,
        "look_aways": look_aways,
        "engagement": _engagement_label(eye_contact, face_present),
        "summary": _summarise(
            eye_contact=eye_contact,
            look_aways=look_aways,
            gaze=gaze,
            expressions=expressions,
            face_present=face_present,
        ),
        # Provenance, so a thin or patchy session is visible rather than
        # hidden behind a confident-looking percentage.
        "gaze_breakdown": gaze,
        "face_present_percent": face_present,
        "samples": total,
        "tracked_seconds": round(tracked_seconds, 1),
        "alerts_shown": alerts_shown,
    }
