# HireAI — Deployment Guide

> **Target Architecture:** Vercel (Frontend SPA) + Oracle Cloud Always Free ARM64 VM (Backend + AI Services)

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | Backend + Vite build |
| Python 3.10+ | AI microservices (STT, TTS, CV) — 3.11 recommended |
| PostgreSQL 15+ | Can run on the same Oracle VM |
| Ollama (or Gemini keys) | See AI Provider section below |
| Git | Fresh clone from Hemanth_M branch |

---

## 2. Backend Setup (Oracle VM)

### 2.1 Clone and install

```bash
git clone <repo-url> hireai && cd hireai
cd backend && npm install
```

### 2.2 Environment variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — fill in all CHANGE_ME values
nano backend/.env
```

Key variables to set for production:

| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `DB_HOST` | `localhost` or private IP | PostgreSQL host |
| `DB_PASSWORD` | (strong password) | Secret |
| `JWT_SECRET` | (32+ random chars) | Secret |
| `FRONTEND_URL` | `https://hireai.vercel.app` | CORS origin |
| `AI_PROVIDER` | `ollama` or `gemini` | |
| `OLLAMA_BASE_URL` | `http://10.0.0.x:11434` | Remote Ollama VM IP |
| `GEMINI_API_KEY_1` | (your key) | Only for gemini mode |
| `STT_SERVICE_URL` | `http://10.0.0.x:8765` | Remote STT VM IP |
| `TTS_SERVICE_URL` | `http://10.0.0.x:8766` | Remote TTS VM IP |
| `CV_SERVICE_URL` | `http://10.0.0.x:8767` | Remote CV VM IP |
| `AI_SECRET_TOKEN` | (32+ random chars) | Service-to-service auth secret |

> **Single-VM localhost defaults:** If all services run on the same VM, leave STT/TTS/CV URLs at their localhost defaults and leave `AI_SECRET_TOKEN` empty.

Generate `AI_SECRET_TOKEN`:
```bash
openssl rand -hex 32
```

### 2.3 Start the backend

```bash
cd backend && node server.js
```

Use a process manager in production:
```bash
npm install -g pm2
pm2 start backend/server.js --name hireai-backend
pm2 save && pm2 startup
```

---

## 3. AI Microservices Setup (Python)

Each service has a dedicated requirements file based on its actual imports. **Do not mix the virtualenvs.**

### 3.1 STT (Faster-Whisper)

```bash
python3 -m venv stt-venv
source stt-venv/bin/activate
pip install --upgrade pip
pip install -r backend/ai/requirements-stt.txt
```

Start (CPU mode — required on Oracle Always Free ARM64):
```bash
AI_SECRET_TOKEN=<same-value-as-backend> \
python backend/ai/stt_service.py \
  --host 0.0.0.0 --port 8765 \
  --device cpu --compute-type int8
```

> **ARM64 Note (CRITICAL):** `faster-whisper` depends on `CTranslate2`, which lacks reliable
> prebuilt `manylinux2014_aarch64` wheels on PyPI. On Oracle A1 (ARM64) this may require
> compilation from source. **Validation on Oracle A1 is required before production deployment.**
> See: https://github.com/OpenNMT/CTranslate2#building

### 3.2 TTS (Kokoro)

```bash
# System dependency (Linux only)
sudo apt install -y espeak-ng

python3 -m venv tts-venv
source tts-venv/bin/activate
pip install --upgrade pip
pip install -r backend/ai/requirements-tts.txt
```

Start (CPU mode):
```bash
AI_SECRET_TOKEN=<same-value-as-backend> \
python backend/ai/tts_service.py \
  --host 0.0.0.0 --port 8766 --device cpu
```

> Kokoro downloads its model (~350 MB) on first startup. Requires internet access.
> Control the model cache path with `HF_HOME=/your/model/dir`.

### 3.3 CV Analysis

```bash
# System dependencies (Linux only)
sudo apt install -y libgl1 libglib2.0-0

python3 -m venv cv-venv
source cv-venv/bin/activate
pip install --upgrade pip
pip install -r backend/ai/requirements-cv.txt
```

#### Model files (required — NOT in Git)

Place the following in `backend/ai/cv_model/` on the CV VM:

| File | Size | Source |
|---|---|---|
| `best_checkpoint.pt` | ~44.8 MB | Trained ResNet-18 dual-head |
| `face_detection_yunet_2023mar.onnx` | ~440 KB | YuNet face detector |
| `class_labels.json` | 91 B | Emotion label mapping |

Copy from developer machine:
```bash
scp -r backend/ai/cv_model/ user@oracle-vm:~/hireai/backend/ai/cv_model/
```

Start:
```bash
AI_SECRET_TOKEN=<same-value-as-backend> \
python backend/ai/cv_service.py \
  --host 0.0.0.0 --port 8767
```

---

## 4. CV Distributed Architecture

The CV analysis service now supports fully distributed deployment.
**No shared filesystem or NFS is required.**

### How it works

```
Browser
  ↓ (video upload)
Express backend (VM 1)
  ↓ reads file from its own disk
  ↓ POST multipart/form-data {video: <bytes>, interview_id: <id>}
CV Service (VM 2 or same VM)
  ↓ writes video to /tmp/xxxxx.webm (temp file)
  ↓ runs OpenCV + PyTorch analysis
  ↓ deletes temp file (always, even on error)
  ↓ returns JSON result
Express backend
  ↓ persists scores to PostgreSQL
```

- The backend reads the recording from its local disk (`req.file.path`)
- It sends the raw video bytes to the CV service via multipart POST
- The CV service receives bytes, writes a temp file, analyzes it, then deletes the temp file
- The CV service never needs access to the backend's filesystem

### Localhost behavior (unchanged)

When `CV_SERVICE_URL=http://127.0.0.1:8767` (the default), everything works identically to before — the multipart upload simply goes to the local Python process.

---

## 5. Service-to-Service Authentication

All three Python AI services (STT, TTS, CV) implement optional token authentication.

### How it works

- The backend sends `X-AI-Secret: <token>` in every request to STT / TTS / CV.
- Each Python service checks this header against its own `AI_SECRET_TOKEN` env var.
- If the token is **not set** (empty), the service runs in **dev passthrough mode** — all requests pass without authentication.
- If the token is **set**, requests without a valid matching token receive `HTTP 401 Unauthorized`.
- Comparison uses constant-time `hmac.compare_digest` to prevent timing attacks.

### Production configuration

1. Generate a single shared secret: `openssl rand -hex 32`
2. Set `AI_SECRET_TOKEN=<secret>` in `backend/.env`
3. Set `AI_SECRET_TOKEN=<same-secret>` in the environment of each AI service VM

### Ollama

Ollama does not expose a custom auth mechanism at the HTTP protocol level.  
**Recommended protection:** Oracle VCN Security Lists / Network Security Groups to restrict port 11434 to the backend VM's private IP only. Do not expose Ollama on a public IP.

---

## 6. Frontend Deployment (Vercel)

### 6.1 Set Vercel environment variables

In the Vercel project dashboard → Settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://api.hireai.example.com` | Your backend domain, no trailing slash |

### 6.2 Deploy

```bash
# From repo root
npm run build   # Produces dist/
# Push to GitHub — Vercel auto-deploys from the Hemanth_M branch
```

Vercel build command: `npm run build`  
Output directory: `dist`

---

## 7. HTTPS / Mixed Content

Vercel serves the frontend over HTTPS. Your backend MUST also use HTTPS, otherwise
browsers will block all API requests (mixed-content policy).

**Option A — Nginx + Let's Encrypt (recommended):**
```nginx
server {
    listen 443 ssl;
    server_name api.hireai.example.com;
    ssl_certificate /etc/letsencrypt/live/api.hireai.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.hireai.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Gemini Keys (Cloud AI Mode)

`backend/config/geminiKeys.js` is in `.gitignore` — it is NOT cloned.

In production with `AI_PROVIDER=gemini`, set `GEMINI_API_KEY_1` (through `_7`)
in `backend/.env`. The application will warn at startup if no keys are found
and fail gracefully per-request (not at boot).

---

## 9. ARM64 Compatibility Summary

| Component | Status | Evidence |
|---|---|---|
| Node.js Express backend | **VERIFIED** | Pure JS, no native bindings |
| PostgreSQL | **VERIFIED** | Official aarch64 apt packages |
| Ollama / Qwen 2.5 3B | **VERIFIED** | Official aarch64 install script |
| CV Analysis (torch, torchvision, opencv-headless) | **LIKELY** | aarch64 wheels published |
| Kokoro TTS (torch, kokoro) | **LIKELY** | aarch64 wheels published; espeak-ng in apt |
| Faster-Whisper STT (CTranslate2) | **NOT VERIFIED** | No reliable prebuilt aarch64 wheels; may require source compilation |

> **Action required:** Validate CTranslate2 / faster-whisper on a real Oracle A1 ARM64 VM before production deployment.

---

## 10. Model Provisioning

| Model | Service | Size | How to provision |
|---|---|---|---|
| Qwen 2.5 3B | Ollama | ~2.2 GB | `ollama pull qwen2.5:3b` (auto on first request) |
| Whisper small | STT | ~500 MB | Auto-downloaded by faster-whisper on first start to `HF_HOME` |
| Kokoro | TTS | ~350 MB | Auto-downloaded on first start to `HF_HOME` |
| ResNet-18 CV model | CV | ~44.8 MB | **Manual** — `scp` from developer machine (not in Git) |
| YuNet ONNX | CV | ~440 KB | **Manual** — `scp` from developer machine (not in Git) |
| class_labels.json | CV | 91 B | **Manual** — `scp` from developer machine (not in Git) |

Model cache environment variable for STT/TTS:
```bash
export HF_HOME=/data/models   # choose a persistent disk path
```

---

## 11. Localhost Development

No changes required. When `VITE_API_URL` is unset, the Vite dev server proxy
forwards `/api/*` to `http://localhost:5000`. All AI services default to `localhost`.
`AI_SECRET_TOKEN` left empty = dev passthrough mode (no auth required on AI services).

Start sequence (Windows):
```powershell
scripts/start.ps1
```

---

## 12. Initial Admin Account

There is no seed admin user. After first deployment:

```bash
# Register normally via the frontend, then promote via SQL:
psql -U postgres -d ai_recruitment \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin@example.com';"
```
