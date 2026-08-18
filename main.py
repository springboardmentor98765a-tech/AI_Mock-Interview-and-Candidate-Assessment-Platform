import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.routers import auth_router, resume_router, interview_router, analytics_router

app = FastAPI(
    title=settings.APP_NAME,
    description="Full-Stack AI-Driven Interview Platform powered by Google Gemini 2.5 Flash API & FastAPI.",
    version="2.0.0"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router.router)
app.include_router(resume_router.router)
app.include_router(interview_router.router)
app.include_router(analytics_router.router)

# Mount frontend static files if available
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

@app.get("/")
def read_root():
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AI-Driven Interview Platform API is operational."}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "gemini_model": settings.GEMINI_MODEL,
        "gemini_key_configured": bool(settings.GEMINI_API_KEY)
    }

# Serve CSS & JS files directly
@app.get("/{filename}")
def serve_static(filename: str):
    allowed_files = ["index.html", "style.css", "app.js"]
    if filename in allowed_files:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            media_type = "text/html" if filename.endswith(".html") else ("text/css" if filename.endswith(".css") else "application/javascript")
            return FileResponse(filepath, media_type=media_type)
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
