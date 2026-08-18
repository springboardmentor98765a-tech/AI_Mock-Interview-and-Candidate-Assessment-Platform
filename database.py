import uuid
import datetime

class InMemoryDB:
    def __init__(self):
        self.users = {}
        self.resumes = {}
        self.interviews = {}
        self._seed_data()

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

db = InMemoryDB()
