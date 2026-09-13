# FINAL DEPLOYMENT DOSSIER: HIREAI MULTI-VM ARCHITECTURE

**Generated:** 2026-09-13  
**Target Infrastructure:** Vercel (Frontend) + 5 Dedicated Oracle Cloud VMs (Backend, LLM, STT, TTS, CV)  
**Repository Branch:** `Hemanth_M`  
**Working Directory:** `d:\Role-Based Dashboard System`  
**Document Classification:** Read-Only Factual Audit & Deployment Specifications  

---

## EXECUTIVE ARCHITECTURE OVERVIEW

HireAI is being deployed across a hybrid cloud topology consisting of Vercel for client delivery and five (5) discrete compute nodes (Oracle Cloud Always Free / Compute instances) communicating over an IP network:

```
[ User Browser ]
       │
       ▼ (HTTPS)
┌─────────────────────────────────────────────────────────────────────────────┐
│  VERCEL: React 18 + Vite SPA                                                │
│  Base URL: https://<frontend-domain>                                        │
│  Build Output: dist/ (Client bundle, statically served)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS API Requests (Bearer JWT)
                                       │ Configured via VITE_API_URL
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORACLE VM #1: Core Application Node                                        │
│  ├── Node.js 20+ Express Backend (Port 5000 / Reverse Proxy Port 443)       │
│  ├── PostgreSQL 15+ Database (Port 5432, local loopback)                    │
│  ├── In-process Reminder Scheduler (Interval polling via setInterval)       │
│  └── Local File Storage (backend/uploads/resumes, backend/uploads/recordings)│
└───┬───────────────────┬───────────────────┬───────────────────┬─────────────┘
    │                   │                   │                   │
    │ HTTP /api/generate│ HTTP POST         │ HTTP POST         │ HTTP POST
    │ (No auth / VCN)   │ /transcribe       │ /speak            │ /analyze
    │                   │ Header:           │ Header:           │ Header:
    │                   │ X-AI-Secret       │ X-AI-Secret       │ X-AI-Secret
    ▼                   ▼                   ▼                   ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│ORACLE VM #2  │ │ORACLE VM #3  │ │ORACLE VM #4  │ │ORACLE VM #5              │
│Ollama Daemon │ │Faster-Whisper│ │Kokoro TTS    │ │CV Analysis Service       │
│Qwen 2.5 3B   │ │Whisper Small │ │Kokoro v0.9.4 │ │ResNet-18 + YuNet ONNX    │
│Port 11434    │ │Port 8765     │ │Port 8766     │ │Port 8767                 │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────────┘
```

---

## 1. COMPLETE SERVICE INVENTORY

Based on actual repository code inspection:

| Service | Repository Path | Runtime | Entry Point | Start Command (Local Windows / Script) | Port | Bind Host | Dependencies | Model Files | Persistent Files |
|---|---|---|---|---|---|---|---|---|---|
| **Frontend** | `/` (root) | Node.js 20+ / Vite 5 | `src/main.jsx` | `npm run dev` (`vite`) | 5173 (dev) / 443 (Vercel) | `localhost` / `::1` | React 18, React Router v6, Lucide React, Recharts, Framer Motion | None | None (stateless client bundle) |
| **Backend** | `backend/` | Node.js 20+ (CommonJS) | `backend/server.js` | `node server.js` (or `npm start`) | 5000 | `0.0.0.0` (Node default when unspec.) | Express 4.18, pg 8.11, bcryptjs, jsonwebtoken, multer 2.2, nodemailer, helmet, express-rate-limit 7.1, pdfkit, @google/genai | None (consumes remote models) | `backend/uploads/resumes/`<br>`backend/uploads/recordings/`<br>`backend/data/gemini_counters.json` |
| **PostgreSQL** | N/A (Database engine) | PostgreSQL 15+ (x64-18 on dev) | `postgres` service daemon | Windows Service `postgresql-x64-18` | 5432 | `127.0.0.1` | None | None | PostgreSQL data directory (`base/`, `pg_wal/`) |
| **Scheduler** | `backend/services/reminderScheduler.js` | Node.js (in-process) | `server.js:98` (`reminderScheduler.start()`) | Embedded in backend start | N/A (Internal) | N/A | `pg`, `nodemailer`, `scheduleService.js` | None | State persisted in DB (`scheduled_interviews` table flags) |
| **STT** | `backend/ai/stt_service.py` | Python 3.10+ (Dev: 3.13.9) | `backend/ai/stt_service.py` | `python stt_service.py --port 8765 --model small --device cuda --compute-type float16` | 8765 | `0.0.0.0` (hardcoded at `stt_service.py:295`) | `faster-whisper>=1.0.3`, `ctranslate2`, `tokenizers`, `huggingface_hub` | Whisper `small` (~500 MB) | Auto-cached in `~/.cache/huggingface/hub/` |
| **TTS** | `backend/ai/tts_service.py` | Python 3.10+ (Dev: 3.12.10) | `backend/ai/tts_service.py` | `python tts_service.py --port 8766 --voice af_heart --device cuda` | 8766 | `localhost` (arg default); `--host 0.0.0.0` required for remote | `kokoro>=0.9.4`, `soundfile`, `torch>=2.1.0`, `numpy`, `espeak-ng` | Kokoro `kokoro-0.9.4` (~350 MB) | Auto-cached in `~/.cache/huggingface/hub/` |
| **CV Analysis** | `backend/ai/cv_service.py` | Python 3.10+ (Dev: 3.12.10) | `backend/ai/cv_service.py` | `python cv_service.py --port 8767 --host 127.0.0.1` | 8767 | `127.0.0.1` (arg default); `--host 0.0.0.0` required for remote | `torch>=2.1.0`, `torchvision>=0.16.0`, `opencv-python-headless>=4.8.0`, `numpy>=1.24.0` | `best_checkpoint.pt` (44.8 MB), `face_detection_yunet_2023mar.onnx` (232 KB) | Weights in `backend/ai/cv_model/` |
| **Ollama / LLM** | External Service Daemon | Go binary / CUDA or CPU | `ollama` CLI executable | `ollama serve` | 11434 | `127.0.0.1` (default); `OLLAMA_HOST=0.0.0.0:11434` required for remote | Prebuilt Ollama package | `qwen2.5:3b` (~2.2 GB) | Models stored in `~/.ollama/models` |

---

## 2. EXACT STARTUP COMMANDS

All commands below are extracted verbatim from the repository files (`scripts/start.ps1`, `package.json`, `backend/package.json`, `README_DEPLOYMENT.md`, and Python CLI argument parsers).

### 2.1 React / Vite Frontend
* **Environment:** Local Development (Windows) / Production (Vercel)
* **Local Command (Windows):** `npm run dev` (`scripts/start.ps1:265`)
* **Local Working Directory:** Repository root (`d:\Role-Based Dashboard System`)
* **Production Build Command (Vercel):** `npm run build` (`package.json:8`)
* **Production Output Directory:** `dist` (`vite.config.js`, `package.json`)
* **Required Environment Variables:**
  * Development: None (falls back to `''`, which routes to Vite dev proxy `/api` at `vite.config.js:8-11`)
  * Production: `VITE_API_URL=https://api.yourdomain.com` (no trailing slash)
* **Expected Host:** Local: `localhost`; Production: Vercel edge network
* **Expected Port:** Local: `5173`; Production: `443` (HTTPS)
* **Prerequisites:** `npm install` completed at repository root.

### 2.2 Node / Express Backend
* **Environment:** Node.js CommonJS
* **Local Command (Windows):** `npm start` (which executes `node server.js` per `backend/package.json:7`)
* **Local Working Directory:** `backend` (`scripts/start.ps1:244-245`)
* **Linux / Production Command:** `node server.js` (or `pm2 start server.js --name hireai-backend`)
* **Required Environment Variables:**
  * `NODE_ENV=production`
  * `PORT=5000`
  * `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
  * `JWT_SECRET`
  * `FRONTEND_URL`
  * `AI_PROVIDER=ollama`
  * `OLLAMA_BASE_URL=http://<VM2_PRIVATE_IP>:11434`
  * `STT_SERVICE_URL=http://<VM3_PRIVATE_IP>:8765`
  * `TTS_SERVICE_URL=http://<VM4_PRIVATE_IP>:8766`
  * `CV_SERVICE_URL=http://<VM5_PRIVATE_IP>:8767`
  * `AI_SECRET_TOKEN=<shared_token>`
* **Expected Host:** `0.0.0.0`
* **Expected Port:** `5000` (or reverse proxied via Nginx on `443`)
* **Prerequisites:** PostgreSQL running and accepting TCP connections; `backend/node_modules` installed via `npm install`.

### 2.3 PostgreSQL
* **Environment:** Windows Service (Local) / Linux Daemon (Production)
* **Local Command (Windows):** Windows Service `postgresql-x64-18` controlled via `scripts/start.ps1:134` (Task Scheduler task `HireAI-StartPostgres`)
* **Linux Command:** `sudo systemctl start postgresql`
* **Working Directory:** N/A (System daemon)
* **Required Environment Variables:** Configured in `postgresql.conf` / `pg_hba.conf`
* **Expected Host:** `127.0.0.1` (on VM #1)
* **Expected Port:** `5432`
* **Prerequisites:** PostgreSQL data cluster initialized; user `postgres` (or `DB_USER`) created with password matching `DB_PASSWORD`; target database `ai_recruitment` created (`CREATE DATABASE ai_recruitment;`).

### 2.4 Reminder Scheduler
* **Environment:** In-process Node.js worker inside `backend/server.js`
* **Local / Production Command:** Starts automatically when Express boots via `server.js:98` (`reminderScheduler.start()`)
* **Working Directory:** Same as Express backend (`backend/`)
* **Required Environment Variables:** `REMINDER_INTERVAL_MS` (optional, default `60000`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional, if email reminders are enabled)
* **Expected Host / Port:** In-process; communicates over local pool to PostgreSQL on `5432`.
* **Prerequisites:** Database connection established and tables migrated (`initDatabase()`).

### 2.5 Ollama LLM (Qwen 2.5 3B)
* **Environment:** Standalone Go / Native daemon
* **Local Command (Windows):** `Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Minimized` (`scripts/start.ps1:151`, path `%LOCALAPPDATA%\Programs\Ollama\ollama.exe`)
* **Linux Command (Production):**
  ```bash
  OLLAMA_HOST=0.0.0.0:11434 ollama serve
  ```
  *(Or via systemd unit file with `Environment="OLLAMA_HOST=0.0.0.0:11434"`)*
* **Model Pull Command:** `ollama pull qwen2.5:3b`
* **Working Directory:** User home or systemd working directory
* **Required Environment Variables:** `OLLAMA_HOST=0.0.0.0:11434` (mandatory for multi-VM network access; default without this variable is `127.0.0.1:11434`).
* **Expected Host:** `0.0.0.0`
* **Expected Port:** `11434`
* **Prerequisites:** Ollama binary installed (`curl -fsSL https://ollama.com/install.sh | sh`); model `qwen2.5:3b` pulled.

### 2.6 Faster-Whisper STT
* **Environment:** Python Virtual Environment
* **Local Command (Windows - CUDA):**
  ```powershell
  .venv\Scripts\python.exe -u backend\ai\stt_service.py --port 8765 --model small --device cuda --compute-type float16
  ```
  *(Source: `scripts/start.ps1:179`)*
* **Production Command (Linux - CPU Mode on Oracle ARM64/x86):**
  ```bash
  AI_SECRET_TOKEN=<shared-secret> python backend/ai/stt_service.py --port 8765 --model small --device cpu --compute-type int8
  ```
  *(Source: `backend/ai/requirements-stt.txt:22-23`, `README_DEPLOYMENT.md:91-93`)*
* **Working Directory:** `backend/ai` or repository root (paths are self-contained)
* **Required Environment Variables:** `AI_SECRET_TOKEN` (shared secret), `HF_HOME` (optional persistent model path)
* **Expected Host:** `0.0.0.0` (Hardcoded in `stt_service.py:295`: `HTTPServer(("0.0.0.0", args.port), STTHandler)`)
* **Expected Port:** `8765`
* **Prerequisites:** Virtualenv with `pip install -r backend/ai/requirements-stt.txt`.

### 2.7 Kokoro TTS
* **Environment:** Python Virtual Environment
* **Local Command (Windows - CUDA):**
  ```powershell
  tts-venv\Scripts\python.exe -u backend\ai\tts_service.py --port 8766 --voice af_heart --device cuda
  ```
  *(Source: `scripts/start.ps1:188-190`)*
* **Production Command (Linux - CPU Mode):**
  ```bash
  AI_SECRET_TOKEN=<shared-secret> python backend/ai/tts_service.py --host 0.0.0.0 --port 8766 --device cpu
  ```
  *(Source: `backend/ai/requirements-tts.txt:25`, `README_DEPLOYMENT.md:116-117`)*
* **Working Directory:** `backend/ai` or repository root
* **Required Environment Variables:** `AI_SECRET_TOKEN`, `HF_HOME` (optional)
* **Expected Host:** `0.0.0.0` (Must be explicitly specified via `--host 0.0.0.0` as parser default is `localhost` at `tts_service.py:169`)
* **Expected Port:** `8766`
* **Prerequisites:** System package `espeak-ng` installed (`sudo apt install -y espeak-ng`); virtualenv with `pip install -r backend/ai/requirements-tts.txt`.

### 2.8 CV Analysis Service
* **Environment:** Python Virtual Environment
* **Local Command (Windows):**
  ```powershell
  tts-venv\Scripts\python.exe -u backend\ai\cv_service.py --port 8767 --host 127.0.0.1
  ```
  *(Source: `scripts/start.ps1:201`)*
* **Production Command (Linux):**
  ```bash
  AI_SECRET_TOKEN=<shared-secret> python backend/ai/cv_service.py --host 0.0.0.0 --port 8767
  ```
  *(Source: `backend/ai/requirements-cv.txt:31`, `README_DEPLOYMENT.md:153-154`)*
* **Working Directory:** Must execute such that `backend/ai/cv_model` is accessible relative to `cv_service.py` (`CHECKPOINT_PATH` is anchored to `os.path.dirname(os.path.abspath(__file__))` at `cv_service.py:109-110`)
* **Required Environment Variables:** `AI_SECRET_TOKEN`
* **Expected Host:** `0.0.0.0` (Must be explicitly specified via `--host 0.0.0.0` as parser default is `127.0.0.1` at `cv_service.py:1203`)
* **Expected Port:** `8767`
* **Prerequisites:** Linux system libraries `libgl1`, `libglib2.0-0`; model weights `best_checkpoint.pt` and `face_detection_yunet_2023mar.onnx` provisioned in `backend/ai/cv_model/`.

---

## 3. AI MODEL INVENTORY

### 3.1 LLM (Language Model)
* **Runtime:** Ollama native daemon (`llmProvider.js:58-86`)
* **Exact Model Name:** `qwen2.5:3b` (for production Oracle Cloud free tier VM); default in code is `qwen2.5:7b` (`llmProvider.js:46`), but overridden by `.env` / `process.env.OLLAMA_MODEL` to `qwen2.5:3b`.
* **Where Configured:**
  * Code: `backend/services/llmProvider.js:46` (`process.env.OLLAMA_MODEL || 'qwen2.5:7b'`)
  * Configuration: `backend/.env.example:40` specifies `OLLAMA_MODEL=qwen2.5:3b`
* **Model Size:** ~2.2 GB (Q4_K_M quantized GGUF weights pulled by Ollama).
* **Model Download / Pull Mechanism:** `ollama pull qwen2.5:3b` via Ollama CLI, or triggered automatically on first invocation.
* **Storage Location:** External to repository. Managed by Ollama under `~/.ollama/models/blobs/`.

### 3.2 STT (Speech-to-Text)
* **Runtime:** `faster-whisper` (CTranslate2 inference engine) inside Python HTTP service (`backend/ai/stt_service.py:68-74`)
* **Exact Model Name:** `small` (`stt_service.py:37`, `WhisperModel("small")`)
* **Model Location:** Hugging Face Hub (`Systran/faster-whisper-small`). Cached by `huggingface_hub` in `$HF_HOME/hub/models--Systran--faster-whisper-small` or `~/.cache/huggingface/hub/`.
* **Model Download Mechanism:** Automatic on service boot when `WhisperModel("small")` executes (`stt_service.py:71`). Requires egress internet access during first boot.
* **Model File Size:** ~461 MB - ~500 MB (CTranslate2 float16 / int8 quantized weights).
* **CPU / GPU Assumptions:**
  * Local Dev: CUDA (`--device cuda --compute-type float16` at `scripts/start.ps1:179`).
  * Production Oracle Cloud: CPU (`--device cpu --compute-type int8` at `backend/ai/requirements-stt.txt:23`).
* **Python Version:** Local dev uses Python 3.13.9. Production target supports 3.10+ (3.11 recommended).
* **Dependencies:** `faster-whisper>=1.0.3` (which pulls `ctranslate2`, `tokenizers`, `huggingface_hub`, `av`).

### 3.3 TTS (Text-to-Speech)
* **Runtime:** `kokoro` Python library (PyTorch inference) inside HTTP service (`backend/ai/tts_service.py:192-206`)
* **Exact Model / Version:** `kokoro-0.9.4` (`tts_service.py:38`). Pipeline instantiated via `KPipeline(lang_code='a', device=args.device)` (`tts_service.py:201`).
* **Model Files:** `kokoro-v0_94.pth` and voice embedding tensors (`af_heart.pt`).
* **Model Location:** Hugging Face repository `hexgrad/Kokoro-82M`. Cached in `~/.cache/huggingface/hub/models--hexgrad--Kokoro-82M` or `$HF_HOME`.
* **Model Download Mechanism:** Automatic on initial `KPipeline(lang_code='a')` instantiation. Requires internet egress on first run.
* **Model File Size:** ~350 MB.
* **CPU / GPU Assumptions:** Auto-detects and falls back from CUDA to CPU automatically (`tts_service.py:203-205`). On Oracle Cloud CPU, runs on CPU.
* **Python Version:** Local dev uses Python 3.12.10. Production target: 3.10+ (3.11 recommended).
* **Dependencies:** `kokoro>=0.9.4`, `soundfile>=0.12.1`, `numpy>=1.24.0`, `torch>=2.1.0`, plus system package `espeak-ng`.

### 3.4 CV (Computer Vision / Behavioral Analysis)
* **Exact Model(s):**
  1. Primary Behavioral Model: `InterviewResNet` — Dual-Head ResNet-18 (`backend/ai/cv_service.py:117-190`). Backbone: ResNet-18 (ImageNet features); Head A (Affect): 3 logits (`disquietment`, `fear`, `doubt_confusion`); Head B (Behavior): 3 logits (`confidence`, `engagement`, `disconnection`).
  2. Face Detection Model: YuNet (`cv2.FaceDetectorYN`) (`cv_service.py:237-242`).
* **Runtime Model Files & File Sizes:**
  1. `best_checkpoint.pt`: 44,800,663 bytes (~44.8 MB) — fine-tuned PyTorch checkpoint (`epoch`, `val_ap`, `model_state_dict`).
  2. `face_detection_yunet_2023mar.onnx`: 232,589 bytes (~232.6 KB) — OpenCV ONNX face detector.
  3. `class_labels.json`: 91 bytes — array of string labels (`["disquietment", "fear", "doubt_confusion", "confidence", "engagement", "disconnection"]`).
* **Path Expectations in Code:**
  * Code defines:
    ```python
    _SERVICE_DIR = os.path.dirname(os.path.abspath(__file__))
    CHECKPOINT_PATH = os.path.join(_SERVICE_DIR, "cv_model", "best_checkpoint.pt")
    YUNET_PATH = os.path.join(_SERVICE_DIR, "cv_model", "face_detection_yunet_2023mar.onnx")
    ```
    *(Lines `cv_service.py:109-111`)*
  * The code expects `cv_model/` to be an immediate subdirectory of `backend/ai/`.
* **Python Version:** Local dev uses Python 3.12.10. Production target: 3.10+ (3.11 recommended).
* **Dependencies:** `torch>=2.1.0`, `torchvision>=0.16.0`, `opencv-python-headless>=4.8.0`, `numpy>=1.24.0`, plus system libraries `libgl1`, `libglib2.0-0`.
* **Labels / Config Files:** Labels are defined directly in Python at `cv_service.py:72-79` (`LABEL_NAMES`). `class_labels.json` is a reference copy.

---

## 4. MODEL FILES REQUIRED ON A FRESH SERVER

| Target Server | Required File | Current Local Path | Git Tracked? | Required on Server? | How Current Code Finds It | Category |
|---|---|---|---|---|---|---|
| **VM #2 (LLM)** | Qwen 2.5 3B GGUF | Managed by Ollama | **NO** (External) | **YES** | Ollama daemon internal lookup via model tag `qwen2.5:3b` | Model weights |
| **VM #3 (STT)** | Faster-Whisper Small weights | `~/.cache/huggingface/hub/` | **NO** (Ignored) | **YES** (Auto-pulled) | `WhisperModel('small')` queries HuggingFace cache / `$HF_HOME` | Model weights |
| **VM #4 (TTS)** | Kokoro 82M weights & voices | `~/.cache/huggingface/hub/` | **NO** (Ignored) | **YES** (Auto-pulled) | `KPipeline(lang_code='a')` queries HuggingFace cache / `$HF_HOME` | Model weights |
| **VM #5 (CV)** | `best_checkpoint.pt` | `backend/ai/cv_model/best_checkpoint.pt` | **NO** (`.gitignore:51`) | **YES** (Must SCP) | `CHECKPOINT_PATH = os.path.join(_SERVICE_DIR, "cv_model", "best_checkpoint.pt")` | Model weights |
| **VM #5 (CV)** | `face_detection_yunet_2023mar.onnx` | `backend/ai/cv_model/face_detection_yunet_2023mar.onnx` | **NO** (`.gitignore:52`) | **YES** (Must SCP) | `YUNET_PATH = os.path.join(_SERVICE_DIR, "cv_model", "face_detection_yunet_2023mar.onnx")` | Model weights |
| **VM #5 (CV)** | `class_labels.json` | `backend/ai/cv_model/class_labels.json` | **NO** (Untracked in `cv_model/`) | Recommended for parity (Code has fallback) | Referenced in documentation; labels hardcoded in `cv_service.py:72` | Configuration |
| **VM #5 (CV)** | `cv_service.py` | `backend/ai/cv_service.py` | **YES** (Tracked in Git) | **YES** | Entrypoint execution | Code |
| **VM #5 (CV)** | `requirements-cv.txt` | `backend/ai/requirements-cv.txt` | **YES** (Tracked in Git) | **YES** | Pip dependency installer | Configuration |
| **VM #5 (CV)** | Training scripts / Censuses (`train_resnet.py`, `prepare_emotic.py`, etc.) | `backend/ai/cv_model/*.py`, `*.json` | Untracked | **NO** | Not called by `cv_service.py` | Training-only artifacts |
| **VM #5 (CV)** | Haar Cascade (`haarcascade_frontalface_default.xml`) | `backend/ai/cv_model/haarcascade_frontalface_default.xml` | Untracked | **NO** | Not used (Code uses YuNet ONNX exclusively) | Legacy artifact |
| **VM #5 (CV)** | Dataset folders (`datasets/raw`, `datasets/processed`) | `datasets/` | Untracked | **NO** | Never referenced by production server | Datasets |

---

## 5. ENVIRONMENT VARIABLES

The following table inventories every environment variable recognized across the frontend, backend, microservices, and schedulers.

| Variable | Used By | Required? | Local Default | Production Meaning | Secret? |
|---|---|---|---|---|---|
| `PORT` | `backend/server.js:26` | No | `5000` | Port on which Express listens | No |
| `NODE_ENV` | `backend/server.js:37` | **Yes (in prod)** | `undefined` | Must be `production` to activate reverse proxy trust (`app.set('trust proxy', 1)`) | No |
| `DB_HOST` | `backend/config/database.js:5` | **Yes** | `'localhost'` | Hostname or IP of PostgreSQL instance | No |
| `DB_PORT` | `backend/config/database.js:6` | No | `5432` | Port of PostgreSQL instance | No |
| `DB_NAME` | `backend/config/database.js:7` | **Yes** | `'ai_recruitment'` | PostgreSQL database name | No |
| `DB_USER` | `backend/config/database.js:8` | **Yes** | `'postgres'` | PostgreSQL database user | No |
| `DB_PASSWORD` | `backend/config/database.js:9` | **Yes** | `undefined` | Password for PostgreSQL user | **YES** |
| `JWT_SECRET` | `backend/utils/jwt.js:5,11` | **Yes** | `undefined` | Signing key for candidate, recruiter, and admin JWT tokens | **YES** |
| `JWT_EXPIRES_IN` | `backend/utils/jwt.js:6` | No | `'7d'` | Expiration duration for issued JWTs | No |
| `FRONTEND_URL` | `backend/server.js:44`, `backend/controllers/authController.js:175`, `backend/routes/authRoutes.js:80` | **Yes** | `'http://localhost:5173'` | Allowed CORS origin and OAuth redirect target | No |
| `AI_PROVIDER` | `backend/services/llmProvider.js:42`, `backend/services/resumeParser.js:235` | **Yes** | `'gemini'` | Primary LLM selection: `'ollama'` or `'gemini'` | No |
| `OLLAMA_BASE_URL` | `backend/services/llmProvider.js:34` | **Yes (if Ollama)** | `'http://localhost:11434'` | Base URL to Oracle VM #2 Ollama daemon | No |
| `OLLAMA_MODEL` | `backend/services/llmProvider.js:46` | No | `'qwen2.5:7b'` | Target model tag; set to `qwen2.5:3b` in production | No |
| `OLLAMA_FALLBACK_MODEL` | `backend/services/llmProvider.js:50` | No | `'qwen2.5:3b'` | Reserved model tag for secondary failover | No |
| `OLLAMA_HOST` | Ollama daemon (VM #2) | **Yes (on VM #2)**| `127.0.0.1:11434` | Must be set to `0.0.0.0:11434` for cross-VM networking | No |
| `GEMINI_API_KEY` / `GEMINI_API_KEY_1`...`7` | `backend/config/geminiKeys.js:6-14` | Optional (Required if `AI_PROVIDER=gemini`) | `undefined` | API keys for Google GenAI rotation pool | **YES** |
| `GEMINI_MODEL` | `backend/services/adminService.js:321` | No | `'gemini-1.5-flash'` | Model for administrative query fallback | No |
| `STT_SERVICE_URL` | `backend/services/sttService.js:23` | **Yes (in prod)** | `'http://localhost:8765'` | Remote HTTP URL to Faster-Whisper VM #3 | No |
| `TTS_PROVIDER` | `backend/services/ttsService.js:86` | **Yes** | `'gemini'` | Set to `'kokoro'` for local/self-hosted TTS | No |
| `TTS_SERVICE_URL` | `backend/services/kokoroService.js:21` | **Yes (in prod)** | `'http://localhost:8766'` | Remote HTTP URL to Kokoro TTS VM #4 | No |
| `CV_SERVICE_URL` | `backend/services/cvService.js:32` | **Yes (in prod)** | `'http://127.0.0.1:8767'` | Remote HTTP URL to CV Analysis VM #5 | No |
| `AI_SECRET_TOKEN` | `backend/services/sttService.js:32`, `kokoroService.js:31`, `cvService.js:43`, `stt_service.py:47`, `tts_service.py:42`, `cv_service.py:50` | **Yes (in prod)** | `''` (Pass-through mode) | Shared secret token passed in `X-AI-Secret` header | **YES** |
| `SMTP_HOST` | `backend/services/emailService.js:39` | Optional | `''` | SMTP server address (blank disables email sending) | No |
| `SMTP_PORT` | `backend/services/emailService.js:40` | Optional | `587` | SMTP port (typically 587 or 465) | No |
| `SMTP_SECURE` | `backend/services/emailService.js:41` | Optional | `'false'` | Set to `'true'` for TLS port 465 | No |
| `SMTP_USER` | `backend/services/emailService.js:42` | Optional | `''` | SMTP username | **YES** |
| `SMTP_PASS` | `backend/services/emailService.js:43` | Optional | `''` | SMTP password / app password | **YES** |
| `SMTP_FROM` | `backend/services/emailService.js:44` | Optional | `'HireAI <no-reply@hireai.local>'` | Default sender header in outgoing emails | No |
| `REMINDER_INTERVAL_MS`| `backend/services/reminderScheduler.js:24` | Optional | `60000` | Milliseconds between background reminder polling ticks | No |
| `RATE_AUTH_MAX` | `backend/middleware/rateLimiter.js:64` | Optional | `20` | Max failed logins per 15-minute window | No |
| `RATE_REGISTER_MAX` | `backend/middleware/rateLimiter.js:79` | Optional | `10` | Max registrations per 60-minute window | No |
| `RATE_AI_GENERATE_MAX`| `backend/middleware/rateLimiter.js:95` | Optional | `30` | Max interview generation calls per 60-minute window | No |
| `RATE_STT_MAX` | `backend/middleware/rateLimiter.js:110`| Optional | `60` | Max transcription calls per 15-minute window | No |
| `RATE_HEALTH_MAX` | `backend/middleware/rateLimiter.js:125`| Optional | `30` | Max `/api/health` requests per 1-minute window | No |
| `GOOGLE_CLIENT_ID` | `backend/config/passport.js:10` | Optional | `undefined` | Google OAuth client credential | No |
| `GOOGLE_CLIENT_SECRET`| `backend/config/passport.js:11` | Optional | `undefined` | Google OAuth secret | **YES** |
| `GOOGLE_CALLBACK_URL` | `backend/config/passport.js:12` | Optional | `undefined` | Google OAuth redirect callback URI | No |
| `GITHUB_CLIENT_ID` | `backend/config/passport.js:58` | Optional | `undefined` | GitHub OAuth client credential | No |
| `GITHUB_CLIENT_SECRET`| `backend/config/passport.js:59` | Optional | `undefined` | GitHub OAuth secret | **YES** |
| `GITHUB_CALLBACK_URL` | `backend/config/passport.js:60` | Optional | `undefined` | GitHub OAuth redirect callback URI | No |
| `HF_HOME` | Python runtime (`stt_service.py`, `tts_service.py`) | Optional | `~/.cache/huggingface` | Directory to store downloaded HF weights | No |
| `VITE_API_URL` | Frontend (`src/services/*.js`) | **Yes (in prod)** | `''` (Proxies to `/api`) | Public backend HTTPS URL (e.g. `https://api.hireai.example.com`) | No |

---

## 6. NETWORK DEPENDENCY MAP

### 6.1 Call-by-Call Connection Inventory

```
Frontend (Vercel)
  │
  │ HTTPS:443 (JSON & Multipart) [Bearer JWT Auth]
  ▼
Backend (Oracle VM #1)
  ├── TCP:5432 ──► PostgreSQL (Local loopback 127.0.0.1) [DB Password Auth]
  ├── HTTP:11434 ──► Ollama (VM #2) [No HTTP Auth; VCN Security List Protected]
  ├── HTTP:8765 ──► Faster-Whisper STT (VM #3) [X-AI-Secret Header Auth]
  ├── HTTP:8766 ──► Kokoro TTS (VM #4) [X-AI-Secret Header Auth]
  ├── HTTP:8767 ──► CV Analysis (VM #5) [X-AI-Secret Header Auth]
  └── TCP:587 ──► External SMTP Gateway [SMTP AUTH Plain/Login]
```

Detailed connection attributes:

1. **Frontend → Backend**
   * **URL / Host Source:** Built into bundle via `VITE_API_URL` (reads `import.meta.env.VITE_API_URL`).
   * **Port:** `443` (HTTPS in production) or `5000` (Direct Node).
   * **Protocol:** HTTPS (HTTP/1.1 or HTTP/2).
   * **Authentication:** `Authorization: Bearer <JWT>` for protected endpoints; None for `/api/auth/login`, `/api/auth/register`, `/api/health`.
   * **Timeout:** Browser default `fetch()` timeout (~300s).
   * **Localhost Default:** Defaults to relative `'/api'`, which Vite proxies to `http://localhost:5000`.
   * **Remote Deployment Supported:** **YES** (Configured via `VITE_API_URL` across all 10 API service clients).
   * **Request Type:** JSON (`application/json`) or Multipart (`multipart/form-data` for resumes and recordings).
   * **Response Type:** JSON or binary streams (PDF/WAV).

2. **Backend → PostgreSQL**
   * **URL / Host Source:** `process.env.DB_HOST` (`backend/config/database.js:5`).
   * **Port:** `process.env.DB_PORT || 5432`.
   * **Protocol:** PostgreSQL native TCP protocol.
   * **Authentication:** User/password authentication via `pg.Pool`.
   * **Timeout:** Node-pg pool defaults (`connectionTimeoutMillis: 0` by default; standard socket timeout).
   * **Localhost Default:** `'localhost'`.
   * **Remote Deployment Supported:** **YES** (Standard connection string/params).
   * **Request Type:** SQL queries.
   * **Response Type:** PostgreSQL row sets.

3. **Backend → Ollama (VM #2)**
   * **URL / Host Source:** `process.env.OLLAMA_BASE_URL` (`backend/services/llmProvider.js:34`).
   * **Port:** Default `11434`.
   * **Protocol:** HTTP (or HTTPS if terminated by proxy).
   * **Authentication:** None at application layer.
   * **Timeout:** No explicit timeout set on `fetch()` (waits for full generation).
   * **Localhost Default:** `'http://localhost:11434'`.
   * **Remote Deployment Supported:** **YES**.
   * **Request Type:** `POST /api/generate` with JSON body: `{ model, prompt, stream: false, keep_alive: '30m', options: { temperature, num_predict } }`.
   * **Response Type:** JSON `{ response: "...", done: true, ... }`.

4. **Backend → Faster-Whisper STT (VM #3)**
   * **URL / Host Source:** `process.env.STT_SERVICE_URL` (`backend/services/sttService.js:23`).
   * **Port:** Default `8765`.
   * **Protocol:** HTTP.
   * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>` (`backend/services/sttService.js:33`).
   * **Timeout:** Default Node `fetch()` timeout.
   * **Localhost Default:** `'http://localhost:8765'`.
   * **Remote Deployment Supported:** **YES**.
   * **Request Type:** `POST /transcribe` with `multipart/form-data` containing field `audio` (in-memory audio buffer).
   * **Response Type:** JSON `{ transcript: "...", language: "...", language_probability: 0.99, duration_s: 1.2, audio_duration_s: 3.4, segments_meta: [...] }`.

5. **Backend → Kokoro TTS (VM #4)**
   * **URL / Host Source:** `process.env.TTS_SERVICE_URL` (`backend/services/kokoroService.js:21`).
   * **Port:** Default `8766`.
   * **Protocol:** HTTP.
   * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>` (`backend/services/kokoroService.js:32`).
   * **Timeout:** Default Node `fetch()` timeout.
   * **Localhost Default:** `'http://localhost:8766'`.
   * **Remote Deployment Supported:** **YES**.
   * **Request Type:** `POST /speak` with JSON body `{ text: "..." }`.
   * **Response Type:** Binary WAV stream (`audio/wav`).

6. **Backend → CV Analysis (VM #5)**
   * **URL / Host Source:** `process.env.CV_SERVICE_URL` (`backend/services/cvService.js:32`).
   * **Port:** Default `8767`.
   * **Protocol:** HTTP.
   * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>` (`backend/services/cvService.js:45`).
   * **Timeout:** Default Node `fetch()` timeout.
   * **Localhost Default:** `'http://127.0.0.1:8767'`.
   * **Remote Deployment Supported:** **YES** (Backend streams video file over HTTP multipart).
   * **Request Type:**
     * `POST /analyze`: `multipart/form-data` with fields `interview_id` and `video` (binary WebM).
     * `POST /analyze_frame`: JSON `{ image: "<base64>" }`.
   * **Response Type:** JSON `{ status: "complete", scores: { ... }, per_frame_raw: [ ... ] }`.

7. **Backend → SMTP Server**
   * **URL / Host Source:** `process.env.SMTP_HOST` (`backend/services/emailService.js:39`).
   * **Port:** `process.env.SMTP_PORT || 587`.
   * **Protocol:** SMTP / SMTPS.
   * **Authentication:** `auth: { user: SMTP_USER, pass: SMTP_PASS }`.
   * **Timeout:** `socketTimeout: 30000`, `connectionTimeout: 10000`, `greetingTimeout: 10000` (`emailService.js:71-73`).
   * **Localhost Default:** `''` (disabled).
   * **Remote Deployment Supported:** **YES**.

### 6.2 Code Assumptions Audit (Localhost, Paths, Filesystem)

* **Localhost / 127.0.0.1 hardcoding check:**
  * `backend/server.js`: Fallbacks default to `localhost` when environment variables are omitted, but strictly respect `FRONTEND_URL`, `PORT`, `DB_HOST`, `STT_SERVICE_URL`, `TTS_SERVICE_URL`, `CV_SERVICE_URL`, and `OLLAMA_BASE_URL`.
  * `backend/ai/cv_service.py:1137-1150`: Contains a fallback parser that accepts legacy JSON `{ file_path: "..." }`. When running in distributed mode, if a caller sends `file_path`, the service attempts a local file read and returns `FileNotFoundError`. The production backend uses multipart upload (`cvService.js:96-98`), completely bypassing this fallback.
* **Shared Filesystem check:**
  * CV Service previously depended on reading a file path on the backend host. **This is completely removed.** `backend/services/cvService.js:86-98` reads the file locally into a buffer and streams it across the network via multipart POST to VM #5. No NFS or shared mount is required.
* **Windows Paths check:**
  * Model paths in `cv_service.py:109-111` use `os.path.join(_SERVICE_DIR, "cv_model", ...)` which resolves cleanly using POSIX forward slashes on Linux.
  * Multer paths in `multer.js:5` and `multerRecording.js:7` use `path.join(__dirname, '..', 'uploads', ...)` which resolve cleanly on Linux.
  * No Windows-specific path separators (`C:\`, `\`) are hardcoded in any runtime production code.

---

## 7. API CONTRACTS FOR AI SERVICES

### 7.1 Faster-Whisper STT (VM #3)

* **Health Endpoint:** `GET /health`
  * **Auth:** Validates `X-AI-Secret` if `AI_SECRET_TOKEN` is set.
  * **Response (200 OK):**
    ```json
    { "status": "ok", "model": "whisper-small", "ready": true }
    ```
* **Transcription Endpoint:** `POST /transcribe`
  * **HTTP Method:** `POST`
  * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>` (matches via `hmac.compare_digest`).
  * **Request Content Type:** `multipart/form-data`
  * **Request Fields:** `audio` (binary audio file payload; wav, m4a, webm, ogg, etc.).
  * **Maximum File / Request Size:** Backend route enforces 25 MB (`backend/routes/sttRoutes.js:22`: `fileSize: 25 * 1024 * 1024`). Python server reads up to `Content-Length`.
  * **Response Format (200 OK):**
    ```json
    {
      "transcript": "Hello, my name is John and I am applying for the role.",
      "language": "en",
      "language_probability": 0.9854,
      "duration_s": 0.842,
      "word_count": 12,
      "segment_count": 1,
      "audio_duration_s": 3.42,
      "segments_meta": [
        { "start": 0.0, "end": 3.42, "text": "Hello, my name is John and I am applying for the role." }
      ]
    }
    ```
  * **Error Format:**
    * HTTP 400: `{ "error": "No audio field found in multipart body" }`
    * HTTP 401: `{ "error": "Unauthorized" }`
    * HTTP 500: `{ "error": "<exception-string>" }`
  * **Timeout / Retry Behavior:** Node caller catches connection errors and returns 503; no automatic retries.

### 7.2 Kokoro TTS (VM #4)

* **Health Endpoint:** `GET /health`
  * **Auth:** Validates `X-AI-Secret` if configured.
  * **Response (200 OK):**
    ```json
    { "status": "ok", "model": "kokoro-0.9.4", "voice": "af_heart", "ready": true }
    ```
* **Speech Synthesis Endpoint:** `POST /speak`
  * **HTTP Method:** `POST`
  * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>`
  * **Request Content Type:** `application/json`
  * **Request Fields:** `text` (string, required).
  * **Maximum File / Request Size:** Standard JSON body limit (typically < 100 KB text).
  * **Response Format (200 OK):** Binary stream of raw WAV audio (`Content-Type: audio/wav`, `Cache-Control: no-cache, no-store`). 24,000 Hz, 16-bit Mono PCM.
  * **Error Format:**
    * HTTP 400: `{ "error": "text is required" }`
    * HTTP 401: `{ "error": "Unauthorized" }`
    * HTTP 503: `{ "error": "Model not ready" }`
    * HTTP 500: `{ "error": "<exception-string>" }`
  * **Timeout / Retry Behavior:** If Kokoro fails or is unreachable, Express catches the error and falls back to Gemini TTS if Gemini keys exist (`backend/services/ttsService.js:93-94`).

### 7.3 CV Analysis Service (VM #5)

* **Health Endpoint:** `GET /health`
  * **Auth:** Validates `X-AI-Secret` if configured.
  * **Response (200 OK):**
    ```json
    {
      "status": "ok",
      "model_ready": true,
      "device": "cpu",
      "checkpoint_epoch": 20,
      "val_ap": 0.6842,
      "label_names": ["disquietment", "fear", "doubt_confusion", "confidence", "engagement", "disconnection"],
      "startup_errors": []
    }
    ```
* **Batch Video Analysis Endpoint:** `POST /analyze`
  * **HTTP Method:** `POST`
  * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>`
  * **Request Content Type:** `multipart/form-data`
  * **Request Fields:**
    * `interview_id` (string/text field)
    * `video` (binary file upload, WebM/MP4)
  * **Maximum File / Request Size:** Backend upload limit is 500 MB (`backend/config/multerRecording.js:48`). Python service buffers full request in memory/tempfile.
  * **Response Format (200 OK):**
    ```json
    {
      "interview_id": "12",
      "status": "complete",
      "scores": {
        "face_detection_rate": 0.96,
        "eye_contact_pct": 82.5,
        "facing_camera_rate": 0.91,
        "head_movement_deg": 4.8,
        "attention_score": 0.86,
        "engagement_estimate": 0.79,
        "confidence_indicator": 0.84,
        "disquietment_level": 0.08,
        "fear_level": 0.02,
        "doubt_confusion_level": 0.12,
        "disconnection_level": 0.05,
        "facial_activity": 0.14,
        "frames_total": 300,
        "frames_with_face": 288,
        "cnn_mean_probs": {
          "disquietment": 0.08,
          "fear": 0.02,
          "doubt_confusion": 0.12,
          "confidence": 0.84,
          "engagement": 0.79,
          "disconnection": 0.05
        }
      },
      "per_frame_raw": [ ... ],
      "analyzed_at": "2026-09-13T03:00:00.000Z",
      "elapsed_s": 42.15
    }
    ```
  * **Error Format:**
    * HTTP 400: `{ "error": "interview_id field is required" }`
    * HTTP 401: `{ "error": "Unauthorized" }`
    * HTTP 503: `{ "error": "Model not ready", "startup_errors": [...] }`
    * HTTP 500: `{ "interview_id": "12", "status": "error", "error": "<exception-string>" }`
* **Single Frame Live Endpoint:** `POST /analyze_frame`
  * **HTTP Method:** `POST`
  * **Authentication:** `X-AI-Secret: <AI_SECRET_TOKEN>`
  * **Request Content Type:** `application/json`
  * **Request Fields:** `image` (base64 string of JPEG/PNG frame)
  * **Response Format (200 OK):**
    ```json
    {
      "status": "ok",
      "face_detected": true,
      "bbox": [120, 80, 200, 220],
      "normalized_bbox": [0.18, 0.16, 0.31, 0.45],
      "frame_size": [640, 480],
      "conf": 0.94,
      "emotions": { "confidence": 0.81, "engagement": 0.75, ... },
      "confidence": 0.81,
      "gaze": { "towards_camera": true, ... },
      "head_pose": { "yaw": 2.1, "pitch": -4.3, "facing_camera": true },
      "face_visibility_pct": 100.0,
      "camera_status": "active"
    }
    ```

### 7.4 Ollama LLM (VM #2)

* **Health Endpoint:** `GET /` or `GET /api/tags`
* **Inference Endpoint:** `POST /api/generate`
  * **HTTP Method:** `POST`
  * **Authentication:** None at Ollama layer (VCN private subnet restriction).
  * **Request Content Type:** `application/json`
  * **Request Body:**
    ```json
    {
      "model": "qwen2.5:3b",
      "prompt": "You are an expert technical interviewer...",
      "stream": false,
      "keep_alive": "30m",
      "options": {
        "temperature": 0.2,
        "num_predict": 4096
      }
    }
    ```
  * **Response Format (200 OK):**
    ```json
    {
      "model": "qwen2.5:3b",
      "created_at": "2026-09-13T03:00:00.000000000Z",
      "response": "[\n  {\n    \"question\": \"Explain the difference between process and thread.\", ...\n  }\n]",
      "done": true,
      "total_duration": 4200000000,
      "load_duration": 50000000,
      "prompt_eval_count": 250,
      "eval_count": 450
    }
    ```
  * **Error Format:** HTTP non-200 with error message string.

---

## 8. DATABASE DEPLOYMENT

### 8.1 Database Configuration & Connection Pool
* **Host / Port:** Configured via `DB_HOST` (default `localhost`) and `DB_PORT` (default `5432`) at `backend/config/database.js:5-6`.
* **Database Name:** Default `ai_recruitment` (`database.js:7`).
* **User / Password:** `DB_USER` (default `postgres`), `DB_PASSWORD`.
* **Pool Settings:** Initialized with standard Node `pg.Pool` (`database.js:4-10`).
* **Error Handling:** `pool.on('error', ...)` logs client failure and issues `process.exit(1)` (`database.js:12-15`).

### 8.2 Initialization Entry Point & Trigger
* **Initialization Function:** `initDatabase()` in `backend/config/database.js:27-436`.
* **Execution Trigger:** Called automatically inside `startServer()` in `backend/server.js:95`:
  ```javascript
  await testConnection()
  await initDatabase()
  ```
* **Clean Empty DB Capability:** **YES.** Every table creation uses `CREATE TABLE IF NOT EXISTS`, followed by idempotent `ALTER TABLE ADD COLUMN IF NOT EXISTS`, idempotent constraint drop/add blocks, and `CREATE INDEX IF NOT EXISTS`. A fresh, empty PostgreSQL database will completely initialize without error on the first run of `node server.js`.

### 8.3 Table Schema Inventory

The repository establishes exactly ten (10) relational tables:

1. **`users`** (`database.js:33-45`)
   * Columns: `id` (SERIAL PK), `name` (VARCHAR), `email` (VARCHAR UNIQUE), `password` (VARCHAR), `role` (VARCHAR DEFAULT 'USER'), `provider` (VARCHAR DEFAULT 'LOCAL'), `google_id`, `github_id`, `avatar`, `created_at`, `updated_at`, `is_active` (BOOLEAN DEFAULT true), `notif_email_enabled` (BOOLEAN DEFAULT true), `notif_reminders_enabled` (BOOLEAN DEFAULT true), `notif_reports_enabled` (BOOLEAN DEFAULT true).
   * Constraints: `users_role_check_upper` CHECK (`role IN ('ADMIN', 'RECRUITER', 'USER')`), `users_provider_check_upper` CHECK (`provider IN ('LOCAL', 'GOOGLE', 'GITHUB')`).
   * Triggers: `update_users_updated_at` (BEFORE UPDATE EXECUTE FUNCTION `update_updated_at_column()`).
2. **`resumes`** (`database.js:114-123`)
   * Columns: `id` (SERIAL PK), `user_id` (INT REFERENCES users(id) ON DELETE CASCADE), `filename`, `original_name`, `file_path`, `file_size`, `upload_date`.
   * Indexes: `idx_resumes_user` ON `resumes(user_id)`.
3. **`resume_analyses`** (`database.js:126-138`)
   * Columns: `id` (SERIAL PK), `resume_id` (INT REFERENCES resumes(id) ON DELETE CASCADE), `contact_info` (JSONB), `skills` (JSONB), `technologies` (JSONB), `experience` (JSONB), `education` (JSONB), `summary` (TEXT), `raw_text` (TEXT), `ats_score` (JSONB), `analyzed_at`.
   * Indexes: `idx_resume_analyses_resume` ON `resume_analyses(resume_id)`.
4. **`interviews`** (`database.js:148-163`)
   * Columns: `id` (SERIAL PK), `user_id` (INT REFERENCES users(id) ON DELETE CASCADE), `resume_analysis_id` (INT REFERENCES resume_analyses(id) ON DELETE SET NULL), `selected_role`, `interview_type`, `difficulty`, `question_count`, `status`, `score`, `started_at`, `completed_at`, `duration`, `created_at`, `paused_at`, `paused_duration`, `questions_answered`, `overall_feedback`, `strengths` (JSONB), `weaknesses` (JSONB), `recommendations` (JSONB), `category_scores` (JSONB), `hire_recommendation`, `performance_rating`.
   * Indexes: `idx_interviews_user` ON `interviews(user_id)`.
5. **`interview_questions`** (`database.js:179-190`)
   * Columns: `id` (SERIAL PK), `interview_id` (INT REFERENCES interviews(id) ON DELETE CASCADE), `question` (TEXT), `category`, `question_type`, `expected_language`, `difficulty`, `expected_points` (TEXT), `sequence` (INT).
   * Indexes: `idx_interview_questions_interview` ON `interview_questions(interview_id)`.
6. **`interview_answers`** (`database.js:196-205`)
   * Columns: `id` (SERIAL PK), `question_id` (INT REFERENCES interview_questions(id) ON DELETE CASCADE), `answer` (TEXT), `time_taken` (INT), `score` (INT), `feedback` (TEXT), `submitted_at`, `speech_analysis` (JSONB).
   * Constraints: `interview_answers_question_id_key` (UNIQUE on `question_id` at `database.js:224`).
7. **`interview_recordings`** (`database.js:234-248`)
   * Columns: `id` (SERIAL PK), `user_id` (INT REFERENCES users(id) ON DELETE CASCADE), `interview_id` (INT REFERENCES interviews(id) ON DELETE CASCADE), `recording_type`, `file_name`, `file_path` (TEXT), `mime_type`, `file_size` (BIGINT), `start_time`, `end_time`, `duration_seconds`, `created_at`.
   * Indexes: `idx_interview_recordings_interview` ON `(interview_id)`, `idx_interview_recordings_user` ON `(user_id)`, `idx_interview_recordings_dedup` UNIQUE ON `(interview_id, recording_type)`.
8. **`interview_cv_analysis`** (`database.js:295-330`)
   * Columns: `id` (SERIAL PK), `interview_id` (INT REFERENCES interviews(id) ON DELETE CASCADE), `recording_id` (INT REFERENCES interview_recordings(id) ON DELETE SET NULL), `status`, `analyzed_at`, `error_message`, `face_detection_rate` (REAL), `eye_contact_pct` (REAL), `facing_camera_rate` (REAL), `head_movement_deg` (REAL), `attention_score` (REAL), `engagement_estimate` (REAL), `confidence_indicator` (REAL), `disquietment_level` (REAL), `fear_level` (REAL), `doubt_confusion_level` (REAL), `disconnection_level` (REAL), `facial_activity` (REAL), `frames_total` (INT), `frames_with_face` (INT), `cnn_mean_probs` (JSONB), `per_frame_raw` (JSONB), `warning_count` (INT DEFAULT 0), `warning_events` (JSONB DEFAULT '[]'), `avg_face_visibility` (REAL), `created_at`.
   * Constraints & Indexes: `idx_cv_analysis_interview_unique` UNIQUE ON `(interview_id)`, `idx_cv_analysis_status` ON `(status)`.
9. **`notifications`** (`database.js:363-373`)
   * Columns: `id` (SERIAL PK), `user_id` (INT REFERENCES users(id) ON DELETE CASCADE), `type`, `title`, `message`, `data` (JSONB DEFAULT '{}'), `is_read` (BOOLEAN DEFAULT false), `created_at`.
   * Indexes: `idx_notifications_user_read` ON `(user_id, is_read)`, `idx_notifications_created` ON `(created_at DESC)`.
10. **`scheduled_interviews`** (`database.js:397-412`)
    * Columns: `id` (SERIAL PK), `recruiter_id` (INT REFERENCES users(id) ON DELETE SET NULL), `candidate_id` (INT REFERENCES users(id) ON DELETE CASCADE), `role`, `scheduled_at` (TIMESTAMPTZ), `duration_minutes` (INT DEFAULT 45), `interview_type` (DEFAULT 'Video Call'), `status` (DEFAULT 'scheduled'), `reminder_sent_24h` (BOOLEAN DEFAULT false), `reminder_sent_1h` (BOOLEAN DEFAULT false), `notes`, `created_at`, `updated_at`.
    * Indexes: `idx_sched_candidate` ON `(candidate_id, scheduled_at)`, `idx_sched_recruiter` ON `(recruiter_id, scheduled_at)`, `idx_sched_status_at` ON `(status, scheduled_at)`.

### 8.4 Default Admin / Seed Behavior
* **Automatic Seed Exists?** **NO.** The codebase contains NO default user insert statements, seeds, or fixtures.
* **Public Admin Registration?** **BLOCKED.** In `backend/controllers/authController.js:14-17`:
  ```javascript
  const PUBLIC_ROLES = ['USER', 'RECRUITER']
  const requestedRole = (role || '').toUpperCase()
  if (!PUBLIC_ROLES.includes(requestedRole)) {
    return res.status(400).json({ success: false, message: 'Invalid role selected.' })
  }
  ```
* **How Initial Admin is Created:** The operator must register a standard account via the frontend (`/register`), then execute an explicit SQL update directly in PostgreSQL on VM #1:
  ```sql
  UPDATE users SET role = 'ADMIN' WHERE email = 'admin@yourcompany.com';
  ```

---

## 9. UPLOAD / FILESYSTEM INVENTORY

| Feature | File Type | Max Size | Temporary vs Persistent | Directory / Storage Location | Host | Used By | Must Survive Restart? |
|---|---|---|---|---|---|---|---|
| **Resume Upload** | PDF only (`.pdf`) | 5 MB (`multer.js:29`) | **Persistent** | `backend/uploads/resumes/` | VM #1 (Backend) | `resumeRoutes.js`, `resumeParser.js` | **YES** (Linked by DB `resumes.file_path`) |
| **Interview Recording** | Video/Audio (`webm`, `ogg`, `mp4`) | 500 MB (`multerRecording.js:48`) | **Persistent** | `backend/uploads/recordings/` | VM #1 (Backend) | `recordingRoutes.js`, `cvService.js` | **YES** (Linked by DB `interview_recordings.file_path`) |
| **STT Audio Payload** | Raw audio buffer | 25 MB (`sttRoutes.js:22`) | **In-Memory** | RAM Buffer (`multer.memoryStorage()`) | VM #1 (Backend) | `sttRoutes.js` | **NO** |
| **STT Temp Decoding File** | Temp audio file (`.bin`/`.wav`) | Up to 25 MB | **Temporary** | OS Temp (`tempfile.gettempdir()`) | VM #3 (STT) | `stt_service.py:133-138` | **NO** (Deleted in `finally` block at line 208) |
| **CV Video Temp File** | Binary video (`.webm`) | Up to 500 MB | **Temporary** | OS Temp (`tempfile.gettempdir()`) | VM #5 (CV) | `cv_service.py:1162-1167` | **NO** (Deleted in `finally` block at line 1185) |
| **Generated Reports (PDF)** | PDF document stream | Dynamic (typically < 2 MB) | **Ephemeral** | Streamed directly to HTTP socket | VM #1 (Backend) | `reportController.js:57` (PDFKit piped to `res`) | **NO** (Never written to disk) |
| **Generated Reports (CSV)** | CSV plain text string | Dynamic (< 500 KB) | **Ephemeral** | In-memory string | VM #1 (Backend) | `reportController.js:53` (`res.send(csv)`) | **NO** (Never written to disk) |
| **Gemini API Usage State** | JSON counter state | < 10 KB | **Persistent** | `backend/data/gemini_counters.json` | VM #1 (Backend) | `geminiKeyManager.js:9` | **YES** (Preserves daily quota tracking) |
| **CV Model Weights** | PyTorch & ONNX weights | ~45.1 MB | **Persistent** | `backend/ai/cv_model/` | VM #5 (CV) | `cv_service.py` | **YES** (Required for service startup) |
| **HuggingFace Cache** | Whisper & Kokoro weights | ~850 MB | **Persistent** | `~/.cache/huggingface/hub/` (or `$HF_HOME`) | VM #3 & #4 | `faster-whisper`, `kokoro` | **YES** (Avoids redownloading on restart) |
| **Ollama Model Blobs** | Qwen 2.5 3B GGUF weights | ~2.2 GB | **Persistent** | `~/.ollama/models/` | VM #2 (LLM) | `ollama` daemon | **YES** |

---

## 10. PUBLIC PORTS / FIREWALL REQUIREMENTS

Security Principle: **Minimum Necessary Public Surface**. Only the Frontend (managed by Vercel) and the Backend API Entrypoint (Oracle VM #1) require public Internet ingress. All AI microservices and database engines must remain strictly private.

| Host Node | Service | Port | Protocol | Needs Public Access? | Who Should Access It? | Firewall / Security List Rule |
|---|---|---|---|---|---|---|
| **Vercel** | Frontend SPA | 443 | HTTPS | **YES** | Public Internet (all users) | Vercel Edge Managed |
| **Oracle VM #1** | Backend (Nginx Reverse Proxy) | 443 | HTTPS | **YES** | Public Internet (Frontend API clients) | Ingress 0.0.0.0/0 on 443 |
| **Oracle VM #1** | Backend (Node Express) | 5000 | HTTP | **NO** | Localhost only (Nginx reverse proxy) | Loopback 127.0.0.1; Block public 5000 |
| **Oracle VM #1** | PostgreSQL | 5432 | TCP | **NO** | Localhost only (Express backend on VM #1) | Loopback 127.0.0.1; Block all remote |
| **Oracle VM #2** | Ollama LLM | 11434 | HTTP | **NO** | Oracle VM #1 Private IP only | Ingress from VM #1 Private IP on 11434; Block public |
| **Oracle VM #3** | Faster-Whisper STT | 8765 | HTTP | **NO** | Oracle VM #1 Private IP only | Ingress from VM #1 Private IP on 8765; Block public |
| **Oracle VM #4** | Kokoro TTS | 8766 | HTTP | **NO** | Oracle VM #1 Private IP only | Ingress from VM #1 Private IP on 8766; Block public |
| **Oracle VM #5** | CV Analysis Service | 8767 | HTTP | **NO** | Oracle VM #1 Private IP only | Ingress from VM #1 Private IP on 8767; Block public |
| **All VMs** | SSH Management | 22 | SSH | Restrict | Operator / Teammate IP addresses only | Ingress from Operator IP on 22 |

---

## 11. AUTHENTICATION / SERVICE SECURITY

### 11.1 Frontend → Backend
* **Mechanism:** Bearer JSON Web Token (JWT).
* **Issuance:** Emitted upon successful `POST /api/auth/login` or `POST /api/auth/register` (`authController.js:32, 75`).
* **Verification:** `backend/middleware/auth.js:authenticate` intercepts requests, extracts header `Authorization: Bearer <token>`, calls `jwt.verify(token, process.env.JWT_SECRET)`.
* **Payload:** `{ id, email, role }` signed using `JWT_SECRET`.
* **RBAC:** `authorize(...allowedRoles)` verifies `req.user.role` against endpoint requirements (e.g. `'ADMIN'`, `'RECRUITER'`, `'USER'`).

### 11.2 Backend → STT, TTS, and CV Microservices
* **Mechanism:** Shared secret header authentication via `X-AI-Secret`.
* **Implementation:**
  * Express backend attaches header: `headers['X-AI-Secret'] = process.env.AI_SECRET_TOKEN` (`sttService.js:33`, `kokoroService.js:33`, `cvService.js:45`).
  * Python microservices inspect header:
    ```python
    _AI_SECRET = os.environ.get("AI_SECRET_TOKEN", "").strip()
    def _check_auth(handler):
        if not _AI_SECRET:
            return True # Local-dev pass-through mode
        provided = handler.headers.get("X-AI-Secret", "").strip()
        return hmac.compare_digest(provided, _AI_SECRET)
    ```
    *(Source: `stt_service.py:47-58`, `tts_service.py:42-53`, `cv_service.py:50-61`)*
* **Dev Passthrough:** When `AI_SECRET_TOKEN` is unset or empty, microservices pass all requests without check (localhost compatibility).
* **Production Security:** When `AI_SECRET_TOKEN` is set, unauthenticated calls receive immediate `HTTP 401 Unauthorized`. Constant-time comparison (`hmac.compare_digest`) guards against timing side-channel attacks.

### 11.3 Backend → Ollama Protection
* **Mechanism:** Network-level authorization.
* **Findings:** Ollama has no built-in HTTP header authentication mechanism. Protection relies entirely on Oracle Cloud Virtual Cloud Network (VCN) security lists or iptables firewall restricting port 11434 to VM #1's private IP.

### 11.4 Admin Protection & RBAC
* **Admin Routes:** Mounted under `/api/admin` (`backend/routes/adminRoutes.js`).
* **Guard:** Every route is gated by `authenticate` and `authorize('ADMIN')` (`adminRoutes.js:28-29`).
* **Admin Privilege Promotion:** Non-administrators cannot promote themselves. Registration restricts role selection to `USER` and `RECRUITER` (`authController.js:14`). Administration requires direct database role promotion (`UPDATE users SET role = 'ADMIN' WHERE email = '...'`).

---

## 12. ARM64 DEPLOYMENT STATUS

Evaluation for deployment on Oracle Cloud Ampere A1 (aarch64) instances:

| Component | Status | Repository & Ecosystem Evidence | Action Required / Risk |
|---|---|---|---|
| **Node.js 20+ Express** | **VERIFIED** | Pure JavaScript; standard npm modules (`express`, `pg`, `bcryptjs`, `jsonwebtoken`). Official Node.js aarch64 binaries exist. | None. Installs cleanly via standard Node runtime. |
| **PostgreSQL 15+** | **VERIFIED** | Standard apt packages available in Ubuntu/Debian official `arm64` repositories. | None. Standard `apt-get install postgresql`. |
| **Ollama / Qwen 2.5 3B** | **VERIFIED** | Official install script (`curl -fsSL https://ollama.com/install.sh | sh`) provides native aarch64 binary. Qwen weights run via native GGML. | None. Fully supported on Linux aarch64. |
| **PyTorch (`torch>=2.1.0`)** | **LIKELY** | PyTorch publishes official `manylinux2014_aarch64` CPU wheels on PyPI. | Verify wheel availability for target Python minor version (3.10/3.11). |
| **Torchvision (`torchvision>=0.16.0`)**| **LIKELY** | Official aarch64 wheels published in sync with PyTorch. | Standard pip install. |
| **OpenCV Headless (`opencv-python-headless`)** | **LIKELY** | Prebuilt `manylinux_2_17_aarch64` wheels are published on PyPI for `opencv-python-headless>=4.8.0`. | Requires system libraries `libgl1`, `libglib2.0-0`. |
| **NumPy (`numpy>=1.24.0`)** | **VERIFIED** | Official prebuilt aarch64 wheels on PyPI for all supported Python versions. | Standard pip install. |
| **Kokoro (`kokoro>=0.9.4`)** | **LIKELY** | Pure Python package utilizing `torch` and `soundfile`. `espeak-ng` package is natively compiled in Debian/Ubuntu `arm64`. | Requires `sudo apt install -y espeak-ng`. |
| **Faster-Whisper (`faster-whisper>=1.0.3`)** | **NOT VERIFIED / POTENTIAL BLOCKER** | Depends on `CTranslate2`. As documented in `backend/ai/requirements-stt.txt:32-38`, CTranslate2 historically lacks consistent prebuilt `aarch64` PyPI wheels. | **Mandatory Pre-Deployment Action:** Test `pip install ctranslate2` on target Oracle A1 ARM64 VM. If wheels are unavailable, compilation from source or switching STT VM to an x86 instance will be required. |

---

## 13. RESOURCE REQUIREMENT SUMMARY

Estimates based on model parameters, runtime dependencies, and process architecture (no GPU acceleration on Oracle Always Free tier):

| Server / VM | Target Process | Estimated RAM Pressure | Estimated CPU Pressure | Estimated Disk Storage | Memory Uncertainty Statement |
|---|---|---|---|---|---|
| **VM #1 (Backend)** | Node.js Backend + PostgreSQL 15 | **1.5 GB – 3.0 GB** (Node RSS ~150-300MB; PG buffer pool ~512MB-1GB; OS cache) | Low to Medium (Bursting during PDFKit generation & bcrypt password hashing) | **10 GB – 25 GB** (OS: 5GB; Node modules: 1GB; Resumes & recordings: 5-15GB) | Exact RAM depends on volume of concurrent video recording uploads and PostgreSQL active connection count. |
| **VM #2 (LLM)** | Ollama (`qwen2.5:3b`) | **3.0 GB – 4.5 GB** (Model weights in RAM: ~2.2GB; Context cache & KV state: ~1GB; OS: ~500MB) | High (100% saturation across allocated vCPUs during question generation) | **10 GB – 15 GB** (OS: 5GB; Ollama GGUF weights: ~2.5GB) | Runtime memory is predictable based on Qwen 3B quant size, but context length scaling can consume an additional 500MB-1GB. |
| **VM #3 (STT)** | Faster-Whisper Small (CPU int8) | **1.5 GB – 2.5 GB** (Whisper model: ~500MB; CTranslate2 execution buffer: ~500MB; OS: ~500MB) | High (Multi-threaded saturation during transcription; 5-10s per candidate answer) | **8 GB – 12 GB** (OS: 5GB; HuggingFace model cache: ~600MB) | Exact RAM during beam search (beam_size=5) varies with audio duration. |
| **VM #4 (TTS)** | Kokoro TTS (CPU float32) | **1.5 GB – 2.5 GB** (PyTorch runtime + Kokoro 82M weights: ~600MB; Audio buffers: ~200MB; OS: ~500MB) | High (CPU synthesis takes ~1-3s per sentence on 2-4 vCPUs) | **8 GB – 12 GB** (OS: 5GB; Kokoro weights & phoneme cache: ~500MB) | Peak memory depends on generated WAV duration. |
| **VM #5 (CV)** | CV Service (ResNet-18 + YuNet) | **2.5 GB – 4.0 GB** (PyTorch ResNet-18: ~400MB; OpenCV video frame decode buffer: ~1-2GB for large videos; OS: ~500MB) | High (Frame-by-frame decoding & inference takes ~30-90s for a 5-minute video) | **10 GB – 15 GB** (OS: 5GB; Model files: ~50MB; Temp decoding files: up to 2-5GB peak) | Video resolution (e.g. 1080p vs 480p) directly impacts frame buffer memory in OpenCV. |

---

## 14. LOCALHOST TO PRODUCTION MAPPING

| Localhost URL / Port | Production Target | Environment Variable Configuration |
|---|---|---|
| `http://localhost:5173` (Vite) | `https://hireai.vercel.app` (or custom domain) | Configured in Vercel project settings; set as `FRONTEND_URL` in `backend/.env` |
| `http://localhost:5000` (Backend) | `https://api.hireai.yourdomain.com` | Set as `VITE_API_URL` in Vercel project environment variables |
| `127.0.0.1:5432` (PostgreSQL) | `127.0.0.1:5432` (on VM #1) | Set as `DB_HOST=127.0.0.1` and `DB_PORT=5432` in `backend/.env` |
| `http://localhost:11434` (Ollama) | `http://<VM2_PRIVATE_IP>:11434` | Set as `OLLAMA_BASE_URL` in `backend/.env` |
| `http://localhost:8765` (Whisper STT)| `http://<VM3_PRIVATE_IP>:8765` | Set as `STT_SERVICE_URL` in `backend/.env` |
| `http://localhost:8766` (Kokoro TTS) | `http://<VM4_PRIVATE_IP>:8766` | Set as `TTS_SERVICE_URL` in `backend/.env` |
| `http://127.0.0.1:8767` (CV Service)| `http://<VM5_PRIVATE_IP>:8767` | Set as `CV_SERVICE_URL` in `backend/.env` |
| Dev Auth Passthrough (`AI_SECRET_TOKEN=""`)| Shared Token (`openssl rand -hex 32`)| Set identical `AI_SECRET_TOKEN` on VM #1, VM #3, VM #4, and VM #5 |

---

## 15. DEPLOYMENT ORDER

Based strictly on code dependency resolution (services must be available when higher-level callers boot):

```
Phase 1: Database & Foundation
  └─ Step 1: Deploy PostgreSQL on VM #1 (initialize database `ai_recruitment`)

Phase 2: Independent AI Microservices (Parallelizable across VMs #2, #3, #4, #5)
  ├─ Step 2: Deploy Ollama on VM #2 (pull `qwen2.5:3b`, verify port 11434 bound to 0.0.0.0)
  ├─ Step 3: Deploy Faster-Whisper on VM #3 (install venv, verify port 8765 ready)
  ├─ Step 4: Deploy Kokoro TTS on VM #4 (install espeak-ng, venv, verify port 8766 ready)
  └─ Step 5: Deploy CV Analysis on VM #5 (copy model files, install venv, verify port 8767 ready)

Phase 3: Core Backend Orchestration
  └─ Step 6: Deploy Node.js Backend on VM #1
             (Configure backend/.env with private IPs of VMs #2-5, run migrations, verify /api/health)

Phase 4: Security & Ingress
  └─ Step 7: Configure Nginx + SSL certificate on VM #1 (reverse proxy port 443 -> 5000)

Phase 5: Client Application
  └─ Step 8: Deploy Frontend to Vercel (Set VITE_API_URL=https://api.hireai.yourdomain.com, trigger build)

Phase 6: End-to-End Operational Validation
  └─ Step 9: Register initial user via frontend, promote to ADMIN via PostgreSQL CLI, execute test interview
```

---

## 16. FIRST-BOOT CHECKLIST

### 16.1 Oracle VM #1 (Backend + PostgreSQL)
- [ ] OS packages installed: `sudo apt update && sudo apt install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx`
- [ ] Node.js version verified: `node -v` (>= 20.0.0)
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Target database created: `sudo -u postgres psql -c "CREATE DATABASE ai_recruitment;"`
- [ ] Target user created: `sudo -u postgres psql -c "CREATE USER hireai WITH ENCRYPTED PASSWORD '...'; GRANT ALL PRIVILEGES ON DATABASE ai_recruitment TO hireai;"`
- [ ] Repository cloned to `/opt/hireai` or user home
- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] Environment file created: `cp backend/.env.example backend/.env`
- [ ] `backend/.env` configured with production database credentials, JWT secret, AI URLs (pointing to VMs #2-5), and `AI_SECRET_TOKEN`
- [ ] Ingress firewall open on TCP 22 (SSH) and TCP 443 / 80 (HTTPS/HTTP)
- [ ] Ingress firewall BLOCKED for 5000 and 5432 from public internet
- [ ] Start backend with process manager: `pm2 start server.js --name hireai-backend`
- [ ] Health check verified: `curl -I http://localhost:5000/api/health` returns `200 OK`

### 16.2 Oracle VM #2 (Ollama / LLM)
- [ ] Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
- [ ] Configure systemd service override:
  `sudo systemctl edit ollama.service` adding:
  ```ini
  [Service]
  Environment="OLLAMA_HOST=0.0.0.0:11434"
  ```
- [ ] Reload and restart daemon: `sudo systemctl daemon-reload && sudo systemctl restart ollama`
- [ ] Verify bind host: `netstat -tlpn | grep 11434` shows `0.0.0.0:11434` (NOT `127.0.0.1`)
- [ ] Pull Qwen model: `ollama pull qwen2.5:3b`
- [ ] Verify model listing: `ollama list` contains `qwen2.5:3b`
- [ ] Firewall security list: Ingress on 11434 permitted ONLY from VM #1 private IP
- [ ] Liveness check from VM #1: `curl http://<VM2_PRIVATE_IP>:11434/api/tags` returns 200 with model list

### 16.3 Oracle VM #3 (Faster-Whisper STT)
- [ ] Python 3 installed: `sudo apt update && sudo apt install -y python3 python3-venv python3-pip`
- [ ] Create isolated virtualenv: `python3 -m venv /opt/stt-venv`
- [ ] Install dependencies: `/opt/stt-venv/bin/pip install -r backend/ai/requirements-stt.txt`
- [ ] *(CRITICAL)* Validate CTranslate2 install: `/opt/stt-venv/bin/python -c "import ctranslate2; print(ctranslate2.__version__)"`
- [ ] Environment variable configured: Set `AI_SECRET_TOKEN` matching VM #1
- [ ] Start service:
  ```bash
  AI_SECRET_TOKEN="<shared-token>" /opt/stt-venv/bin/python backend/ai/stt_service.py --port 8765 --model small --device cpu --compute-type int8
  ```
- [ ] Firewall security list: Ingress on 8765 permitted ONLY from VM #1 private IP
- [ ] Liveness check from VM #1: `curl -H "X-AI-Secret: <token>" http://<VM3_PRIVATE_IP>:8765/health` returns `{"status":"ok","model":"whisper-small","ready":true}`

### 16.4 Oracle VM #4 (Kokoro TTS)
- [ ] System audio dependencies installed: `sudo apt update && sudo apt install -y python3 python3-venv python3-pip espeak-ng libsndfile1`
- [ ] Create isolated virtualenv: `python3 -m venv /opt/tts-venv`
- [ ] Install dependencies: `/opt/tts-venv/bin/pip install -r backend/ai/requirements-tts.txt`
- [ ] Start service with explicit `--host 0.0.0.0`:
  ```bash
  AI_SECRET_TOKEN="<shared-token>" /opt/tts-venv/bin/python backend/ai/tts_service.py --host 0.0.0.0 --port 8766 --device cpu
  ```
- [ ] Verify model download completes during boot (~350 MB download)
- [ ] Firewall security list: Ingress on 8766 permitted ONLY from VM #1 private IP
- [ ] Liveness check from VM #1: `curl -H "X-AI-Secret: <token>" http://<VM4_PRIVATE_IP>:8766/health` returns `{"status":"ok","model":"kokoro-0.9.4","ready":true}`

### 16.5 Oracle VM #5 (CV Analysis)
- [ ] System vision dependencies installed: `sudo apt update && sudo apt install -y python3 python3-venv python3-pip libgl1 libglib2.0-0`
- [ ] Create directory structure: `mkdir -p backend/ai/cv_model`
- [ ] Provision model files via SCP from developer machine:
  * `backend/ai/cv_model/best_checkpoint.pt`
  * `backend/ai/cv_model/face_detection_yunet_2023mar.onnx`
  * `backend/ai/cv_model/class_labels.json`
- [ ] Verify file sizes on disk: `ls -lh backend/ai/cv_model/`
- [ ] Create isolated virtualenv: `python3 -m venv /opt/cv-venv`
- [ ] Install dependencies: `/opt/cv-venv/bin/pip install -r backend/ai/requirements-cv.txt`
- [ ] Start service with explicit `--host 0.0.0.0`:
  ```bash
  AI_SECRET_TOKEN="<shared-token>" /opt/cv-venv/bin/python backend/ai/cv_service.py --host 0.0.0.0 --port 8767
  ```
- [ ] Verify output: `[CV] Model ready — epoch=... val_ap=...` and `[CV] YuNet detector loaded.`
- [ ] Firewall security list: Ingress on 8767 permitted ONLY from VM #1 private IP
- [ ] Liveness check from VM #1: `curl -H "X-AI-Secret: <token>" http://<VM5_PRIVATE_IP>:8767/health` returns `{"status":"ok","model_ready":true}`

### 16.6 Frontend (Vercel)
- [ ] In Vercel Project Settings → Environment Variables:
  * Set `VITE_API_URL=https://api.hireai.yourdomain.com`
- [ ] Framework preset confirmed: `Vite`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Trigger deployment from branch `Hemanth_M`
- [ ] Verify deployment loads in browser over HTTPS without mixed-content errors.

---

## 17. DEPLOYMENT BLOCKERS

Genuine blockers substantiated by direct repository audit:

### 17.1 Code Blockers
* **None Detected.** The prior hardening passes resolved all previous architectural blockers:
  * CV Service now uses multipart streaming (`cvService.js:96-98` / `cv_service.py:1100-1168`); shared filesystem dependency has been eliminated.
  * Ollama URL is configurable via `OLLAMA_BASE_URL` (`llmProvider.js:34`).
  * TTS and CV Python services support network binding via `--host 0.0.0.0`.
  * Rate limiters are established with proxy trust enabled (`server.js:37-39`).
  * Token-based authentication protects all Python microservices (`AI_SECRET_TOKEN`).

### 17.2 Runtime Compatibility Blockers
* **CTranslate2 on Linux ARM64 (Oracle A1 Ampere):**
  * *Evidence:* `backend/ai/requirements-stt.txt:32-38` and `README_DEPLOYMENT.md:96-99`.
  * *Fact:* CTranslate2 does not publish universal `manylinux2014_aarch64` wheels for all Python versions on PyPI.
  * *Risk:* Running `pip install -r requirements-stt.txt` on an ARM64 Oracle Cloud VM may fail or require manual CMake compilation from source.
  * *Resolution Path:* Must be validated on the actual ARM64 instance before finalizing VM allocation. If compilation fails, VM #3 must use an AMD/Intel (x86_64) instance.

### 17.3 Model Provisioning Blockers
* **CV Model Weights Omission from Git:**
  * *Evidence:* `.gitignore:51-52` explicitly excludes `backend/ai/cv_model/*.pt` and `backend/ai/cv_model/*.onnx`.
  * *Fact:* `git clone` on VM #5 will produce an empty `backend/ai/cv_model/` directory (only `.gitkeep` is tracked).
  * *Risk:* If operator starts `cv_service.py` without manually uploading `best_checkpoint.pt` and `face_detection_yunet_2023mar.onnx`, the service will enter degraded status (`_model_ready = False`) and reject all interview analysis requests with HTTP 503.
  * *Resolution Path:* Files must be transferred via SCP or private object storage during deployment.

### 17.4 Infrastructure Blockers
* **Ollama Default Binding Security:**
  * *Evidence:* Standard `ollama serve` binds to `127.0.0.1:11434`.
  * *Fact:* Ollama will refuse external connections unless started with `OLLAMA_HOST=0.0.0.0:11434`.
  * *Risk:* Binding Ollama to `0.0.0.0` exposes it without authentication unless the Oracle VCN security list strictly restricts ingress to VM #1.
* **HTTPS Mixed-Content Requirement:**
  * *Evidence:* Vercel deploys exclusively over HTTPS.
  * *Fact:* Browsers block unencrypted HTTP API requests from HTTPS origins.
  * *Risk:* Deploying VM #1 directly on HTTP port 5000 will cause all API requests to fail with `Mixed Content: The page was loaded over HTTPS but requested an insecure XMLHttpRequest endpoint`.
  * *Resolution Path:* VM #1 MUST be deployed behind an SSL-terminating reverse proxy (e.g. Nginx with Let's Encrypt).

### 17.5 Unknowns Requiring Manual Validation
* **Initial Admin Account Creation:**
  * Clean deployment produces zero administrator accounts. Operators must be prepared to run a manual PostgreSQL update query (`UPDATE users SET role = 'ADMIN'`) immediately after registering the first account.

---

## 18. FINAL DEPLOYMENT DOSSIER SUMMARY

### 18.1 What We KNOW
1. **Frontend:** React 18 + Vite 5 single-page application. Builds to static files in `dist/`. Fully environment-driven via `VITE_API_URL`.
2. **Backend:** Express CommonJS server. Self-migrating database schema (10 tables) that initializes idempotently on boot.
3. **Database:** PostgreSQL. All tables, constraints, foreign keys, and indexes are self-contained in `backend/config/database.js`.
4. **LLM:** Provider abstraction supports Ollama over HTTP. Model: `qwen2.5:3b`.
5. **Speech AI:** Faster-Whisper (STT) and Kokoro (TTS) operate as lightweight HTTP microservices on ports 8765 and 8766.
6. **Vision AI:** ResNet-18 dual-head behavioral analysis runs on port 8767, accepting video byte streams via multipart POST.
7. **Security:** Inter-service calls use `X-AI-Secret` shared secret tokens. Client calls use Bearer JWT.

### 18.2 What We NEED TO SET UP
1. Five (5) Oracle Cloud compute instances with private IP interconnectivity inside a single Virtual Cloud Network (VCN).
2. Domain name DNS records:
   * `api.hireai.yourdomain.com` pointing to Oracle VM #1 Public IP.
   * `hireai.yourdomain.com` pointing to Vercel.
3. SSL certificate on Oracle VM #1 (Let's Encrypt via Certbot).
4. Manual SCP transfer of `backend/ai/cv_model/` weights to VM #5.
5. Ingress security rules in Oracle VCN restricting ports 11434, 8765, 8766, and 8767 exclusively to VM #1.

### 18.3 What We NEED TO TEST
1. Pip installation of `CTranslate2` on the target Oracle ARM64 architecture (VM #3).
2. End-to-end latency of Qwen 2.5 3B inference on VM #2 CPU.
3. End-to-end execution of a complete interview: question generation (LLM), question reading (TTS), answer transcription (STT), and video behavioral analysis (CV).

### 18.4 What We MUST NOT ASSUME
1. **DO NOT ASSUME** that `git clone` will download the CV models. They are in `.gitignore` and must be transferred manually.
2. **DO NOT ASSUME** that Ollama is authenticated. It must be protected via network firewalls.
3. **DO NOT ASSUME** that default admin credentials exist. The first user must be promoted via SQL.
4. **DO NOT ASSUME** that an unencrypted HTTP backend will work with Vercel. HTTPS on VM #1 is mandatory.
5. **DO NOT ASSUME** that Python services default to public/network interfaces. `--host 0.0.0.0` must be explicitly passed to `tts_service.py` and `cv_service.py`.

### 18.5 Minimum Information Needed to Start Deployment
Before provisioning the Oracle Cloud VMs, you need:
1. **Oracle Cloud Tenancy Details:** Availability domains and whether instances will be Ampere A1 (ARM64, 4 OCPU, 24 GB RAM free pool) or AMD x86 (1 OCPU, 1 GB RAM).
2. **Target Domain Name:** For setting up DNS A-records and provisioning SSL certificates for the backend.
3. **Direct Access to Developer Machine:** To execute `scp` for copying the ~45.1 MB of CV model files from `d:\Role-Based Dashboard System\backend\ai\cv_model\` to VM #5.
4. **Decided Shared Secret:** A random 32-byte hex string (`openssl rand -hex 32`) to paste as `AI_SECRET_TOKEN` across the environment files.

---

## 19. EVIDENCE REGISTER

Every statement in this dossier is indexed to direct repository evidence or clearly labeled as inference:

1. **Service Ports & Endpoints:**
   * Backend Port 5000: `backend/server.js:26` (`REPOSITORY EVIDENCE`)
   * Vite Dev Port 5173: `vite.config.js:9`, `scripts/start.ps1:280` (`REPOSITORY EVIDENCE`)
   * Ollama Port 11434: `scripts/start.ps1:146`, `backend/services/llmProvider.js:34` (`REPOSITORY EVIDENCE`)
   * STT Port 8765: `backend/ai/stt_service.py:36`, `scripts/start.ps1:179` (`REPOSITORY EVIDENCE`)
   * TTS Port 8766: `backend/ai/tts_service.py:168`, `scripts/start.ps1:190` (`REPOSITORY EVIDENCE`)
   * CV Port 8767: `backend/ai/cv_service.py:1202`, `scripts/start.ps1:201` (`REPOSITORY EVIDENCE`)
2. **Bind Host Behaviors:**
   * STT hardcoded `0.0.0.0`: `backend/ai/stt_service.py:295` (`REPOSITORY EVIDENCE`)
   * TTS default `localhost`: `backend/ai/tts_service.py:169` (`REPOSITORY EVIDENCE`)
   * CV default `127.0.0.1`: `backend/ai/cv_service.py:1203` (`REPOSITORY EVIDENCE`)
3. **Database DDL & Idempotency:**
   * 10 Tables, indexes, triggers, constraints: `backend/config/database.js:27-436` (`REPOSITORY EVIDENCE`)
   * Absence of seeds: `database.js`, `server.js` (`REPOSITORY EVIDENCE`)
   * Role validation blocking public admin: `backend/controllers/authController.js:14-18` (`REPOSITORY EVIDENCE`)
4. **Network & Inter-Service Security:**
   * `X-AI-Secret` injection: `backend/services/sttService.js:33`, `kokoroService.js:33`, `cvService.js:45` (`REPOSITORY EVIDENCE`)
   * Constant-time comparison: `stt_service.py:58`, `tts_service.py:53`, `cv_service.py:61` (`REPOSITORY EVIDENCE`)
   * Reverse proxy trust: `backend/server.js:37-39` (`REPOSITORY EVIDENCE`)
5. **Filesystem Decoupling:**
   * CV multipart upload streaming: `backend/services/cvService.js:96-98` (`REPOSITORY EVIDENCE`)
   * CV temp file creation and guaranteed deletion: `backend/ai/cv_service.py:1162-1189` (`REPOSITORY EVIDENCE`)
6. **Model Assets & Git Status:**
   * Exclusion of `.pt` and `.onnx` files: `.gitignore:51-53` (`REPOSITORY EVIDENCE`)
   * Checkpoint file sizes: `Get-Item backend\ai\cv_model\*` (44,800,663 bytes for `best_checkpoint.pt`, 232,589 bytes for `face_detection_yunet_2023mar.onnx`) (`REPOSITORY EVIDENCE`)
7. **ARM64 Compatibility Status:**
   * Faster-whisper CTranslate2 limitations: `backend/ai/requirements-stt.txt:32-38`, `README_DEPLOYMENT.md:96-99` (`REPOSITORY EVIDENCE & INFERENCE`)
   * PyTorch / OpenCV / Kokoro wheels: `backend/ai/requirements-tts.txt:33-39`, `requirements-cv.txt:36-41` (`REPOSITORY EVIDENCE & INFERENCE`)
8. **Resource & RAM Pressures:**
   * Model sizing and memory footprints: Deduced from parameter counts and quantized formats (3B Q4_K_M ~2.2GB, ResNet-18 ~45MB, Whisper Small ~500MB) (`INFERENCE BASED ON REPOSITORY MODEL DEFINITIONS`)
