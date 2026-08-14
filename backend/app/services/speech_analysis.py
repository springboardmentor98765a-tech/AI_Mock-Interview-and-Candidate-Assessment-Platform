"""
Module 5 — communication analysis.

Two halves, kept visibly apart because they are not equally trustworthy:

  measured   filler counts and speaking pace. Arithmetic over the transcript
             and the recorded duration. Reproducible, explainable, and the
             same answer every time.

  assessed   grammar, communication quality, pronunciation. A model's opinion.
             Useful, but an opinion — the API labels it so, and the UI must
             not present it as if it were measured.

Nothing here produces an overall score. Scoring a candidate is a separate
unbuilt module with its own rubric, and a number invented here would be read
as an interview result.
"""

import logging
import re
from typing import Dict, List, Optional

from app.services import ai_provider
from app.services.ai_provider import AIUnavailable

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# Filler words
# --------------------------------------------------------------------------

# Vocalised pauses. These are not words — there is no sentence in which "um"
# carries meaning — so counting every occurrence is safe.
VOCALISED_PAUSES = {
    "um", "umm", "ummm",
    "uh", "uhh", "uhhh",
    "er", "err", "erm",
    "ah", "ahh",
    "hmm", "hm", "mmm", "mm",
    "eh",
}

# Discourse markers, reported SEPARATELY and never added to the filler count.
#
# Every one of these is also an ordinary English word: "I like Python", "so I
# rewrote it", "that's right", "it works well". A naive counter marks all of
# those as filler and hands the candidate a number that is simply wrong. There
# is no reliable way to tell filler use from legitimate use without parsing,
# so these are surfaced as "worth listening for" rather than counted against
# anyone.
DISCOURSE_MARKERS = {
    "like", "actually", "basically", "literally", "right", "well",
    "so", "okay", "anyway", "obviously",
}

# Multi-word fillers have to be found before the text is split into words.
PHRASE_FILLERS = ("you know", "i mean", "sort of", "kind of", "you see")

WORD_RE = re.compile(r"[a-z']+")


def _words(text: str) -> List[str]:
    return WORD_RE.findall(text.lower())


def count_fillers(transcript: str) -> Dict:
    """
    Filler analysis over a transcript.

    `per_100_words` is the comparable figure — a raw count only says the answer
    was long. It is None for very short answers, where the rate is dominated by
    noise: one "um" in eight words is not a 12-per-100 habit.
    """
    lowered = transcript.lower()
    words = _words(transcript)
    total = len(words)

    counts: Dict[str, int] = {}

    for phrase in PHRASE_FILLERS:
        occurrences = lowered.count(phrase)
        if occurrences:
            counts[phrase] = occurrences

    for word in words:
        if word in VOCALISED_PAUSES:
            counts[word] = counts.get(word, 0) + 1

    filler_total = sum(counts.values())

    markers: Dict[str, int] = {}
    for word in words:
        if word in DISCOURSE_MARKERS:
            markers[word] = markers.get(word, 0) + 1

    return {
        "total": filler_total,
        "by_word": dict(sorted(counts.items(), key=lambda kv: -kv[1])),
        "word_count": total,
        # Below this length the rate is noise, so it is withheld rather than
        # reported as a suspiciously precise number.
        "per_100_words": round(filler_total * 100 / total, 1) if total >= 30 else None,
        "discourse_markers": dict(sorted(markers.items(), key=lambda kv: -kv[1])),
        "discourse_marker_note": (
            "Counted separately and not treated as fillers: each of these is "
            "also an ordinary word, so only some uses are filler."
        ),
    }


# --------------------------------------------------------------------------
# Speaking pace
# --------------------------------------------------------------------------

# Conversational speech sits around 120-150 wpm; interview and presentation
# guidance commonly puts the comfortable band at roughly 110-160. These are
# rules of thumb, not a standard, and the API returns the thresholds alongside
# the verdict so nobody has to take the label on faith.
PACE_SLOW_BELOW = 110
PACE_FAST_ABOVE = 160

# Under this much speech, words-per-minute is arithmetic on noise: a 4-second
# clip of six words extrapolates to 90 wpm on almost nothing.
MIN_PACE_SECONDS = 5.0


def analyse_pace(transcript: str, duration_seconds: Optional[float]) -> Dict:
    """
    Words per minute over *measured speaking time*.

    Returns available=False rather than a fabricated number when the duration
    is missing or too short to divide by. A pace figure with no real duration
    behind it is the exact kind of invented metric this platform refuses to
    show.
    """
    words = len(_words(transcript))

    if not duration_seconds or duration_seconds < MIN_PACE_SECONDS:
        return {
            "available": False,
            "reason": (
                "The recording is too short to measure pace reliably."
                if duration_seconds
                else "No measured speaking duration for this answer."
            ),
            "word_count": words,
        }

    wpm = round(words / (duration_seconds / 60))

    if wpm < PACE_SLOW_BELOW:
        verdict = "slow"
    elif wpm > PACE_FAST_ABOVE:
        verdict = "fast"
    else:
        verdict = "comfortable"

    return {
        "available": True,
        "words_per_minute": wpm,
        "word_count": words,
        "duration_seconds": round(duration_seconds, 1),
        "verdict": verdict,
        "comfortable_range": [PACE_SLOW_BELOW, PACE_FAST_ABOVE],
        "basis": "Measured speaking time from the recording, not time spent thinking.",
    }


# --------------------------------------------------------------------------
# The whole analysis
# --------------------------------------------------------------------------


# --------------------------------------------------------------------------
# Guarding against invented transcripts
# --------------------------------------------------------------------------

# Fast conversational speech tops out around 200 wpm; auctioneers and sports
# commentators reach 250-300. Nothing in an interview answer goes past this, so
# a transcript implying more than this rate did not come from the recording.
MAX_PLAUSIBLE_WPM = 300

# Below this, the rate is too noisy to judge: two words in half a second is
# 240 wpm and perfectly real.
MIN_CHECKABLE_SECONDS = 2.0


def transcript_is_plausible(
    transcript: str, duration_seconds: Optional[float]
) -> tuple[bool, Optional[str]]:
    """
    Could this many words physically have been said in this much audio?

    This exists because the speech model confabulates. Handed a recording it
    cannot make out — a very short clip, silence, background noise — it will
    sometimes return a fluent, plausible interview answer that nobody said. It
    is stated confidently and reads exactly like a real transcript.

    Prompting does not reliably stop it and neither does temperature=0: the
    same unintelligible file has produced three entirely different "answers"
    across three runs. So the check here is not another instruction to the
    model, it is arithmetic the model cannot talk its way around. Words take
    time to say, and the duration is measured by the browser rather than
    reported by the model.

    Returns (plausible, reason). A missing duration means the check cannot run
    — that is reported as not-plausible rather than waved through, because an
    unverifiable transcript of a candidate's interview is exactly the kind of
    number this platform refuses to present as fact.
    """
    words = len(_words(transcript))
    if words == 0:
        return True, None  # silence is a legitimate, checkable outcome

    if not duration_seconds:
        return False, (
            "The transcript could not be checked against the recording's "
            "length, so it is not shown. Play the recording back to hear the "
            "answer."
        )

    if duration_seconds < MIN_CHECKABLE_SECONDS:
        return False, (
            "The recording is too short to verify the transcript against, so "
            "it is not shown. Play the recording back to hear the answer."
        )

    implied = words / (duration_seconds / 60)
    if implied > MAX_PLAUSIBLE_WPM:
        return False, (
            f"The transcript claims {words} words in "
            f"{round(duration_seconds, 1)}s ({round(implied)} words per "
            f"minute), which is faster than anyone speaks. The speech service "
            f"could not read this recording and returned invented text, so it "
            f"has been discarded. Your recording is saved and unaffected."
        )

    return True, None


def summarise(analyses: List[Dict]) -> Dict:
    """
    Roll per-answer analyses up to the whole interview.

    Averages are taken over the answers that actually have the figure, and the
    count they were taken over is returned alongside — "142 wpm" from one
    answer out of eight is a very different claim from the same number over
    eight, and the caller must be able to tell.
    """
    usable = [a for a in analyses if a and a.get("available")]

    if not usable:
        return {
            "available": False,
            "reason": "No answer in this interview has been analysed.",
            "analysed_answers": 0,
        }

    filler_total = 0
    combined: Dict[str, int] = {}
    for entry in usable:
        fillers = entry.get("fillers") or {}
        filler_total += fillers.get("total", 0)
        for word, count in (fillers.get("by_word") or {}).items():
            combined[word] = combined.get(word, 0) + count

    words = sum(a.get("transcript_word_count", 0) for a in usable)

    paces = [
        a["pace"]["words_per_minute"]
        for a in usable
        if (a.get("pace") or {}).get("available")
    ]

    grammar_total = sum(
        len(((a.get("communication") or {}).get("grammar_issues")) or [])
        for a in usable
        if (a.get("communication") or {}).get("available")
    )
    graded = sum(1 for a in usable if (a.get("communication") or {}).get("available"))

    return {
        "available": True,
        "analysed_answers": len(usable),
        "total_words": words,
        "filler_total": filler_total,
        "filler_by_word": dict(sorted(combined.items(), key=lambda kv: -kv[1])),
        "filler_per_100_words": (
            round(filler_total * 100 / words, 1) if words >= 30 else None
        ),
        "pace": {
            "available": bool(paces),
            "average_words_per_minute": round(sum(paces) / len(paces)) if paces else None,
            "measured_over_answers": len(paces),
            "comfortable_range": [PACE_SLOW_BELOW, PACE_FAST_ABOVE],
        },
        "grammar_issue_total": grammar_total,
        "grammar_reviewed_answers": graded,
        # Stated explicitly so nobody reads the numbers above as a result.
        "note": (
            "Counts and pace are measured. Grammar and communication notes are "
            "an AI assessment. Neither is an interview score — this platform "
            "does not score candidates."
        ),
    }


def analyse_answer(
    *,
    question_text: str,
    transcript: str,
    duration_seconds: Optional[float] = None,
    audio: Optional[bytes] = None,
    audio_mime: str = "audio/webm",
) -> Dict:
    """
    Everything Module 5 knows about one spoken answer.

    Each AI section fails independently: a provider that is down or out of
    quota costs you that section and nothing else. The measured half never
    depends on a provider at all, so filler counts and pace survive an outage
    that takes the grammar review with it.
    """
    transcript = (transcript or "").strip()
    if not transcript:
        return {
            "available": False,
            "reason": "No transcript for this answer, so there is nothing to analyse.",
        }

    analysis: Dict = {
        "available": True,
        "transcript_word_count": len(_words(transcript)),
        # --- measured ---
        "fillers": count_fillers(transcript),
        "pace": analyse_pace(transcript, duration_seconds),
    }

    # --- assessed: grammar + communication quality (text, any provider) ---
    try:
        assessment = ai_provider.analyse_communication(
            question=question_text, transcript=transcript
        )
        analysis["communication"] = {
            "available": True,
            "source": "ai_assessment",
            **assessment.model_dump(),
        }
    except AIUnavailable as exc:
        logger.warning("Communication assessment unavailable: %s", exc)
        analysis["communication"] = {"available": False, "reason": str(exc)}

    # --- assessed: pronunciation (needs the recording, so Gemini only) ---
    if audio:
        try:
            notes = ai_provider.assess_pronunciation(audio, mime_type=audio_mime)
            analysis["pronunciation"] = {
                "available": True,
                "source": "ai_assessment",
                "method_note": (
                    "Listening notes only. This platform does not do "
                    "phoneme-level scoring, so there is no pronunciation score."
                ),
                **notes.model_dump(),
            }
        except AIUnavailable as exc:
            logger.warning("Pronunciation assessment unavailable: %s", exc)
            analysis["pronunciation"] = {"available": False, "reason": str(exc)}
    else:
        analysis["pronunciation"] = {
            "available": False,
            "reason": "No recording was kept for this answer.",
        }

    return analysis
