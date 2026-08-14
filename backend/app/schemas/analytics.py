"""
Analytics response shapes.

Every field here is a count, a list, a timestamp, a status or a duration —
something that comes from an actual row. There are deliberately NO score,
rating, confidence, eye-contact or pace fields: the scoring engine (Module 7)
does not exist, and inventing those numbers is what this work is removing.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class CountPoint(BaseModel):
    label: str
    count: int


class TimePoint(BaseModel):
    date: str
    count: int


class AdminAnalytics(BaseModel):
    users_total: int
    users_by_role: Dict[str, int]
    users_blocked: int

    interviews_total: int
    interviews_by_status: Dict[str, int]
    interviews_by_type: Dict[str, int]
    interviews_by_difficulty: Dict[str, int]

    questions_total: int
    # Skipped questions are not attempted, so they are counted separately and
    # never folded into questions_answered.
    questions_answered: int
    questions_skipped: int = 0

    resumes_total: int
    resumes_by_status: Dict[str, int]

    tickets_open: int
    tickets_total: int

    interviews_last_14_days: List[TimePoint]


class CandidateAnalytics(BaseModel):
    interviews_total: int
    interviews_by_status: Dict[str, int]
    interviews_by_type: Dict[str, int]

    questions_total: int
    questions_answered: int
    questions_skipped: int = 0

    last_interview_at: Optional[datetime] = None

    has_resume: bool
    resume_skills_count: int = 0
    resume_technologies_count: int = 0
    resume_experience_years: Optional[float] = None

    # Scoring is Module 7 and is not built. This flag exists so the UI can say
    # "not yet available" instead of rendering a fabricated zero as if it were
    # a real result.
    scoring_available: bool = False


class RecruiterCandidate(BaseModel):
    """One row of the recruiter's candidate list. No score, no rank."""

    user_id: int
    name: str
    email: str
    interviews_total: int
    interviews_completed: int
    has_resume: bool
    top_technologies: List[str] = []
    last_active_at: Optional[datetime] = None


class RecruiterAnalytics(BaseModel):
    candidates_total: int
    candidates_with_resume: int
    interviews_total: int
    interviews_completed: int
    live_now: int
    top_technologies: List[CountPoint]
    scoring_available: bool = False


class LiveInterview(BaseModel):
    """An interview a candidate is partway through — derived from real status."""

    interview_id: int
    candidate_id: int
    candidate_name: str
    interview_type: str
    domain: str
    difficulty: str
    questions_total: int
    questions_answered: int
    started_at: Optional[datetime] = None
    # True when the candidate has paused. They are still in a live session —
    # this is what tells a watching recruiter why progress has stopped.
    paused: bool = False
