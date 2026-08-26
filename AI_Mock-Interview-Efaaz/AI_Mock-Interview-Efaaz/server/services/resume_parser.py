"""Resume parsing service for PDF and DOCX files.

Extracts text from uploaded resume documents and uses Gemini AI to structure
the candidate's skills, projects, work experience, education, and achievements.
"""
import io
import json
import re
import zipfile
import urllib.request
import xml.etree.ElementTree as ET
from fastapi import HTTPException
from config import (
    GEMINI_RESUME_KEY, GEMINI_RESUME_KEY_2,
    GEMINI_RESUME_MODEL, GEMINI_RESUME_MODEL_2,
    GEMINI_API_KEY, GEMINI_MODEL
)


def extract_docx_text(content_bytes: bytes) -> str:
    """Extract plain text from a DOCX file using python standard library zipfile + XML ET."""
    try:
        with zipfile.ZipFile(io.BytesIO(content_bytes)) as zf:
            xml_content = zf.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            texts = []
            for elem in tree.iter():
                if elem.tag.endswith("}t") and elem.text:
                    texts.append(elem.text.strip())
            return " ".join([t for t in texts if t])
    except Exception as e:
        raise ValueError(f"Failed to parse DOCX file: {e}") from e


def extract_pdf_text(content_bytes: bytes) -> str:
    """Extract readable text streams from PDF bytes without requiring heavy binary dependencies."""
    text_parts = []
    # Search for PDF text objects between BT ... ET blocks and TJ/Tj operators
    bt_et_matches = re.findall(rb"BT(.*?)ET", content_bytes, re.DOTALL)
    for block in bt_et_matches:
        # Match literal strings in parentheses (string)
        str_matches = re.findall(rb"\((.*?)\)", block)
        for s in str_matches:
            try:
                decoded = s.decode("utf-8", errors="ignore").strip()
                if decoded and len(decoded) > 1 and not decoded.startswith("/"):
                    text_parts.append(decoded)
            except Exception:
                pass

    extracted = " ".join(text_parts)
    # Fallback: if regex stream extraction yielded too little text, attempt raw printable extraction
    if len(extracted.strip()) < 50:
        clean_text = re.sub(r"[^\x20-\x7E\n\r\t]", " ", content_bytes.decode("latin-1", errors="ignore"))
        words = [w for w in clean_text.split() if len(w) > 2 and not w.startswith("/")]
        extracted = " ".join(words[:1500])

    return extracted.strip()


def parse_resume_content(filename: str, content_bytes: bytes) -> dict:
    """Validate file type & size, extract text, and call Gemini to summarize structured resume context."""
    ext = filename.lower().split(".")[-1]
    if ext not in ["pdf", "docx"]:
        raise HTTPException(400, "Please upload a PDF or DOCX file under 5MB.")

    if len(content_bytes) > 5 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 5MB limit. Please upload a smaller file.")

    if len(content_bytes) == 0:
        raise HTTPException(400, "Uploaded file is empty or corrupted.")

    if ext == "docx":
        try:
            raw_text = extract_docx_text(content_bytes)
        except Exception as e:
            raise HTTPException(400, f"Could not read DOCX file: {e}") from e
    else:
        raw_text = extract_pdf_text(content_bytes)

    if not raw_text or len(raw_text.strip()) < 20:
        raw_text = f"Resume filename: {filename}. (Text extracted from candidate upload document)"

    # Trim to 4000 chars for LLM efficiency
    trimmed_text = raw_text[:4000]

    # Structure resume using Gemini AI
    prompt = (
        "You are an expert HR resume analyzer. Analyze the candidate resume text below and extract a structured JSON summary.\n"
        "Return ONLY a valid JSON object with the following fields:\n"
        "{\n"
        '  "candidate_name": "Full Name or Candidate",\n'
        '  "summary": "2-3 sentence overview of candidate profile and key background",\n'
        '  "skills": ["List", "of", "top", "technical", "and", "soft", "skills"],\n'
        '  "projects": ["Brief descriptions of key projects built or mentioned"],\n'
        '  "experience": ["Work experience, internships, or roles held"],\n'
        '  "education": ["Degrees, university, certifications"],\n'
        '  "key_technologies": ["Tools, frameworks, languages used"]\n'
        "}\n\n"
        f"Resume File: {filename}\n"
        f"Resume Content:\n{trimmed_text}"
    )

    resume_data = None
    key_configs = [
        (GEMINI_RESUME_KEY, GEMINI_RESUME_MODEL or "gemini-3.5-flash-lite"),
        (GEMINI_RESUME_KEY_2, GEMINI_RESUME_MODEL_2 or "gemini-3.1-flash-lite"),
    ]

    for key, primary_model in key_configs:
        if not key:
            continue
        models_to_try = [primary_model, "gemini-2.0-flash-lite", "gemini-1.5-flash-lite", "gemini-flash-latest"]
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            payload = {"contents": [{"parts": [{"text": prompt}]}]}

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    res = json.loads(resp.read().decode("utf-8"))
                    text_out = res["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", text_out.strip(), flags=re.IGNORECASE)
                    resume_data = json.loads(clean_json)
                    break
            except Exception:
                continue
        if resume_data:
            break

    if not resume_data or not isinstance(resume_data, dict):
        # Fallback structured resume object if LLM API is unavailable
        resume_data = {
            "candidate_name": "Candidate",
            "summary": f"Resume uploaded: {filename}.",
            "skills": [w for w in re.findall(r"\b[A-Z][a-z0-9+#.]+\b", trimmed_text) if len(w) > 2][:10],
            "projects": [f"Projects detailed in {filename}"],
            "experience": ["Detailed in uploaded resume"],
            "education": ["Higher Education"],
            "key_technologies": [],
        }

    return {
        "filename": filename,
        "size_mb": round(len(content_bytes) / (1024 * 1024), 2),
        "summary": resume_data.get("summary", f"Resume uploaded: {filename}"),
        "skills": resume_data.get("skills", []),
        "projects": resume_data.get("projects", []),
        "experience": resume_data.get("experience", []),
        "education": resume_data.get("education", []),
        "key_technologies": resume_data.get("key_technologies", []),
        "candidate_name": resume_data.get("candidate_name", "Candidate"),
        "raw_snippet": trimmed_text[:500],
    }
