import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Harshitha19@localhost:5432/smarthire_ai")

# PostgreSQL primary configuration with fallback for seamless evaluation
try:
    if DATABASE_URL.startswith("postgresql"):
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        # Test connection quickly
        with engine.connect() as conn:
            pass
    else:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
except Exception as e:
    print(f"Warning: Primary PostgreSQL connection failed ({e}). Falling back to local SQLite database for development.")
    FALLBACK_DB_URL = "sqlite:///./smarthire_ai.db"
    engine = create_engine(FALLBACK_DB_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
