import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import bcrypt
import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = os.getenv("DATABASE_PORT", "5432")
DATABASE_NAME = os.getenv("DATABASE_NAME", "SmartHire_AI")
DATABASE_USER = os.getenv("DATABASE_USER", "postgres")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD")

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "SmartHireAI_SUPER_SECRET_KEY_CHANGE_THIS"
)

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="SmartHire AI API",
    description="AI-Powered Interview & Candidate Assessment Platform",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE
# =========================================================

def get_db_connection():
    try:
        return psycopg2.connect(
            host=DATABASE_HOST,
            port=DATABASE_PORT,
            database=DATABASE_NAME,
            user=DATABASE_USER,
            password=DATABASE_PASSWORD
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(error)}"
        )


# =========================================================
# CREATE INTERVIEW HISTORY TABLE
# =========================================================

def ensure_interview_history_table():

    connection = None
    cursor = None

    try:

        connection = psycopg2.connect(
            host=DATABASE_HOST,
            port=DATABASE_PORT,
            database=DATABASE_NAME,
            user=DATABASE_USER,
            password=DATABASE_PASSWORD
        )

        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS interview_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                role VARCHAR(150),
                interview_type VARCHAR(100),
                difficulty VARCHAR(50),
                score INTEGER DEFAULT 0,
                performance VARCHAR(100),
                total_questions INTEGER DEFAULT 0,
                answered_questions INTEGER DEFAULT 0,
                strengths TEXT,
                improvements TEXT,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )

        connection.commit()

    except Exception as error:

        print(
            "Interview history table setup warning:",
            error
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.on_event("startup")
def startup_event():

    ensure_interview_history_table()

    print("SmartHire AI backend started successfully.")


# =========================================================
# PASSWORD
# =========================================================

def hash_password(password: str) -> str:

    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password cannot be longer than 72 bytes."
        )

    return bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    password: str,
    password_hash: str
) -> bool:

    try:

        password_bytes = password.encode("utf-8")

        if len(password_bytes) > 72:
            return False

        return bcrypt.checkpw(
            password_bytes,
            password_hash.encode("utf-8")
        )

    except Exception:
        return False


# =========================================================
# JWT
# =========================================================

def create_access_token(
    user_id: int,
    email: str,
    role: str
):

    expire = (
        datetime.now(timezone.utc)
        + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def get_current_user(
    authorization: Optional[str] = Header(default=None)
):

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Authorization header is required."
        )

    if not authorization.startswith("Bearer "):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization format."
        )

    token = authorization.replace(
        "Bearer ",
        "",
        1
    ).strip()

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Access token is missing."
        )

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Invalid token: user ID missing."
            )

        if not email:

            raise HTTPException(
                status_code=401,
                detail="Invalid token: email missing."
            )

        if not role:

            raise HTTPException(
                status_code=401,
                detail="Invalid token: role missing."
            )

        return {
            "id": int(user_id),
            "email": email,
            "role": str(role).upper()
        }

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token."
        )

    except ValueError:

        raise HTTPException(
            status_code=401,
            detail="Invalid user ID in token."
        )


# =========================================================
# ROLE AUTHORIZATION
# =========================================================

def require_role(*allowed_roles):

    def role_checker(
        current_user=Depends(get_current_user)
    ):

        if current_user["role"].upper() not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Access denied. Required role(s): "
                    + ", ".join(allowed_roles)
                )
            )

        return current_user

    return role_checker


# =========================================================
# MODELS
# =========================================================

class RegisterRequest(BaseModel):

    full_name: str
    email: EmailStr
    password: str
    role: str


class LoginRequest(BaseModel):

    email: EmailStr
    password: str


class InterviewGenerateRequest(BaseModel):

    role: str
    interview_type: str
    difficulty: str
    number_of_questions: int = 5


class InterviewAnswer(BaseModel):

    question: str
    answer: str


class InterviewAssessRequest(BaseModel):

    role: str
    interview_type: str
    difficulty: Optional[str] = "Intermediate"
    answers: List[InterviewAnswer]


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "SmartHire AI Backend is running",
        "version": "1.0.0"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health_check():

    return {
        "success": True,
        "status": "healthy",
        "message": "SmartHire AI API is working"
    }


@app.get("/api/health/database")
def database_health_check():

    connection = None

    try:

        connection = get_db_connection()

        cursor = connection.cursor()

        cursor.execute("SELECT 1")

        cursor.fetchone()

        cursor.close()
        connection.close()

        return {
            "success": True,
            "status": "connected",
            "database": DATABASE_NAME,
            "message": "PostgreSQL connection successful"
        }

    except Exception as error:

        if connection:
            connection.close()

        return {
            "success": False,
            "status": "disconnected",
            "error": str(error)
        }


# =========================================================
# REGISTER
# =========================================================

@app.post("/api/auth/register")
def register_user(request: RegisterRequest):

    connection = None
    cursor = None

    try:

        role = request.role.upper()

        allowed_roles = [
            "CANDIDATE",
            "RECRUITER",
            "ADMIN"
        ]

        if role not in allowed_roles:

            raise HTTPException(
                status_code=400,
                detail="Invalid role."
            )

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = %s
            """,
            (request.email,)
        )

        if cursor.fetchone():

            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists."
            )

        password_hash = hash_password(
            request.password
        )

        cursor.execute(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password_hash,
                role,
                is_active,
                created_at,
                updated_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                TRUE,
                NOW(),
                NOW()
            )
            RETURNING id, full_name, email, role, is_active
            """,
            (
                request.full_name,
                request.email,
                password_hash,
                role
            )
        )

        user = cursor.fetchone()

        connection.commit()

        return {
            "success": True,
            "message": "Account created successfully",
            "user": {
                "id": user[0],
                "full_name": user[1],
                "email": user[2],
                "role": user[3],
                "is_active": user[4]
            }
        }

    except HTTPException:

        if connection:
            connection.rollback()

        raise

    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Registration failed: {str(error)}"
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# LOGIN
# =========================================================

@app.post("/api/auth/login")
def login_user(request: LoginRequest):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                password_hash,
                role,
                is_active
            FROM users
            WHERE email = %s
            """,
            (request.email,)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        (
            user_id,
            full_name,
            email,
            password_hash,
            role,
            is_active
        ) = user

        if not is_active:

            raise HTTPException(
                status_code=403,
                detail="This account has been deactivated."
            )

        if not verify_password(
            request.password,
            password_hash
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password."
            )

        access_token = create_access_token(
            user_id,
            email,
            role
        )

        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": full_name,
                "full_name": full_name,
                "email": email,
                "role": role,
                "is_active": is_active
            }
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(error)}"
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/api/auth/me")
def get_my_profile(
    current_user=Depends(get_current_user)
):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE id = %s
            """,
            (current_user["id"],)
        )

        user = cursor.fetchone()

        if not user:

            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        return {
            "success": True,
            "user": {
                "id": user[0],
                "name": user[1],
                "full_name": user[1],
                "email": user[2],
                "role": user[3],
                "is_active": user[4],
                "created_at": user[5]
            }
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# DASHBOARDS
# =========================================================

@app.get("/api/candidate/dashboard")
def candidate_dashboard(
    current_user=Depends(
        require_role("CANDIDATE")
    )
):

    return {
        "success": True,
        "message": "Welcome to the Candidate Dashboard",
        "user": current_user,
        "access": "CANDIDATE"
    }


@app.get("/api/recruiter/dashboard")
def recruiter_dashboard(
    current_user=Depends(
        require_role("RECRUITER")
    )
):

    return {
        "success": True,
        "message": "Welcome to the Recruiter Dashboard",
        "user": current_user,
        "access": "RECRUITER"
    }


@app.get("/api/admin/dashboard")
def admin_dashboard(
    current_user=Depends(
        require_role("ADMIN")
    )
):

    return {
        "success": True,
        "message": "Welcome to the Admin Dashboard",
        "user": current_user,
        "access": "ADMIN"
    }


# =========================================================
# CANDIDATES
# =========================================================

@app.get("/api/recruiter/candidates")
def recruiter_candidates(
    current_user=Depends(
        require_role("RECRUITER", "ADMIN")
    )
):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE role = 'CANDIDATE'
            ORDER BY created_at DESC
            """
        )

        rows = cursor.fetchall()

        candidates = []

        for row in rows:

            candidates.append({
                "id": row[0],
                "full_name": row[1],
                "email": row[2],
                "role": row[3],
                "is_active": row[4],
                "created_at": row[5]
            })

        return {
            "success": True,
            "count": len(candidates),
            "candidates": candidates
        }

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# INTERVIEW QUESTIONS
# =========================================================

INTERVIEW_QUESTIONS = {

    "Technical": {

        "Software Developer": {

            "Beginner": [
                "What is the difference between a variable and a constant?",
                "What are the main principles of object-oriented programming?",
                "What is the purpose of a function in programming?",
                "What is the difference between an array and a list?",
                "What is version control and why is Git commonly used?"
            ],

            "Intermediate": [
                "Explain the difference between a stack and a queue and give a practical use case for each.",
                "What is the difference between SQL and NoSQL databases?",
                "Explain REST APIs and how a frontend application communicates with a backend.",
                "What is the difference between authentication and authorization?",
                "How would you debug a performance issue in a web application?"
            ],

            "Advanced": [
                "How would you design a scalable web application that supports millions of users?",
                "Explain database indexing and discuss situations where indexes can hurt performance.",
                "What are microservices and what are their advantages and disadvantages?",
                "How would you design an efficient caching strategy for a high-traffic application?",
                "Explain how you would identify and fix a memory leak in a production application."
            ]
        },

        "Frontend Developer": {

            "Beginner": [
                "What is the difference between HTML, CSS and JavaScript?",
                "What is the DOM?",
                "What is responsive web design?",
                "What is the difference between class and id in HTML?",
                "Why is JavaScript used in frontend development?"
            ],

            "Intermediate": [
                "Explain how React components and props work.",
                "What is the difference between state and props in React?",
                "What is the virtual DOM?",
                "How would you improve the performance of a React application?",
                "Explain how asynchronous JavaScript works."
            ],

            "Advanced": [
                "How would you architect a large React application?",
                "Explain code splitting and lazy loading in frontend applications.",
                "How would you optimize Core Web Vitals?",
                "How would you secure a frontend application against common web attacks?",
                "How would you design a reusable component system for a large product?"
            ]
        },

        "Backend Developer": {

            "Beginner": [
                "What is an API?",
                "What is the purpose of a database?",
                "What is HTTP?",
                "What is the difference between GET and POST requests?",
                "What is server-side programming?"
            ],

            "Intermediate": [
                "Explain REST API architecture.",
                "What is middleware and why is it useful?",
                "Explain JWT authentication.",
                "What is database normalization?",
                "How would you handle errors in a backend API?"
            ],

            "Advanced": [
                "How would you design a highly scalable REST API?",
                "How would you handle millions of concurrent API requests?",
                "Explain database transactions and isolation levels.",
                "How would you implement distributed caching?",
                "How would you monitor and troubleshoot a production backend system?"
            ]
        },

        "Full Stack Developer": {

            "Beginner": [
                "What is the role of frontend and backend in a web application?",
                "How does a browser communicate with a server?",
                "What is an API?",
                "What is a database?",
                "What is Git and why is it important?"
            ],

            "Intermediate": [
                "Explain the complete flow of a user login from frontend to database.",
                "How would you connect a React frontend to a FastAPI backend?",
                "Explain JWT authentication in a full-stack application.",
                "How would you design the database for a user management system?",
                "How would you debug an API request that is failing from the frontend?"
            ],

            "Advanced": [
                "How would you architect a production-ready full-stack application?",
                "How would you scale both frontend and backend services?",
                "How would you secure authentication across a full-stack application?",
                "How would you design a real-time notification system?",
                "How would you deploy and monitor a full-stack application?"
            ]
        },

        "Data Analyst": {

            "Beginner": [
                "What is data analysis?",
                "What is the difference between structured and unstructured data?",
                "What is SQL?",
                "What is a database?",
                "What is data visualization?"
            ],

            "Intermediate": [
                "Explain the difference between INNER JOIN and LEFT JOIN.",
                "How do you handle missing values in a dataset?",
                "What is the difference between mean, median and mode?",
                "How would you identify outliers in a dataset?",
                "How would you present analytical findings to a non-technical audience?"
            ],

            "Advanced": [
                "How would you design an end-to-end analytics pipeline?",
                "How would you detect anomalies in a large dataset?",
                "Explain the difference between correlation and causation.",
                "How would you measure the reliability of an analytical model?",
                "How would you communicate uncertainty in business analytics?"
            ]
        },

        "Python Developer": {

            "Beginner": [
                "What are the main features of Python?",
                "What is the difference between a list and a tuple in Python?",
                "What is a Python dictionary?",
                "What are functions in Python?",
                "What is exception handling?"
            ],

            "Intermediate": [
                "Explain list comprehensions in Python.",
                "What is the difference between shallow copy and deep copy?",
                "What are decorators in Python?",
                "How does exception handling work in Python?",
                "How would you optimize a slow Python program?"
            ],

            "Advanced": [
                "Explain Python memory management.",
                "What is the Global Interpreter Lock?",
                "How would you design a scalable Python backend?",
                "Compare multiprocessing, multithreading and asynchronous programming.",
                "How would you profile and optimize a Python application?"
            ]
        }
    },

    "HR": {
        "default": [
            "Tell me about yourself and your professional background.",
            "Why do you want to work in this role?",
            "What are your greatest strengths?",
            "What is one area you are currently trying to improve?",
            "Where do you see yourself in the next few years?"
        ]
    },

    "Behavioral": {
        "default": [
            "Tell me about a challenging project you worked on and how you handled it.",
            "Describe a situation where you had to work with a difficult team member.",
            "Tell me about a time you made a mistake and what you learned from it.",
            "Describe a situation where you had to learn something quickly.",
            "Tell me about a time when you demonstrated leadership."
        ]
    },

    "Mixed": {
        "default": [
            "Tell me about yourself and your technical background.",
            "Explain a technical project that you are proud of.",
            "Describe a difficult problem you solved.",
            "How do you handle pressure or tight deadlines?",
            "Why should we consider you for this role?"
        ]
    }
}


# =========================================================
# GENERATE QUESTIONS
# =========================================================

@app.post("/api/interview/generate")
def generate_interview(
    request: InterviewGenerateRequest
):

    interview_type = request.interview_type.strip()
    role = request.role.strip()
    difficulty = request.difficulty.strip()

    number = max(
        1,
        min(request.number_of_questions, 10)
    )

    if interview_type == "Technical":

        role_questions = INTERVIEW_QUESTIONS["Technical"]

        questions = role_questions.get(
            role,
            role_questions["Software Developer"]
        ).get(
            difficulty,
            role_questions["Software Developer"]["Intermediate"]
        )

    elif interview_type == "HR":

        questions = INTERVIEW_QUESTIONS["HR"]["default"]

    elif interview_type == "Behavioral":

        questions = INTERVIEW_QUESTIONS["Behavioral"]["default"]

    else:

        questions = INTERVIEW_QUESTIONS["Mixed"]["default"]

    selected_questions = []

    for index in range(number):

        selected_questions.append(
            questions[index % len(questions)]
        )

    return {
        "success": True,
        "message": "Interview questions generated successfully",
        "role": role,
        "interview_type": interview_type,
        "difficulty": difficulty,
        "number_of_questions": len(selected_questions),
        "questions": selected_questions
    }


# =========================================================
# ASSESS INTERVIEW
# =========================================================

@app.post("/api/interview/assess")
def assess_interview(
    request: InterviewAssessRequest,
    current_user=Depends(get_current_user)
):

    if current_user["role"] != "CANDIDATE":

        raise HTTPException(
            status_code=403,
            detail="Only candidates can submit interviews."
        )

    if not request.answers:

        raise HTTPException(
            status_code=400,
            detail="No interview answers were submitted."
        )

    total_answers = len(request.answers)

    answered_count = 0
    total_characters = 0

    strengths = []
    improvements = []

    for item in request.answers:

        answer_text = item.answer.strip()

        character_count = len(answer_text)

        total_characters += character_count

        if character_count >= 20:

            answered_count += 1

        if character_count >= 150:

            strengths.append(
                "Provided detailed and well-developed answers."
            )

        elif character_count >= 80:

            strengths.append(
                "Provided reasonably clear answers."
            )

        else:

            improvements.append(
                "Give more detailed explanations and examples."
            )

    completion_score = (
        answered_count / total_answers
    ) * 50

    average_length = (
        total_characters / total_answers
    )

    if average_length >= 250:
        quality_score = 50

    elif average_length >= 150:
        quality_score = 42

    elif average_length >= 100:
        quality_score = 35

    elif average_length >= 50:
        quality_score = 27

    else:
        quality_score = 18

    score = round(
        completion_score + quality_score
    )

    score = max(
        0,
        min(score, 100)
    )

    strengths = list(
        dict.fromkeys(strengths)
    )

    improvements = list(
        dict.fromkeys(improvements)
    )

    if not strengths:

        strengths = [
            "You completed the interview."
        ]

    if not improvements:

        improvements = [
            "Continue practicing with realistic interview questions.",
            "Use specific examples to make your answers stronger."
        ]

    if score >= 80:

        performance = "Excellent"

    elif score >= 60:

        performance = "Good"

    elif score >= 40:

        performance = "Developing"

    else:

        performance = "Needs Improvement"

    summary = (
        f"You completed {answered_count} out of "
        f"{total_answers} questions. "
        f"Your current interview performance is "
        f"rated {performance}."
    )


    # =====================================================
    # SAVE INTERVIEW HISTORY
    # =====================================================

    connection = None
    cursor = None

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO interview_history
            (
                user_id,
                role,
                interview_type,
                difficulty,
                score,
                performance,
                total_questions,
                answered_questions,
                strengths,
                improvements,
                summary,
                created_at
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                NOW()
            )
            RETURNING id, created_at
            """,
            (
                current_user["id"],
                request.role,
                request.interview_type,
                request.difficulty,
                score,
                performance,
                total_answers,
                answered_count,
                "\n".join(strengths),
                "\n".join(improvements),
                summary
            )
        )

        history_row = cursor.fetchone()

        connection.commit()

        history_id = history_row[0]
        created_at = history_row[1]

    except Exception as error:

        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Unable to save interview history: {str(error)}"
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


    return {

        "success": True,

        "message":
            "Interview assessment completed successfully",

        "history_id":
            history_id,

        "role":
            request.role,

        "interview_type":
            request.interview_type,

        "difficulty":
            request.difficulty,

        "overall_score":
            score,

        "score":
            score,

        "performance":
            performance,

        "total_questions":
            total_answers,

        "answered_questions":
            answered_count,

        "strengths":
            strengths,

        "improvements":
            improvements,

        "summary":
            summary,

        "created_at":
            created_at
    }


# =========================================================
# INTERVIEW HISTORY
# =========================================================

@app.get("/api/interview/history")
def get_interview_history(
    current_user=Depends(get_current_user)
):

    connection = None
    cursor = None

    try:

        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                role,
                interview_type,
                difficulty,
                score,
                performance,
                total_questions,
                answered_questions,
                strengths,
                improvements,
                summary,
                created_at
            FROM interview_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (current_user["id"],)
        )

        rows = cursor.fetchall()

        history = []

        for row in rows:

            # =================================================
            # SAFE STRENGTHS CONVERSION
            # =================================================

            raw_strengths = row[8]

            if raw_strengths is None:

                strengths = []

            elif isinstance(raw_strengths, list):

                strengths = raw_strengths

            elif isinstance(raw_strengths, tuple):

                strengths = list(raw_strengths)

            elif isinstance(raw_strengths, str):

                strengths = [
                    item.strip()
                    for item in raw_strengths.split("\n")
                    if item.strip()
                ]

            else:

                strengths = [
                    str(raw_strengths)
                ]


            # =================================================
            # SAFE IMPROVEMENTS CONVERSION
            # =================================================

            raw_improvements = row[9]

            if raw_improvements is None:

                improvements = []

            elif isinstance(raw_improvements, list):

                improvements = raw_improvements

            elif isinstance(raw_improvements, tuple):

                improvements = list(raw_improvements)

            elif isinstance(raw_improvements, str):

                improvements = [
                    item.strip()
                    for item in raw_improvements.split("\n")
                    if item.strip()
                ]

            else:

                improvements = [
                    str(raw_improvements)
                ]


            # =================================================
            # HISTORY OBJECT
            # =================================================

            history.append({

                "id":
                    row[0],

                "role":
                    row[1],

                "interview_type":
                    row[2],

                "difficulty":
                    row[3],

                "score":
                    row[4] or 0,

                "overall_score":
                    row[4] or 0,

                "performance":
                    row[5] or "Not Available",

                "total_questions":
                    row[6] or 0,

                "answered_questions":
                    row[7] or 0,

                "strengths":
                    strengths,

                "improvements":
                    improvements,

                "summary":
                    row[10] or "",

                "created_at":
                    row[11]

            })


        # =================================================
        # PERFORMANCE SUMMARY
        # =================================================

        total_interviews = len(history)

        if total_interviews > 0:

            scores = []

            for item in history:

                score_value = item.get("score")

                if isinstance(
                    score_value,
                    (int, float)
                ):

                    scores.append(score_value)

                else:

                    try:

                        scores.append(
                            float(score_value)
                        )

                    except (ValueError, TypeError):

                        pass


            if scores:

                average_score = round(
                    sum(scores) / len(scores)
                )

            else:

                average_score = 0


            latest_score = history[0]["score"]

            latest_performance = (
                history[0]["performance"]
            )

        else:

            average_score = 0

            latest_score = 0

            latest_performance = "No interviews yet"


        # =================================================
        # RESPONSE
        # =================================================

        return {

            "success": True,

            "summary": {

                "total_interviews":
                    total_interviews,

                "average_score":
                    average_score,

                "latest_score":
                    latest_score,

                "performance":
                    latest_performance
            },

            "total_interviews":
                total_interviews,

            "average_score":
                average_score,

            "latest_score":
                latest_score,

            "performance":
                latest_performance,

            "history":
                history
        }


    except HTTPException:

        raise


    except Exception as error:

        print(
            "Interview history error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to retrieve interview history: "
                f"{str(error)}"
            )
        )

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# INTERVIEW STATUS
# =========================================================

@app.get("/api/interview/status")
def interview_status():

    return {
        "success": True,
        "module": "AI Mock Interview",
        "status": "ready",
        "features": [
            "Question generation",
            "Interactive interview",
            "Answer submission",
            "AI assessment",
            "Performance scoring",
            "Interview history",
            "Candidate performance tracking"
        ]
    }