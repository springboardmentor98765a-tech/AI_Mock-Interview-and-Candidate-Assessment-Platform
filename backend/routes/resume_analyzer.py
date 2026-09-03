from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import json
import math
from auth import get_current_user
from database import get_db
from services.resume_parser import extract_docx_text, extract_pdf_text
from services import resume_analyzer

router = APIRouter(prefix="/api/resume", tags=["resume-analyzer"])


def _save_analysis(user_id: int, analysis: dict) -> int:
    """Persist a completed analysis for the PREVIOUS SCORE tab. Additive INSERT only."""
    conn = get_db()
    try:
        cur = conn.execute(
            """
            INSERT INTO resume_analyses (user_id, filename, overall_score, experience_level, target_role, source, ai_model, analysis_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                str(analysis.get("filename") or "")[:255],
                float(analysis.get("overall_score") or 0),
                str(analysis.get("experience_level") or ""),
                str(analysis.get("target_role") or "")[:120],
                str(analysis.get("source") or ""),
                str(analysis.get("ai_model") or "")[:80],
                json.dumps(analysis),
            ),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


@router.get("/history")
def resume_history(limit: int = 20, user: dict = Depends(get_current_user)):
    """List this user's saved analyses (newest first)."""
    conn = get_db()
    try:
        rows = conn.execute(
            """
            SELECT id, filename, overall_score, experience_level, target_role, source, ai_model, created_at
            FROM resume_analyses WHERE user_id = ?
            ORDER BY id DESC LIMIT ?
            """,
            (user["id"], max(1, min(50, limit))),
        ).fetchall()
        return {"history": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "overall_score": r["overall_score"],
                "experience_level": r["experience_level"],
                "target_role": r["target_role"],
                "source": r["source"],
                "ai_model": r["ai_model"],
                "created_at": r["created_at"],
            } for r in rows
        ]}
    finally:
        conn.close()


@router.get("/history/{analysis_id}")
def get_saved_analysis(analysis_id: int, user: dict = Depends(get_current_user)):
    """Fetch one saved analysis (owner only)."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, analysis_json, created_at FROM resume_analyses WHERE id = ? AND user_id = ?",
            (analysis_id, user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Saved analysis not found.")
        try:
            analysis = json.loads(row["analysis_json"])
        except Exception:
            raise HTTPException(500, "Saved analysis is corrupted.")
        return {"id": row["id"], "created_at": row["created_at"], "analysis": analysis}
    finally:
        conn.close()


@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    experience_level: str = Form("entry"),
    target_role: str = Form(""),
    user: dict = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(400, "Invalid file name.")
    content = await file.read()
    ext = (file.filename or "").lower().split(".")[-1]
    if ext not in ["pdf", "docx"]:
        raise HTTPException(400, "Please upload a PDF or DOCX resume.")
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 5MB limit.")
    if len(content) == 0:
        raise HTTPException(400, "Uploaded file is empty or corrupted.")

    if ext == "docx":
        raw_text = extract_docx_text(content)
    else:
        raw_text = extract_pdf_text(content)

    if not raw_text or len(raw_text.strip()) < 20:
        raise HTTPException(
            400,
            "We could not read selectable text from this file. If it is a scanned image, please upload a text-based PDF.",
        )

    level = (experience_level or "entry").lower()
    if level not in ("student", "entry", "mid", "senior", "switcher"):
        level = "entry"

    result = resume_analyzer.analyze_resume(
        file.filename, content, raw_text, experience_level=level, target_role=(target_role or "").strip()
    )
    try:
        result["analysis_id"] = _save_analysis(user["id"], result)
    except Exception as exc:
        # Saving history must never break the analysis itself.
        print(f"[resume_analyzer] could not save history: {exc}")
    return {"message": "Resume analysis complete.", "analysis": result}
