import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=True)  # Nullable for GOOGLE provider users
    role = Column(String, nullable=False, default="CANDIDATE")  # CANDIDATE, RECRUITER, ADMIN
    provider = Column(String, nullable=False, default="LOCAL")  # LOCAL, GOOGLE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    recruiter_profile = relationship("RecruiterProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class SystemAuditLog(Base):
    __tablename__ = "system_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    server_status = Column(String, default="PASSED")
    db_status = Column(String, default="PASSED")
    jwt_status = Column(String, default="PASSED")
    storage_status = Column(String, default="PASSED")
    api_status = Column(String, default="PASSED")
    total_users = Column(Integer, default=0)
    total_candidates = Column(Integer, default=0)
    total_recruiters = Column(Integer, default=0)
    total_templates = Column(Integer, default=0)
    total_interviews = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

