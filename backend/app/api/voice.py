"""
Feature 9 — the real-time voice interviewer.

Why voice rather than a written test: the candidate must answer out loud, so
they cannot paste a question into a chatbot and read back the answer.

The platform performs no speech conversion. Questions are delivered as text and
the spoken answer is stored as the recording the browser captured — no
text-to-speech, no transcription. What is kept is therefore exactly what the
candidate said, in their own voice, rather than a machine's guess at it.

Protocol (JSON text frames over a WebSocket):

    connect   ws://HOST/api/interviews/voice/{interview_id}?token=<JWT>

    server -> {"type":"ready","interview_id":1,"total":5,"answered":0,
               "skipped":0,"interview_type":"HR","domain":"...",
               "difficulty":"EASY"}

    client -> {"type":"next"}
    server -> {"type":"question","sequence_no":1,"category":"Introduction",
               "text":"..."}

    client -> {"type":"answer","audio_b64":"<base64>","mime_type":"audio/webm"}
    server -> {"type":"recorded","sequence_no":1,"bytes":48213,
               "answered":1,"skipped":0,"total":5}

    client -> {"type":"skip"}        # pass on this one
    server -> {"type":"skipped","sequence_no":2,"attempted":false,
               "answered":1,"skipped":1,"total":5}
    server -> {"type":"question", ...}   # the next one, unprompted

    client -> {"type":"next"} ...    # until every question is done
    server -> {"type":"complete","interview_id":1,"answered":4,"skipped":1,
               "total":5}

    errors -> {"type":"error","detail":"..."}

A skip advances the interview on its own — the client does not send `next`
afterwards. Skipped questions are *not attempted*: they never count towards
`answered`, and they are not asked again.

Recordings are played back over the sibling REST route in interviews.py:
GET /api/interviews/{id}/answers/{sequence_no}/audio

Close codes: 4401 bad/missing token, 4404 interview not found, 4409 interview
has no questions.
"""

import base64
import binascii
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.interview import (
    QUESTION_ANSWERED,
    QUESTION_HANDLED,
    QUESTION_SKIPPED,
    Interview,
    InterviewQuestion,
    SessionStatus,
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["interviews-voice"])

# Guard against a client streaming an enormous blob into memory. Base64 inflates
# by ~4/3, so the cap is applied to the encoded string before it is decoded.
def _max_b64_chars() -> int:
    return (settings.MAX_ANSWER_AUDIO_MB * 1024 * 1024 * 4) // 3


# What a browser's MediaRecorder actually produces, plus wav for the bundled
# test client. The mime type decides the file extension, so it is matched
# against this table rather than trusted — it arrives from the client.
AUDIO_EXTENSIONS = {
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
}


def _store_answer_audio(audio: bytes, mime_type: str, interview_id: int) -> tuple[str, str]:
    """
    Write a recording to disk and return (relative path, normalised mime type).

    The filename is chosen here, never taken from the client, and the extension
    comes from the lookup table above — so an unrecognised mime type lands as
    .bin rather than as whatever the caller asked for.
    """
    mime = (mime_type or "").split(";")[0].strip().lower()
    extension = AUDIO_EXTENSIONS.get(mime, ".bin")

    directory = Path(settings.ANSWER_AUDIO_DIR) / str(interview_id)
    directory.mkdir(parents=True, exist_ok=True)
    destination = directory / f"{uuid.uuid4()}{extension}"
    destination.write_bytes(audio)
    return str(destination), mime or "application/octet-stream"


def _authenticate(token: Optional[str], db: Session) -> Optional[User]:
    """
    Resolve the ?token= query parameter into a User.

    The token is in the query string rather than an Authorization header
    because the browser WebSocket API cannot set custom headers. It is the same
    JWT the REST endpoints use.
    """
    if not token:
        return None
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id = payload.get("id")
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()


def _next_question(db: Session, interview_id: int) -> Optional[InterviewQuestion]:
    """
    The lowest-numbered question the candidate has not dealt with yet.

    Skipped questions count as dealt with, so passing on one moves the
    interview forward instead of serving it again.
    """
    return (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.interview_id == interview_id, ~QUESTION_HANDLED)
        .order_by(InterviewQuestion.sequence_no)
        .first()
    )


def _progress(db: Session, interview_id: int) -> dict:
    """
    How far along the interview is.

    `answered` counts only questions the candidate actually attempted. Skips are
    reported separately as `skipped` and never inflate the answered figure — a
    question passed on is not attempted, and the numbers must say so.
    """
    asked = db.query(InterviewQuestion).filter(
        InterviewQuestion.interview_id == interview_id
    )
    return {
        "total": asked.count(),
        "answered": asked.filter(QUESTION_ANSWERED).count(),
        "skipped": asked.filter(QUESTION_SKIPPED).count(),
    }


_DEMO_PAGE = """<!doctype html>
<meta charset="utf-8"><title>SmartHire AI — voice interview demo</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;
      background:#0d0d12;color:#e4e1e9}
 input,button,select{font:inherit;padding:8px 10px;margin:4px 4px 4px 0;border-radius:6px;
      border:1px solid #2e2e42;background:#1a1a24;color:#e4e1e9}
 button{cursor:pointer;background:#00c8ff;color:#04121a;border:0;font-weight:600}
 button:disabled{opacity:.4;cursor:not-allowed}
 #log{white-space:pre-wrap;background:#13131a;border:1px solid #252535;border-radius:6px;
      padding:14px;margin-top:16px;min-height:220px;font-size:14px;line-height:1.55}
 .q{color:#00c8ff;font-weight:600} .a{color:#00e87a} .e{color:#ff4d4d}
 fieldset{border:1px solid #252535;border-radius:6px;margin-bottom:12px}
</style>
<h2>SmartHire AI — real-time voice interview</h2>
<p style="color:#8d8a99;font-size:14px">Questions are shown as text. Your spoken
answer is recorded and stored as audio — nothing is transcribed.</p>
<fieldset><legend>1. Sign in</legend>
  <input id="email" value="candidate.demo@smarthire.dev" size="30">
  <input id="password" type="password" value="Candidate@123" size="18">
  <button onclick="doLogin()">Log in</button>
</fieldset>
<fieldset><legend>2. Pick or create an interview</legend>
  <input id="iid" placeholder="existing interview id" size="12">
  <select id="itype"><option>HR</option><option>TECHNICAL</option>
    <option>BEHAVIORAL</option><option>APTITUDE</option></select>
  <select id="idiff"><option>EASY</option><option>MEDIUM</option><option>HARD</option></select>
  <input id="idomain" value="hr executive" size="20">
  <button onclick="doGenerate()">Generate new</button>
</fieldset>
<fieldset><legend>3. Interview</legend>
  <button id="connect" onclick="connect()">Connect</button>
  <button id="next" onclick="askNext()" disabled>Next question</button>
  <button id="rec" onclick="toggleRec()" disabled>Hold to answer</button>
  <button id="skip" onclick="send({type:'skip'})" disabled>Skip</button>
</fieldset>
<div id="log">Log in, generate an interview, then Connect.</div>
<script>
let token=null, ws=null, rec=null, chunks=[], recording=false;
const $=i=>document.getElementById(i);
const log=(m,c)=>{const d=document.createElement('div');if(c)d.className=c;d.textContent=m;
  $('log').appendChild(d);$('log').scrollTop=1e9;};
const api=p=>location.origin+'/api'+p;

async function doLogin(){
  const r=await fetch(api('/auth/login'),{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:$('email').value,password:$('password').value})});
  if(!r.ok){log('login failed: '+r.status,'e');return;}
  token=(await r.json()).access_token; log('logged in');
}
async function doGenerate(){
  if(!token)return log('log in first','e');
  const r=await fetch(api('/interviews/generate'),{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify({interview_type:$('itype').value,domain:$('idomain').value,
      difficulty:$('idiff').value,question_count:5})});
  if(!r.ok){log('generate failed: '+r.status,'e');return;}
  const b=await r.json(); $('iid').value=b.id;
  log(`created interview ${b.id} — ${b.question_count} questions (source: ${b.source})`);
}
function connect(){
  if(!token)return log('log in first','e');
  const id=$('iid').value; if(!id)return log('need an interview id','e');
  ws=new WebSocket(`${location.origin.replace('http','ws')}/api/interviews/voice/${id}?token=${encodeURIComponent(token)}`);
  ws.onmessage=onMessage;
  ws.onclose=()=>{log('— connection closed —');['next','rec','skip'].forEach(b=>$(b).disabled=true);};
  ws.onerror=()=>log('websocket error','e');
}
function send(o){ws&&ws.readyState===1&&ws.send(JSON.stringify(o));}
function askNext(){send({type:'next'});}
async function onMessage(ev){
  const m=JSON.parse(ev.data);
  if(m.type==='ready'){log(`ready — ${m.interview_type}/${m.difficulty}/${m.domain} (${m.answered}/${m.total} answered, ${m.skipped} skipped)`);
    $('next').disabled=false;$('skip').disabled=false;await initMic();}
  else if(m.type==='question'){
    log(`Q${m.sequence_no} [${m.category}] ${m.text}`,'q');
    $('rec').disabled=false;}
  else if(m.type==='recorded'){
    log(`answer recorded — ${m.bytes.toLocaleString()} bytes (${m.mime_type})`,'a');
    log(`progress ${m.answered}/${m.total}`);$('rec').disabled=true;}
  else if(m.type==='skipped'){log(`skipped Q${m.sequence_no}`);$('rec').disabled=true;}
  else if(m.type==='complete'){log(`✓ complete — ${m.answered}/${m.total} answered`,'a');}
  else if(m.type==='error'){log('error: '+m.detail,'e');}
}
async function initMic(){
  if(rec)return;
  try{const s=await navigator.mediaDevices.getUserMedia({audio:true});
    rec=new MediaRecorder(s);
    rec.ondataavailable=e=>chunks.push(e.data);
    rec.onstop=async()=>{const blob=new Blob(chunks,{type:rec.mimeType});chunks=[];
      const b64=btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
      log(`sending ${blob.size.toLocaleString()} bytes of audio…`);
      send({type:'answer',audio_b64:b64,mime_type:rec.mimeType.split(';')[0]});};
    log('microphone ready');
  }catch(e){log('microphone unavailable: '+e.message,'e');}
}
function toggleRec(){
  if(!rec)return;
  if(!recording){chunks=[];rec.start();recording=true;$('rec').textContent='Stop & send';}
  else{rec.stop();recording=false;$('rec').textContent='Hold to answer';}
}
</script>
"""


@router.get("/voice/demo", response_class=HTMLResponse, include_in_schema=False)
def voice_demo_page():
    """
    A self-contained browser client for demonstrating the voice interview with a
    real microphone. Served from the API so it is same-origin and needs no CORS
    exception. Open http://localhost:8000/api/interviews/voice/demo
    """
    return HTMLResponse(_DEMO_PAGE)


@router.websocket("/voice/{interview_id}")
async def voice_interview(
    websocket: WebSocket,
    interview_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
):
    await websocket.accept()

    user = _authenticate(token, db)
    if user is None:
        await websocket.send_json({"type": "error", "detail": "Invalid or missing token."})
        await websocket.close(code=4401)
        return

    interview = (
        db.query(Interview)
        .filter(Interview.id == interview_id, Interview.user_id == user.id)
        .first()
    )
    if interview is None:
        await websocket.send_json({"type": "error", "detail": "Interview not found."})
        await websocket.close(code=4404)
        return

    progress = _progress(db, interview.id)
    if progress["total"] == 0:
        await websocket.send_json({"type": "error", "detail": "This interview has no questions."})
        await websocket.close(code=4409)
        return

    # Connecting is starting: a candidate on the line is a session in progress.
    if interview.status in (SessionStatus.CREATED, SessionStatus.ABANDONED):
        interview.status = SessionStatus.IN_PROGRESS
        interview.started_at = interview.started_at or datetime.now(timezone.utc)
        db.commit()

    await websocket.send_json(
        {
            "type": "ready",
            "interview_id": interview.id,
            "interview_type": interview.interview_type.value,
            "domain": interview.domain,
            "difficulty": interview.difficulty.value,
            **progress,
        }
    )

    current: Optional[InterviewQuestion] = None

    async def serve_next() -> tuple[Optional[InterviewQuestion], bool]:
        """
        Send the next unhandled question, or close the interview out.

        Returns (question, finished). Shared by `next` and `skip` so that
        passing on a question moves straight to the following one rather than
        making the candidate ask for it separately.
        """
        question = _next_question(db, interview.id)

        if question is None:
            interview.status = SessionStatus.COMPLETED
            interview.completed_at = datetime.now(timezone.utc)
            db.commit()
            await websocket.send_json(
                {
                    "type": "complete",
                    "interview_id": interview.id,
                    **_progress(db, interview.id),
                }
            )
            return None, True

        question.asked_at = datetime.now(timezone.utc)
        db.commit()
        await websocket.send_json(
            {
                "type": "question",
                "sequence_no": question.sequence_no,
                "category": question.category,
                "text": question.question_text,
            }
        )
        return question, False

    try:
        while True:
            message = await websocket.receive_json()
            action = message.get("type")

            # ---------------------------------------------------- next question
            if action == "next":
                current, finished = await serve_next()
                if finished:
                    break

            # ------------------------------------------------- spoken answer
            elif action == "answer":
                if current is None:
                    await websocket.send_json(
                        {"type": "error", "detail": "Ask for a question first."}
                    )
                    continue

                b64 = message.get("audio_b64") or ""
                if not b64:
                    await websocket.send_json({"type": "error", "detail": "No audio received."})
                    continue
                if len(b64) > _max_b64_chars():
                    await websocket.send_json(
                        {
                            "type": "error",
                            "detail": (
                                f"Answer audio exceeds the "
                                f"{settings.MAX_ANSWER_AUDIO_MB} MB limit."
                            ),
                        }
                    )
                    continue

                try:
                    audio_bytes = base64.b64decode(b64, validate=True)
                except (binascii.Error, ValueError):
                    await websocket.send_json({"type": "error", "detail": "Audio is not valid base64."})
                    continue

                if not audio_bytes:
                    await websocket.send_json(
                        {"type": "error", "detail": "The recording was empty. Please answer again."}
                    )
                    continue

                try:
                    path, mime = _store_answer_audio(
                        audio_bytes,
                        message.get("mime_type", "audio/webm"),
                        interview.id,
                    )
                except OSError:
                    logger.exception("Could not store answer audio for question %s", current.id)
                    await websocket.send_json(
                        {"type": "error", "detail": "The recording could not be saved."}
                    )
                    continue

                current.answer_audio_path = path
                current.answer_audio_mime = mime
                current.answered_at = datetime.now(timezone.utc)
                db.commit()

                await websocket.send_json(
                    {
                        "type": "recorded",
                        "sequence_no": current.sequence_no,
                        "bytes": len(audio_bytes),
                        "mime_type": mime,
                        **_progress(db, interview.id),
                    }
                )
                current = None

            # -------------------------------------------------------- skip
            elif action == "skip":
                if current is None:
                    await websocket.send_json({"type": "error", "detail": "Nothing to skip."})
                    continue

                # Recorded as not attempted, not as an empty answer: skipped_at
                # is set and answered_at is deliberately left alone.
                skipped_no = current.sequence_no
                current.skipped_at = datetime.now(timezone.utc)
                db.commit()

                await websocket.send_json(
                    {
                        "type": "skipped",
                        "sequence_no": skipped_no,
                        "attempted": False,
                        **_progress(db, interview.id),
                    }
                )

                # Skipping moves the interview on by itself — the candidate
                # should not have to ask for the next question separately.
                current, finished = await serve_next()
                if finished:
                    break

            # -------------------------------------------------------- close
            elif action == "end":
                await websocket.send_json({"type": "closed", "interview_id": interview.id})
                break

            else:
                await websocket.send_json(
                    {"type": "error", "detail": f"Unknown action: {action!r}"}
                )

    except WebSocketDisconnect:
        # Candidate dropped mid-interview. Leave it IN_PROGRESS so they can
        # reconnect and carry on from the next unanswered question.
        logger.info("Voice interview %s disconnected by client.", interview.id)
        return
    except Exception:
        logger.exception("Voice interview %s failed.", interview.id)
        try:
            await websocket.send_json({"type": "error", "detail": "Internal error."})
        except Exception:
            pass

    try:
        await websocket.close()
    except Exception:
        pass
