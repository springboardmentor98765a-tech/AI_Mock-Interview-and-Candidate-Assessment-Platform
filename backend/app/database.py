"""
database.py
=============
SQLAlchemy engine, session factory, and declarative Base.
Also exposes the `get_db` dependency used by FastAPI routes.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# The engine manages the actual connection pool to PostgreSQL
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# Each request gets its own SessionLocal instance
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models inherit from this Base
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session
    and guarantees it is closed after the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
