import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from backend.auth import require_role
from backend.database import db
from backend.services.resume_service import extract_text_from_pdf
from backend.services.gemini_service import parse_resume_with_gemini

router = APIRouter(prefix="/api/resume", tags=["Resume Upload & Parsing"])

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role(["candidate"]))
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF documents are supported for AI resume parsing."
        )

    file_bytes = await file.read()
    raw_text = extract_text_from_pdf(file_bytes)

    # Parse extracted text with Gemini 2.5 Flash API
    parsed_data = parse_resume_with_gemini(raw_text)
    parsed_data["parsed_at"] = datetime.datetime.now().isoformat()

    user_id = current_user["id"]
    db.resumes[user_id] = {
        "user_id": user_id,
        "filename": file.filename,
        "raw_text": raw_text,
        "parsed_data": parsed_data
    }

    return {
        "message": "Resume successfully uploaded and parsed with Gemini 2.5 Flash",
        "resume": db.resumes[user_id]["parsed_data"]
    }

@router.get("/me")
def get_my_resume(current_user: dict = Depends(require_role(["candidate"]))):
    user_id = current_user["id"]
    resume = db.resumes.get(user_id)
    if not resume:
        return {
            "has_resume": False,
            "parsed_data": None
        }
    return {
        "has_resume": True,
        "parsed_data": resume["parsed_data"]
    }
