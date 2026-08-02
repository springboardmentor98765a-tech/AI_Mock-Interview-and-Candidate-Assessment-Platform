from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    phone = Column(String, nullable=True)
    college = Column(String, nullable=True)
    degree = Column(String, nullable=True)
    branch = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    skills = Column(String, nullable=True)
    preferred_role = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    resume = Column(String, nullable=True)
    ats_score = Column(Float, default=0.0)
    interview_score = Column(Float, default=0.0)
    profile_picture = Column(String, nullable=True)

    user = relationship("User", back_populates="candidate_profile")
