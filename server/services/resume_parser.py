"""Resume parsing service for PDF and DOCX files.

Extracts text from uploaded resume documents and uses Gemini AI to structure
the candidate's skills, projects, work experience, education, and achievements.
"""
import io
import json
import re
import zipfile
import zlib
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


def _unescape_pdf_string(raw: bytes) -> str:
    """Decode a PDF literal string: escapes (\\( \\) \\\\ \\n \\r \\t \\ddd) and UTF-16/latin text."""
    out = bytearray()
    i = 0
    while i < len(raw):
        b = raw[i:i + 1]
        if b == b"\\" and i + 1 < len(raw):
            nxt = raw[i + 1:i + 2]
            simple = {b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"", b"f": b"", b"(": b"(", b")": b")", b"\\": b"\\"}
            if nxt in simple:
                out += simple[nxt]
                i += 2
                continue
            # octal escape \ddd (1-3 digits)
            m = re.match(rb"\\([0-7]{1,3})", raw[i:i + 4])
            if m:
                try:
                    out.append(int(m.group(1), 8))
                    i += 1 + len(m.group(1))
                    continue
                except Exception:
                    pass
            i += 2
            continue
        out += b
        i += 1
    try:
        return out.decode("utf-8")
    except Exception:
        return out.decode("latin-1", errors="ignore")


def _decode_hex_string(hex_bytes: bytes) -> str:
    """Decode a PDF hex string <48656C6C6F> or UTF-16BE <FEFF0048...>."""
    # strip whitespace inside hex
    s = re.sub(rb"\s", b"", hex_bytes)
    if len(s) % 2 == 1:
        s += b"0"
    try:
        raw = bytes.fromhex(s.decode("ascii"))
    except Exception:
        return ""
    if not raw:
        return ""
    # UTF-16BE with BOM
    if raw.startswith(b"\xfe\xff"):
        try:
            return raw[2:].decode("utf-16be").strip()
        except Exception:
            pass
    # Heuristic: contains null bytes -> likely UTF-16BE
    if b"\x00" in raw:
        try:
            # even length check
            if len(raw) % 2 == 0:
                decoded = raw.decode("utf-16be")
                # sanity: mostly printable
                if sum(1 for c in decoded if c.isprintable() or c in "\n\r\t ") / max(1, len(decoded)) > 0.6:
                    return decoded.strip()
        except Exception:
            pass
    # Fall back to utf-8 / latin1
    try:
        return raw.decode("utf-8").strip()
    except Exception:
        return raw.decode("latin-1", errors="ignore").strip()


def _extract_bt_et_text(data: bytes) -> str:
    """Pull readable text from BT..ET text blocks (Tj / TJ operators).

    Handles both parenthesized literal strings ( ... ) and hex strings <...>,
    and correctly concatenates TJ-array fragments like [(Summ)3(er )] -> 'Summer '.
    Each BT..ET block is treated as one logical text line; fragments inside
    the block are concatenated directly (kerning numbers are ignored), blocks
    are separated by newlines. Blocks without a real text-showing operator
    (Tj/TJ/') are ignored — this filters false positives from binary image
    streams that happen to contain the bytes 'BT'/'ET'.
    """
    parts = []
    for block in re.findall(rb"BT(.*?)ET", data, re.DOTALL):
        # Must contain a text-showing operator to be a real text object
        if b"Tj" not in block and b"TJ" not in block and b"'" not in block and b'"' not in block:
            continue
        block_parts = []
        # Iterate tokens in order: literal strings or hex strings
        for m in re.finditer(rb"\((?:[^()\\]|\\.)*?\)|<[0-9A-Fa-f\s]+>", block):
            token = m.group(0)
            if token.startswith(b"("):
                inner = token[1:-1]
                decoded = _unescape_pdf_string(inner)
                if not decoded or not decoded.strip():
                    # keep single spaces that are intentional kerning gaps
                    if decoded == " ":
                        block_parts.append(" ")
                    continue
                if decoded.strip().startswith("/"):
                    continue
                # Discard strings that are mostly non-printable/binary
                printable = sum(1 for c in decoded if 32 <= ord(c) <= 126 or c in "\n\r\t\u00a0")
                if printable / max(1, len(decoded)) < 0.6:
                    continue
                block_parts.append(decoded)
            else:
                inner = token[1:-1]
                # Ignore empty hex like <> and very long hex that is likely not text
                if len(inner.strip()) == 0 or len(inner) > 800:
                    continue
                decoded = _decode_hex_string(inner)
                if not decoded or not decoded.strip():
                    continue
                if decoded.strip().startswith("/"):
                    continue
                printable = sum(1 for c in decoded if 32 <= ord(c) <= 126 or c in "\n\r\t\u00a0")
                if printable / max(1, len(decoded)) < 0.6:
                    continue
                block_parts.append(decoded)
        if block_parts:
            block_text = "".join(block_parts)
            block_text = re.sub(r"[ \t]+", " ", block_text)
            block_text = block_text.strip()
            # Final sanity: must contain at least a 2-letter word
            if block_text and re.search(r"[A-Za-z]{2,}", block_text):
                parts.append(block_text)
    return "\n".join(p for p in parts if p)


def _decompress_pdf_streams(content_bytes: bytes) -> bytes:
    """Find every stream..endstream object and zlib-inflate the FlateDecode ones.

    Most real-world PDFs (Word/Canva/LaTeX exports) compress their content
    streams, so the raw bytes contain no readable BT..ET text until inflated.
    Image streams (DCTDecode/JPXDecode/XObject Image) are skipped — their
    binary JPEG data contains accidental 'BT'/'ET' byte pairs that would
    otherwise create huge false text blocks.
    """
    inflated = []
    for m in re.finditer(rb"stream\r?\n", content_bytes):
        start = m.end()
        end = content_bytes.find(b"endstream", start)
        if end == -1:
            continue
        raw = content_bytes[start:end].rstrip(b"\r\n")
        # Look back at the stream dictionary to detect images
        header_start = content_bytes.rfind(b"<<", max(0, m.start() - 1200), m.start())
        header = content_bytes[header_start:m.start()] if header_start != -1 else b""
        is_image = False
        if b"/Subtype" in header and b"/Image" in header:
            is_image = True
        elif b"/Filter" in header and (b"DCTDecode" in header or b"JPXDecode" in header or b"CCITTFax" in header):
            is_image = True
        elif b"/XObject" in header and b"/Image" in header:
            is_image = True
        if is_image:
            continue
        did_inflate = False
        try:
            inflated.append(zlib.decompress(raw))
            did_inflate = True
        except Exception:
            try:
                d = zlib.decompressobj()
                dec = d.decompress(raw)
                if dec:
                    inflated.append(dec)
                    did_inflate = True
            except Exception:
                pass
        if not did_inflate:
            if b"BT" in raw and (b"Tj" in raw or b"TJ" in raw):
                inflated.append(raw)
    return b"\n".join(inflated)


def _printable_words(data: bytes, limit: int = 3000) -> str:
    clean_text = re.sub(rb"[^\x20-\x7E\n\r\t]", b" ", data)
    words = [w.decode("latin-1") for w in clean_text.split() if len(w) > 2 and not w.startswith(b"/")]
    return " ".join(words[:limit])


def extract_pdf_text(content_bytes: bytes) -> str:
    """Extract readable text from PDF bytes.

    Strategy (in order):
      0. PyPDF2 (handles CID/ToUnicode, most reliable for modern resumes).
      1. BT..ET literals in the raw file (uncompressed PDFs).
      2. Inflate FlateDecode streams, then BT..ET on the decompressed data
         (covers Word/Canva exports).
      3. Printable-word sweep over decompressed data, then raw file.
    """
    # 0. Try PyPDF2 first — correctly decodes CID fonts via ToUnicode CMaps
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(io.BytesIO(content_bytes))
        texts = []
        for page in reader.pages:
            try:
                t = page.extract_text()
                if t:
                    texts.append(t)
            except Exception:
                continue
        py_text = "\n".join(texts).strip()
        if len(py_text) >= 50 and re.search(r"[A-Za-z]{2,}", py_text):
            py_text = re.sub(r"[ \t]+", " ", py_text)
            py_text = re.sub(r"\n{3,}", "\n\n", py_text)
            # Filter out obvious garbage: if it looks like obj dumps, discard
            if "endobj" not in py_text[:2000] and " 0 obj" not in py_text[:2000]:
                return py_text.strip()
            # Even if it contains endobj later, if start is clean text, keep it
            if re.search(r"[A-Za-z]{3,}", py_text[:500]):
                # Trim trailing obj dumps if present
                py_text = re.split(r"\nendstream|\nendobj|\n\d+ 0 obj", py_text)[0]
                return py_text.strip()
    except Exception:
        pass

    # 1. direct BT..ET
    extracted = _extract_bt_et_text(content_bytes).strip()

    # 2. decompressed streams
    if len(extracted) < 50:
        try:
            decompressed = _decompress_pdf_streams(content_bytes)
        except Exception:
            decompressed = b""
        if decompressed:
            text2 = _extract_bt_et_text(decompressed).strip()
            if len(text2) > len(extracted):
                extracted = text2
            # 3. printable sweep on decompressed data (only if still empty)
            if len(extracted.strip()) < 50:
                # Avoid dumping font width tables — only use printable sweep as last resort
                # and filter obvious PDF operator garbage
                candidate = _printable_words(decompressed)
                if "endobj" not in candidate[:2000] and len(candidate) > 50:
                    extracted = candidate

    # final fallback: printable sweep on the raw file
    if len(extracted.strip()) < 50:
        extracted = _printable_words(content_bytes, limit=1500)

    # Final sanitation: if result still looks like PDF operators, discard obj dumps
    if "endstream" in extracted[:3000] and " 0 obj" in extracted[:3000]:
        extracted = re.split(r"\nendstream|\nendobj|\n\d+ 0 obj", extracted)[0].strip()
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
