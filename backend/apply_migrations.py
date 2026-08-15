# ============================================================
#  apply_migrations.py — Auto-apply DB schema & migrations
# ============================================================
import asyncio
import os
import asyncpg
from app.config import settings

async def main():
    print(f"[SmartHire] Connecting to DB: {settings.DATABASE_URL.split('@')[-1]}...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        print("[SmartHire] Connected successfully!")
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        schema_path = os.path.join(base_dir, "Database", "schema.sql")
        mig_path = os.path.join(base_dir, "Database", "migrations", "002_create_interview_tables.sql")
        
        if os.path.exists(schema_path):
            print("[SmartHire] Applying base schema.sql...")
            with open(schema_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            print("[SmartHire] Base schema applied successfully!")
            
        if os.path.exists(mig_path):
            print("[SmartHire] Applying migration 002_create_interview_tables.sql...")
            with open(mig_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            
            # Ensure columns exist if table was previously created
            await conn.execute("""
                ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
                ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES users(id) ON DELETE SET NULL;
                ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50) DEFAULT 'Mid Level';
            """)
            print("[SmartHire] Migration 002 applied successfully!")

            
        mig3_path = os.path.join(base_dir, "Database", "migrations", "003_add_recordings_and_session_fields.sql")
        if os.path.exists(mig3_path):
            print("[SmartHire] Applying migration 003_add_recordings_and_session_fields.sql...")
            with open(mig3_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            print("[SmartHire] Migration 003 applied successfully!")

        mig4_path = os.path.join(base_dir, "Database", "migrations", "004_add_question_timings.sql")
        if os.path.exists(mig4_path):
            print("[SmartHire] Applying migration 004_add_question_timings.sql...")
            with open(mig4_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            print("[SmartHire] Migration 004 applied successfully!")

        mig5_path = os.path.join(base_dir, "Database", "migrations", "005_create_interview_results.sql")
        if os.path.exists(mig5_path):
            print("[SmartHire] Applying migration 005_create_interview_results.sql...")
            with open(mig5_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            print("[SmartHire] Migration 005 applied successfully!")

        mig6_path = os.path.join(base_dir, "Database", "migrations", "006_create_interview_audio_answers.sql")
        if os.path.exists(mig6_path):
            print("[SmartHire] Applying migration 006_create_interview_audio_answers.sql...")
            with open(mig6_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())
            print("[SmartHire] Migration 006 applied successfully!")

        await conn.close()
        print("[SmartHire] All database tables & migrations ready!")

    except Exception as e:
        print(f"[SmartHire] Error applying migrations: {e}")

if __name__ == "__main__":
    asyncio.run(main())
