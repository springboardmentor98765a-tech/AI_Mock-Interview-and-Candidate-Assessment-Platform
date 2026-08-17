from enum import Enum

class DifficultyEnum(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class InterviewTypeEnum(str, Enum):
    HR = "HR"
    TECHNICAL = "Technical"
    BEHAVIORAL = "Behavioral"
    APTITUDE = "Aptitude"
    SALES = "Sales"
    MARKETING = "Marketing"
    FINANCE = "Finance"
    CUSTOMER_SUPPORT = "Customer Support"
    BUSINESS_ANALYST = "Business Analyst"
    PRODUCT_MANAGEMENT = "Product Management"
    DATA_ANALYST = "Data Analyst"
    DATA_SCIENCE = "Data Science"
    DOMAIN_SPECIFIC = "Domain Specific"

class InterviewStatusEnum(str, Enum):
    DRAFT = "Draft"
    GENERATED = "Generated"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class ExperienceLevelEnum(str, Enum):
    ENTRY = "Entry"
    MID = "Mid"
    SENIOR = "Senior"
    EXECUTIVE = "Executive"

class SessionStatusEnum(str, Enum):
    CREATED = "CREATED"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    ENDED = "ENDED"


