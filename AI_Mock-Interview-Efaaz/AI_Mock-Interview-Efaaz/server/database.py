import sqlite3
import os
from config import DB_PATH

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.execute("PRAGMA foreign_keys=OFF")
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

        CREATE TABLE IF NOT EXISTS recruiter_candidate_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recruiter_id INTEGER NOT NULL,
            candidate_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('shortlisted', 'under_review', 'rejected')),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(recruiter_id, candidate_id)
        );

        CREATE INDEX IF NOT EXISTS idx_recruiter_status_recruiter ON recruiter_candidate_status(recruiter_id);
        CREATE INDEX IF NOT EXISTS idx_recruiter_status_candidate ON recruiter_candidate_status(candidate_id);

        CREATE TABLE IF NOT EXISTS interview_template (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recruiter_id INTEGER,
            title TEXT NOT NULL,
            interview_type TEXT NOT NULL,
            domain TEXT,
            difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
            duration_minutes INTEGER NOT NULL DEFAULT 15,
            num_questions INTEGER NOT NULL DEFAULT 5,
            topics_json TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_interview_template_recruiter ON interview_template(recruiter_id);

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('report_ready', 'interview_reminder', 'session_alert', 'performance_summary', 'system')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data_json TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    """)

    # Seed initial standard templates if table is empty
    t_count = conn.execute("SELECT COUNT(*) FROM interview_template").fetchone()[0]
    if t_count == 0:
        conn.execute("""
            INSERT INTO interview_template (recruiter_id, title, interview_type, domain, difficulty, duration_minutes, num_questions, topics_json, description)
            VALUES 
            (NULL, 'Fullstack Software Engineer', 'Technical Interview', 'Software Engineering', 'medium', 15, 5, '["Data Structures", "Algorithms", "System Design", "REST APIs"]', 'Assesses Data Structures, Algorithms, REST APIs, and System Design.'),
            (NULL, 'Senior Leadership & Culture', 'Behavioral Interview', 'Human Resources', 'easy', 15, 4, '["Leadership", "Conflict Resolution", "Teamwork", "Ethics"]', 'Evaluates leadership capabilities, conflict management, and culture fit.'),
            (NULL, 'AI / Machine Learning Engineer', 'Technical Interview', 'Data Science', 'hard', 20, 5, '["Python", "Machine Learning", "Deep Learning", "Statistics"]', 'Evaluates Python, Model Training, Neural Networks, and ML evaluation metrics.')
        """)
        conn.commit()


    tables = {row["name"] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "interview" in tables:
        conn.execute("""
            INSERT OR IGNORE INTO interview_session (
                id, user_id, candidate_id, interview_type, domain, difficulty, duration, created_at, status, started_at, completed_at, total_score, communication_score, confidence_score, technical_score, professionalism_score, overall_score, performance_rating, strengths_json, weaknesses_json, improvements_json, recommendations_json, resources_json, detailed_parameters_json
            )
            SELECT 
                id, user_id, user_id, interview_type, domain, difficulty, 15, created_at, COALESCE(status, 'created'), started_at, completed_at, total_score, communication_score, confidence_score, technical_score, professionalism_score, overall_score, performance_rating, strengths_json, weaknesses_json, improvements_json, recommendations_json, resources_json, detailed_parameters_json
            FROM interview
        """)
        conn.execute("DROP TABLE interview")

    columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "is_super_admin" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0")

    # Check if interview_session has an old status CHECK constraint that blocks 'paused'
    table_sql = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='interview_session'").fetchone()
    if table_sql and table_sql[0] and "CHECK(status IN" in table_sql[0] and "'paused'" not in table_sql[0]:
        conn.execute("DROP TABLE IF EXISTS interview_session_old")
        conn.execute("ALTER TABLE interview_session RENAME TO interview_session_old")
        conn.execute("""
            CREATE TABLE interview_session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                interview_type TEXT NOT NULL,
                domain TEXT,
                difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
                duration INTEGER NOT NULL DEFAULT 15,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT NOT NULL DEFAULT 'created',
                elapsed_seconds INTEGER NOT NULL DEFAULT 0,
                current_question_index INTEGER NOT NULL DEFAULT 0,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                total_score REAL,
                communication_score REAL,
                confidence_score REAL,
                technical_score REAL,
                professionalism_score REAL,
                overall_score REAL,
                performance_rating TEXT,
                strengths_json TEXT,
                weaknesses_json TEXT,
                improvements_json TEXT,
                recommendations_json TEXT,
                resources_json TEXT,
                detailed_parameters_json TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        old_cols = [r["name"] for r in conn.execute("PRAGMA table_info(interview_session_old)").fetchall()]
        new_cols = [r["name"] for r in conn.execute("PRAGMA table_info(interview_session)").fetchall()]
        common_cols = [c for c in old_cols if c in new_cols]
        cols_str = ", ".join(common_cols)
        conn.execute(f"INSERT INTO interview_session ({cols_str}) SELECT {cols_str} FROM interview_session_old")
        conn.execute("DROP TABLE interview_session_old")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_session_user_id ON interview_session(user_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_session_candidate_id ON interview_session(candidate_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_session_type ON interview_session(interview_type);")

    # Fix any foreign keys on dependent tables (interview_question, interview_recording) automatically updated by SQLite to interview_session_old
    for t_name in ("interview_question", "interview_recording"):
        t_sql = conn.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{t_name}'").fetchone()
        if t_sql and t_sql[0] and "interview_session_old" in t_sql[0]:
            conn.execute(f"DROP TABLE IF EXISTS {t_name}_old")
            conn.execute(f"ALTER TABLE {t_name} RENAME TO {t_name}_old")
            if t_name == "interview_question":
                conn.execute("""
                    CREATE TABLE interview_question (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        interview_id INTEGER NOT NULL,
                        question_text TEXT NOT NULL,
                        category TEXT,
                        difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
                        sequence_no INTEGER NOT NULL,
                        candidate_answer TEXT,
                        score REAL,
                        communication_score REAL,
                        confidence_score REAL,
                        technical_score REAL,
                        professionalism_score REAL,
                        parameters_json TEXT,
                        feedback TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (interview_id) REFERENCES interview_session(id) ON DELETE CASCADE
                    );
                """)
            elif t_name == "interview_recording":
                conn.execute("""
                    CREATE TABLE interview_recording (
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
                """)
            old_cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({t_name}_old)").fetchall()]
            new_cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({t_name})").fetchall()]
            common_cols = [c for c in old_cols if c in new_cols]
            cols_str = ", ".join(common_cols)
            conn.execute(f"INSERT INTO {t_name} ({cols_str}) SELECT {cols_str} FROM {t_name}_old")
            conn.execute(f"DROP TABLE {t_name}_old")

    session_cols = {row["name"] for row in conn.execute("PRAGMA table_info(interview_session)").fetchall()}
    if "candidate_id" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN candidate_id INTEGER")
    if "duration" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN duration INTEGER NOT NULL DEFAULT 15")

    conn.execute("UPDATE interview_session SET candidate_id = user_id WHERE candidate_id IS NULL")
    conn.execute("UPDATE interview_session SET duration = 15 WHERE duration IS NULL")

    if "status" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN status TEXT NOT NULL DEFAULT 'created'")
    if "elapsed_seconds" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN elapsed_seconds INTEGER NOT NULL DEFAULT 0")
    if "current_question_index" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN current_question_index INTEGER NOT NULL DEFAULT 0")
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
    if "grammar_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN grammar_analysis_json TEXT")
    if "filler_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN filler_analysis_json TEXT")
    if "pronunciation_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN pronunciation_analysis_json TEXT")
    if "communication_analysis_json" not in session_cols:
        conn.execute("ALTER TABLE interview_session ADD COLUMN communication_analysis_json TEXT")

    # Fix foreign key constraint if interview_question references old 'interview' table
    q_sql = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='interview_question'").fetchone()
    if q_sql and q_sql[0] and "REFERENCES interview(" in q_sql[0]:
        conn.execute("ALTER TABLE interview_question RENAME TO interview_question_old")
        conn.execute("""
            CREATE TABLE interview_question (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                interview_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                category TEXT,
                difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
                sequence_no INTEGER NOT NULL,
                answer_text TEXT,
                score REAL,
                feedback TEXT,
                communication_score REAL,
                confidence_score REAL,
                technical_score REAL,
                professionalism_score REAL,
                parameters_json TEXT,
                grammar_json TEXT,
                filler_json TEXT,
                pronunciation_json TEXT,
                FOREIGN KEY (interview_id) REFERENCES interview_session(id) ON DELETE CASCADE
            );
        """)
        old_cols = [r["name"] for r in conn.execute("PRAGMA table_info(interview_question_old)").fetchall()]
        new_cols = [r["name"] for r in conn.execute("PRAGMA table_info(interview_question)").fetchall()]
        common_cols = [c for c in old_cols if c in new_cols]
        cols_str = ", ".join(common_cols)
        conn.execute(f"INSERT INTO interview_question ({cols_str}) SELECT {cols_str} FROM interview_question_old")
        conn.execute("DROP TABLE interview_question_old")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_interview_question_interview_id ON interview_question(interview_id);")
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_question_sequence ON interview_question(interview_id, sequence_no);")

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
    if "grammar_json" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN grammar_json TEXT")
    if "filler_json" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN filler_json TEXT")
    if "pronunciation_json" not in question_cols:
        conn.execute("ALTER TABLE interview_question ADD COLUMN pronunciation_json TEXT")

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
