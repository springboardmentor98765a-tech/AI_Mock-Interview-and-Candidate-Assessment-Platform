import os
import secrets
import bcrypt

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from jose import jwt
from dotenv import load_dotenv

from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from app.database import get_connection


load_dotenv()

app = FastAPI(title="SmartHire AI Authentication API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SECRET_KEY = os.getenv("JWT_SECRET", "smarthire_secret_key")
ALGORITHM = "HS256"

app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")


oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.get("/")
def home():
    return {"message": "SmartHire AI Backend is running"}


@app.get("/test-db")
def test_database():
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT current_database();")
        database_name = cursor.fetchone()[0]
        cursor.close()
        connection.close()
        return {"status": "success", "database": database_name}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/register")
def register_user(user: RegisterRequest):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT id FROM users WHERE email=%s", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = bcrypt.hashpw(
        user.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    cursor.execute(
        """
        INSERT INTO users (name,email,password,role,provider)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id,name,email,role,provider
        """,
        (user.name, user.email, hashed_password, user.role, "local")
    )

    new_user = cursor.fetchone()
    connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "Registration successful",
        "user": {
            "id": new_user[0],
            "name": new_user[1],
            "email": new_user[2],
            "role": new_user[3],
            "provider": new_user[4],
        },
    }


@app.post("/login")
def login_user(user: LoginRequest):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "SELECT id,name,email,password,role,provider FROM users WHERE email=%s",
        (user.email,),
    )

    existing_user = cursor.fetchone()

    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id, name, email, stored_password, role, provider = existing_user

    if not bcrypt.checkpw(user.password.encode("utf-8"), stored_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = jwt.encode(
        {"id": user_id, "email": email, "role": role},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    cursor.close()
    connection.close()

    return {
        "message": "Login successful",
        "access_token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "provider": provider,
        },
    }


@app.get("/auth/google")
async def google_login(request: Request, role: str = "Candidate"):
    request.session["oauth_role"] = role
    redirect_uri = "http://127.0.0.1:8000/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/google/callback")
async def google_callback(request: Request):
    token = await oauth.google.authorize_access_token(request)
    user_info = token["userinfo"]

    email = user_info.get("email")
    name = user_info.get("name") or (email.split("@")[0] if email else "Google User")
    role = request.session.pop("oauth_role", "Candidate")

    if not email:
        raise HTTPException(status_code=400, detail="Google did not return an email")

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        "SELECT id,name,email,role,provider FROM users WHERE email=%s",
        (email,),
    )
    existing_user = cursor.fetchone()

    if existing_user:
        user_id, name, email, role, provider = existing_user
    else:
        random_password = bcrypt.hashpw(
            secrets.token_hex(16).encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute(
            """
            INSERT INTO users (name,email,password,role,provider)
            VALUES (%s,%s,%s,%s,%s)
            RETURNING id,name,email,role,provider
            """,
            (name, email, random_password, role, "google"),
        )
        new_user = cursor.fetchone()
        connection.commit()
        user_id, name, email, role, provider = new_user

    cursor.close()
    connection.close()

    jwt_token = jwt.encode(
        {"id": user_id, "email": email, "role": role},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    redirect_url = (
        f"{FRONTEND_URL}/oauth-success.html"
        f"?token={jwt_token}&name={name}&role={role}&email={email}"
    )
    return RedirectResponse(redirect_url)

@app.get("/admin/stats")
def admin_stats():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role='Recruiter'")
    total_recruiters = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role='Candidate'")
    total_candidates = cursor.fetchone()[0]

    cursor.close()
    connection.close()

    return {
        "total_users": total_users,
        "total_recruiters": total_recruiters,
        "total_candidates": total_candidates,
    }

@app.get("/admin/users")
def admin_users():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT id, name, email, role, provider FROM users ORDER BY id DESC")
    rows = cursor.fetchall()

    cursor.close()
    connection.close()

    return [
        {
            "id": row[0],
            "name": row[1],
            "email": row[2],
            "role": row[3],
            "provider": row[4],
        }
        for row in rows
    ]