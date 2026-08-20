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
from config import PORT
from database import init_db
from routes import auth, users, interviews, assessments, recruiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        from database import get_db
        from services import scoring_engine
        conn = get_db()
        sessions = conn.execute("SELECT id FROM interview_session WHERE status = 'completed'").fetchall()
        for s in sessions:
            sid = s["id"]
            questions = conn.execute("SELECT * FROM interview_question WHERE interview_id = ?", (sid,)).fetchall()
            answered = [q for q in questions if q["answer_text"] and str(q["answer_text"]).strip()]
            if not answered and questions:
                scoring_engine.generate_final_report(sid, conn)
        conn.close()
    except Exception:
        pass
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
app.include_router(recruiter.router, prefix="/api/recruiter", tags=["Recruiter"])


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
