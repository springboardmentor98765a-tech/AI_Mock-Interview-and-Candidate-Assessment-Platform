import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import threading
from config import PORT
from database import init_db
from routes import auth, users, interviews, assessments, recruiter, notifications
from routes import resume_analyzer


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        from services import vision_monitor
        threading.Thread(target=vision_monitor.warm_up, daemon=True).start()
    except Exception as exc:
        print(f"  [vision] warm-up skipped: {exc}")
    yield


app = FastAPI(title="SmartHire AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(interviews.router)
app.include_router(assessments.router)
app.include_router(notifications.router)
app.include_router(recruiter.router, prefix="/api/recruiter", tags=["Recruiter"])
app.include_router(resume_analyzer.router)


frontend_dir = os.path.join(os.path.dirname(__file__), "..")


from fastapi.responses import FileResponse, Response

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    print(f"\n  SmartHire AI running at: http://localhost:{PORT}\n")
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, reload=False)
