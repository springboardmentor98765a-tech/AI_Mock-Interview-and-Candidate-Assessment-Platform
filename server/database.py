import sqlite3
import os
from config import DB_PATH

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT,
            role TEXT NOT NULL DEFAULT 'candidate' CHECK(role IN ('candidate', 'recruiter', 'admin')),
            provider TEXT NOT NULL DEFAULT 'LOCAL' CHECK(provider IN ('LOCAL', 'GOOGLE')),
            google_id TEXT,
            avatar TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

        CREATE TABLE IF NOT EXISTS interview_session (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            candidate_id INTEGER NOT NULL,
            interview_type TEXT NOT NULL,
            domain TEXT,
            difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
            duration INTEGER NOT NULL DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_interview_session_user_id ON interview_session(user_id);
        CREATE INDEX IF NOT EXISTS idx_interview_session_candidate_id ON interview_session(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_interview_session_type ON interview_session(interview_type);

        CREATE TABLE IF NOT EXISTS interview_question (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            category TEXT,
            difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
            sequence_no INTEGER NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interview_session(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_interview_question_interview_id ON interview_question(interview_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_question_sequence
            ON interview_question(interview_id, sequence_no);
        CREATE TABLE IF NOT EXISTS assessment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            target_role TEXT,
            topics_json TEXT,
            difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
            num_questions INTEGER NOT NULL DEFAULT 10,
            time_limit_minutes INTEGER NOT NULL DEFAULT 10,
            status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'in_progress', 'completed')),
            resume_context_json TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            score_percentage REAL,
            total_questions INTEGER,
            correct_answers INTEGER,
            incorrect_answers INTEGER,
            unanswered INTEGER,
            topic_performance_json TEXT,
            difficulty_performance_json TEXT,
            integrity_metrics_json TEXT,
            ai_feedback_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_assessment_user_id ON assessment(user_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessment(status);

        CREATE TABLE IF NOT EXISTS assessment_question (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assessment_id INTEGER NOT NULL,
            sequence_no INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_answer TEXT NOT NULL,
            explanation TEXT,
            topic TEXT,
            difficulty TEXT,
            candidate_answer TEXT,
            is_correct INTEGER,
            FOREIGN KEY (assessment_id) REFERENCES assessment(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_assessment_question_assessment_id ON assessment_question(assessment_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_question_sequence
            ON assessment_question(assessment_id, sequence_no);

        CREATE TABLE IF NOT EXISTS interview_recording (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            recording_type TEXT NOT NULL DEFAULT 'video',
            file_path TEXT NOT NULL,
            duration INTEGER,
            mime_type TEXT,
            file_size_bytes INTEGER,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES interview_session(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_interview_recording_session_id ON interview_recording(session_id);
    """)


    tables = {row["name"] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "interview" in tables and "interview_session" not in tables:
        conn.execute("ALTER TABLE interview RENAME TO interview_session")

    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "is_super_admin" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0")

    session_cols = {row["name"] for row in conn.execute("PRAGMA table_info(interview_session)").fetchall()}
    if "candidate_id" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN candidate_id INTEGER")
    if "duration" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN duration INTEGER NOT NULL DEFAULT 15")

    conn.execute("UPDATE interview_session SET candidate_id = user_id WHERE candidate_id IS NULL")
    conn.execute("UPDATE interview_session SET duration = 15 WHERE duration IS NULL")

    if "status" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created', 'in_progress', 'completed'))")
    if "started_at" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN started_at TIMESTAMP")
    if "completed_at" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN completed_at TIMESTAMP")
    if "total_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN total_score REAL")
    if "communication_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN communication_score REAL")
    if "confidence_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN confidence_score REAL")
    if "technical_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN technical_score REAL")
    if "professionalism_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN professionalism_score REAL")
    if "overall_score" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN overall_score REAL")
    if "performance_rating" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN performance_rating TEXT")
    if "strengths_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN strengths_json TEXT")
    if "weaknesses_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN weaknesses_json TEXT")
    if "improvements_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN improvements_json TEXT")
    if "recommendations_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN recommendations_json TEXT")
    if "resources_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN resources_json TEXT")
    if "detailed_parameters_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN detailed_parameters_json TEXT")


    question_cols = {row["name"] for row in conn.execute("PRAGMA table_info(interview_question)").fetchall()}
    if "answer_text" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN answer_text TEXT")
    if "score" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN score REAL")
    if "feedback" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN feedback TEXT")
    if "communication_score" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN communication_score REAL")
    if "confidence_score" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN confidence_score REAL")
    if "technical_score" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN technical_score REAL")
    if "professionalism_score" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN professionalism_score REAL")
    if "parameters_json" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN parameters_json TEXT")

    conn.commit()
    conn.close()


init_db()
