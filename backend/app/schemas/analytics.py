"""
Analytics response shapes.

Every field here is a count, a list, a timestamp, a status, a duration, or —
now that Module 6 exists — a score read straight off Interview.overall_score.
There are still no invented eye-contact, emotion or confidence-from-video
fields: nothing here reports a figure the platform does not actually compute.
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

    # Module 6: mean of Interview.overall_score across every interview that
    # has one. None rather than 0 when nothing has been scored yet — the
    # platform having zero score is a different fact from having no data.
    average_score: Optional[float] = None
    scored_interviews: int = 0


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

    # Module 6. Both None until at least one interview has been scored — a
    # candidate with no scored interview has no score, not a score of zero.
    latest_score: Optional[float] = None
    latest_score_rating: Optional[str] = None
    best_score: Optional[float] = None
    scoring_available: bool = True


class RecruiterCandidate(BaseModel):
    """One row of the recruiter's candidate list, ordered by activity."""

    user_id: int
    name: str
    email: str
    interviews_total: int
    interviews_completed: int
    has_resume: bool
    top_technologies: List[str] = []
    last_active_at: Optional[datetime] = None
    # Module 6, from the candidate's most recently completed interview — the
    # same basis the leaderboard ranks on. None if that interview was never
    # scored, or if the candidate has no completed interview at all.
    latest_score: Optional[float] = None
    latest_score_rating: Optional[str] = None


class RecruiterAnalytics(BaseModel):
    candidates_total: int
    candidates_with_resume: int
    interviews_total: int
    interviews_completed: int
    live_now: int
    top_technologies: List[CountPoint]
    average_score: Optional[float] = None
    scored_interviews: int = 0
    scoring_available: bool = True


class LeaderboardEntry(BaseModel):
    """
    One ranked row. Basis: each candidate's most recently completed
    interview — current standing, not a lifetime average or a personal best.

    Only candidates whose most recent completed interview was actually scored
    appear here at all; there is no row with a rank and no score; see
    GET /analytics/leaderboard for why.
    """

    rank: int
    user_id: int
    name: str
    email: str
    score: float
    rating: str
    interview_id: int
    interview_type: str
    domain: str
    difficulty: str
    completed_at: Optional[datetime] = None


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
