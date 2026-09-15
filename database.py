import uuid
import datetime

class InMemoryDB:
    def __init__(self):
        self.users = {}
        self.resumes = {}
        self.interviews = {}
        self.assessments = {}
        self.speech_sessions = {}
        self.notifications = {}
        self.reminders = {}
        self.email_logs = {}
        self.reports = {}
        self.scheduled_interviews = {}
        self.activity_logs = {}
        self.ai_telemetry = {}
        self.system_metrics = {}
        self.detection_events = {}
        self.detection_summaries = {}
        self._seed_data()

    def log_activity(self, user_id: str, action: str, entity_type: str, entity_id: str, details: dict = None):
        log_id = f"act_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.datetime.now().isoformat()
        record = {
            "id": log_id,
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details or {},
            "timestamp": now_iso
        }
        self.activity_logs[log_id] = record
        return record

    def log_ai_telemetry(self, session_id: str, service_name: str, status: str, duration_seconds: float, error_message: str = None, metadata: dict = None):
        telemetry_id = f"ai_tel_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.datetime.now().isoformat()
        record = {
            "id": telemetry_id,
            "session_id": session_id,
            "service_name": service_name,
            "status": status,  # "success", "failed"
            "duration_seconds": round(duration_seconds, 3),
            "error_message": error_message,
            "metadata": metadata or {},
            "timestamp": now_iso
        }
        self.ai_telemetry[telemetry_id] = record
        return record

    def _seed_data(self):
        # Pre-seeded password hashes (password: "password123")
        # SHA256 hashed password123 with salt
        demo_pwd_hash = "e902226efd1149b65d11b824c5c244bb0cdb4762d0c65fc1617fbfb81c161be6"

        # 1. Candidate Demo User
        cand_id = "user_cand_101"
        self.users[cand_id] = {
            "id": cand_id,
            "email": "candidate@example.com",
            "full_name": "Alex Mercer",
            "password_hash": demo_pwd_hash,
            "role": "candidate",
            "status": "Active",
            "created_at": datetime.datetime.now().isoformat()
        }

        # 2. Recruiter Demo User
        rec_id = "user_rec_202"
        self.users[rec_id] = {
            "id": rec_id,
            "email": "recruiter@example.com",
            "full_name": "Sarah Connor",
            "company": "TechNova Dynamics",
            "password_hash": demo_pwd_hash,
            "role": "recruiter",
            "status": "Verified",
            "created_at": datetime.datetime.now().isoformat()
        }

        # 3. Admin Demo User
        admin_id = "user_admin_303"
        self.users[admin_id] = {
            "id": admin_id,
            "email": "admin@example.com",
            "full_name": "System Admin",
            "password_hash": demo_pwd_hash,
            "role": "admin",
            "status": "Active",
            "created_at": datetime.datetime.now().isoformat()
        }

        # Pre-seed candidate resume
        self.resumes[cand_id] = {
            "user_id": cand_id,
            "raw_text": "Alex Mercer - Senior Full Stack Developer with 4 years experience in Python, FastAPI, JavaScript, React, PostgreSQL, Docker, and REST APIs. Graduated with B.S. in Computer Science from MIT.",
            "parsed_data": {
                "name": "Alex Mercer",
                "summary": "Experienced Full Stack Developer specializing in Python backend systems, modern web APIs, and responsive frontends.",
                "skills": ["Python", "FastAPI", "JavaScript", "React", "Docker", "PostgreSQL", "REST APIs", "Git"],
                "tech_stack": ["Python 3.10", "FastAPI", "Vanilla JS", "Docker", "PostgreSQL"],
                "education": [
                    {
                        "degree": "B.S. Computer Science",
                        "institution": "MIT",
                        "year": "2022"
                    }
                ],
                "seniority_level": "Mid-Senior",
                "parsed_at": datetime.datetime.now().isoformat()
            }
        }

        # Pre-seed a completed interview for Alex Mercer
        sample_int_id = "int_sample_001"
        self.interviews[sample_int_id] = {
            "id": sample_int_id,
            "user_id": cand_id,
            "candidate_name": "Alex Mercer",
            "domain": "Full Stack",
            "difficulty": "Medium",
            "type": "Technical",
            "status": "Completed",
            "questions": [
                {
                    "id": 1,
                    "question": "Explain the difference between synchronous and asynchronous route handlers in FastAPI.",
                    "category": "Technical",
                    "ideal_answer_outline": "Mention async def vs def, event loop non-blocking behavior, thread pool execution for synchronous handlers.",
                    "user_answer": "Async route handlers in FastAPI use Python async/await to execute non-blocking I/O operations directly on the event loop. Synchronous route handlers defined with def run inside an external thread pool.",
                    "evaluation": {
                        "score": 9,
                        "feedback": "Excellent explanation highlighting both the event loop execution and the underlying thread pool fallback mechanism.",
                        "missing_points": ["Could mention async DB drivers like asyncpg or Tortoise ORM."]
                    }
                },
                {
                    "id": 2,
                    "question": "How do you optimize static asset loading and API requests in a high-traffic Vanilla JS web application?",
                    "category": "Performance",
                    "ideal_answer_outline": "Discuss HTTP caching, lazy loading, debouncing API calls, content delivery networks (CDNs), minification.",
                    "user_answer": "Use HTTP caching headers, minify assets, lazy load heavy images/modules, and debounce user inputs before triggering network requests.",
                    "evaluation": {
                        "score": 8,
                        "feedback": "Strong answer covering essential web performance techniques.",
                        "missing_points": ["Could add Web Workers for offloading heavy JS computation."]
                    }
                }
            ],
            "report": {
                "overall_score": 85,
                "recommendation": "Hire",
                "summary": "Demonstrates strong foundational knowledge of modern Python API design, asynchronous processing, and web frontend optimization.",
                "category_scores": {
                    "Technical Depth": 88,
                    "Communication": 85,
                    "Problem Solving": 82,
                    "Domain Mastery": 86
                },
                "strengths": [
                    "Clear understanding of FastAPI concurrency execution",
                    "Solid knowledge of frontend web performance optimizations"
                ],
                "weaknesses": [
                    "Slight gap in discussing async database driver integrations"
                ],
                "ai_growth_roadmap": [
                    "Explore async ORMs (Tortoise/SQLAlchemy 2.0 async)",
                    "Deep dive into Web Workers and Service Worker caching strategies"
                ]
            },
            "session_id": "sess_sample_001",
            "start_time": datetime.datetime.now().isoformat(),
            "end_time": datetime.datetime.now().isoformat(),
            "duration_seconds": 450,
            "video_recording_ref": None,
            "audio_recording_ref": None,
            "questions_attempted": 2,
            "question_times": {"1": 210, "2": 240},
            "created_at": datetime.datetime.now().isoformat()
        }

        # Pre-seed upcoming scheduled interview for Alex Mercer (tomorrow)
        upcoming_time = (datetime.datetime.now() + datetime.timedelta(days=1, hours=2)).replace(microsecond=0)
        sched_id = "sched_sample_101"
        self.scheduled_interviews[sched_id] = {
            "id": sched_id,
            "user_id": cand_id,
            "candidate_name": "Alex Mercer",
            "candidate_email": "candidate@example.com",
            "title": "Full Stack Senior Engineer Mock Interview",
            "domain": "Full Stack",
            "difficulty": "Hard",
            "type": "Technical",
            "scheduled_time": upcoming_time.isoformat(),
            "duration_minutes": 45,
            "status": "Scheduled", # Scheduled, Completed, Cancelled, Rescheduled
            "reminder_preferences": ["24h", "1h", "15m"],
            "created_at": datetime.datetime.now().isoformat()
        }

        # Pre-seed reminders for scheduled interview
        rem_24h_id = f"rem_{uuid.uuid4().hex[:8]}"
        self.reminders[rem_24h_id] = {
            "id": rem_24h_id,
            "user_id": cand_id,
            "interview_id": sched_id,
            "reminder_type": "24h",
            "scheduled_time": (upcoming_time - datetime.timedelta(hours=24)).isoformat(),
            "target_interview_time": upcoming_time.isoformat(),
            "status": "pending", # pending, sent, failed, cancelled
            "sent_at": None,
            "created_at": datetime.datetime.now().isoformat()
        }

        rem_1h_id = f"rem_{uuid.uuid4().hex[:8]}"
        self.reminders[rem_1h_id] = {
            "id": rem_1h_id,
            "user_id": cand_id,
            "interview_id": sched_id,
            "reminder_type": "1h",
            "scheduled_time": (upcoming_time - datetime.timedelta(hours=1)).isoformat(),
            "target_interview_time": upcoming_time.isoformat(),
            "status": "pending",
            "sent_at": None,
            "created_at": datetime.datetime.now().isoformat()
        }

        # Pre-seed realistic notifications for Alex Mercer
        notif_1 = f"notif_{uuid.uuid4().hex[:8]}"
        self.notifications[notif_1] = {
            "id": notif_1,
            "user_id": cand_id,
            "title": "Mock Interview Scheduled",
            "message": f"Your Full Stack Technical interview is scheduled for {upcoming_time.strftime('%b %d, %Y at %I:%M %p')}.",
            "type": "reminder",
            "is_read": False,
            "related_id": sched_id,
            "action_url": f"#upcoming",
            "created_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat()
        }

        notif_2 = f"notif_{uuid.uuid4().hex[:8]}"
        self.notifications[notif_2] = {
            "id": notif_2,
            "user_id": cand_id,
            "title": "Assessment Ready",
            "message": "AI Evaluation for Full Stack Interview (int_sample_001) completed with score 85/100.",
            "type": "assessment",
            "is_read": False,
            "related_id": sample_int_id,
            "action_url": f"#assessment",
            "created_at": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat()
        }

        # Pre-seed initial email logs
        log_1 = f"email_{uuid.uuid4().hex[:8]}"
        self.email_logs[log_1] = {
            "id": log_1,
            "user_id": cand_id,
            "notification_type": "interview_scheduled",
            "recipient_email": "candidate@example.com",
            "subject": "Interview Scheduled: Full Stack Senior Engineer Mock Interview",
            "status": "sent",
            "sent_at": (datetime.datetime.now() - datetime.timedelta(hours=2)).isoformat(),
            "error_message": None
        }

db = InMemoryDB()

