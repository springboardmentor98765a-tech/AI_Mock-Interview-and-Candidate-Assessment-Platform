# HireAI Deployment Readiness Audit

**Repository:** HireAI / Role-Based Dashboard System  
**Audit Type:** Final, Read-Only Pre-Deployment Technical Inspection  
**Target Environment:** Free Distributed Cloud Architecture (Vercel Frontend + Oracle Cloud Always Free ARM64 VMs)  
**Date of Audit:** September 12, 2026  
**Inspection Mode:** Strictly Read-Only (Zero Code/Config/Git Modifications)

---

## 1. Executive Summary

### 1.1 Overall Deployment Readiness
- **Deployment Readiness Score:** **58%**
- **Overall Rating:** **BLOCKED (NOT READY FOR DIRECT DEPLOYMENT)**

While HireAI demonstrates mature business logic on localhost—including a comprehensive PostgreSQL schema with idempotent migrations, granular role-based access control (RBAC), streaming PDF/CSV reporting, and working local AI pipelines—it is **fundamentally bound to a single-machine localhost architecture**. Attempting to deploy the existing codebase directly to the target distributed architecture (Vercel + separate Oracle Cloud Always Free VMs) will fail immediately.

### 1.2 Top Blockers
1. **Hardcoded Ollama Base URL (`backend/services/llmProvider.js:32`):** `OLLAMA_BASE = 'http://localhost:11434'` cannot be pointed to an external Oracle VM via environment variables without code modification.
2. **Distributed CV Service Filesystem Disconnect (`backend/services/cvService.js:65`, `backend/ai/cv_service.py:1070-1087`):** The backend uploads recordings to its local filesystem and passes `{ file_path }` to the CV service. On separate VMs, the CV service cannot access the file on the backend host and throws `FileNotFoundError` (HTTP 404).
3. **Hardcoded Bind Address in Kokoro TTS (`backend/ai/tts_service.py:192`):** Kokoro binds exclusively to `'localhost'` with no CLI host flag or environment variable override, refusing all incoming network connections from remote hosts.
4. **Untracked Production Model Files in Git (`backend/ai/cv_model/`):** The trained CV model (`best_checkpoint.pt`, 44.8 MB), YuNet detector (`face_detection_yunet_2023mar.onnx`), and `class_labels.json` are untracked in Git. A fresh cloud clone has no CV model artifacts and fails at startup.
5. **Fatal Boot Failure if Gemini Keys are Missing (`backend/config/geminiKeys.js:18-20`):** `geminiKeys.js` unconditionally throws a fatal error if no Gemini API keys exist in `.env`. Furthermore, `geminiKeys.js` is excluded in `.gitignore`. A fresh clone in pure-local AI mode crashes Express on startup.
6. **Hardcoded Frontend API Base URL (`src/services/api.js:1` & 9 other files):** 10 out of 11 frontend API service files hardcode `const BASE_URL = '/api'`. On Vercel, requests hit the Vercel static server rather than the remote backend VM, resulting in platform-wide 404 errors.
7. **Missing Python Dependency Manifests:** No `requirements.txt`, `pyproject.toml`, or environment specification exists for the Python AI services. Cloud VM environments cannot be provisioned deterministically.

### 1.3 Top Risks
- **ARM64 Architecture Incompatibility (CTranslate2 / Faster-Whisper):** Faster-Whisper relies on CTranslate2, which lacks standard prebuilt Linux ARM64 PyPI wheels and often requires complex compilation from source on Ampere A1 VMs.
- **Unauthenticated Compute Endpoints & Open AI Ports:** `POST /api/stt/transcribe` has zero authentication and accepts 25 MB payloads. Additionally, STT, TTS, CV, and Ollama have no service-level authentication or rate limiting, exposing them to public denial-of-service (DoS).
- **Mixed Content Security Blocks:** Deploying the frontend on HTTPS (Vercel default) while the backend runs on raw HTTP (`http://<oracle-ip>:5000`) triggers browser mixed-content blocking for all API requests.
- **Ephemeral Storage Loss:** Uploaded resumes (`backend/uploads/resumes/`) and recordings (`backend/uploads/recordings/`) reside on local disk without cloud object storage synchronization or automated backup.

### 1.4 What is Already Strong
- **Database Architecture:** `backend/config/database.js` provides an idempotent, self-migrating schema covering 10 tables, relational constraints, query indexes, and JSONB audit trails.
- **Role-Based Access Control:** Strict JWT verification and role separation across `USER` (candidate), `RECRUITER`, and `ADMIN` roles, with authorization checks on report and assessment endpoints.
- **Reporting Engine:** Pure Node.js streaming architecture (`pdfkit` and `csv-stringify`) that operates in-memory without creating temporary disk artifacts.
- **Node Backend Dependencies:** Zero native C/C++ compilation bindings (`bcryptjs`, `pg`, `pdfkit`); 100% pure JavaScript, guaranteeing seamless execution on Linux ARM64.

---

## 2. Target Architecture Assumption

The deployment readiness evaluation assumes the following target infrastructure:
- **Frontend:** React + Vite Single Page Application (SPA) hosted on Vercel (or similar static CDN) over HTTPS (`https://hireai.vercel.app`).
- **Backend:** Node.js + Express REST API running on an Oracle Cloud Always Free VM (Ampere A1 ARM64, 4 OCPU, 24 GB RAM or shared subset) behind a reverse proxy (Nginx) with Let's Encrypt SSL (`https://api.hireai.example.com`).
- **Database:** PostgreSQL 15+ hosted on one of the Oracle VMs, accessible securely via private IP or SSL.
- **AI Microservices:**
  - **Faster-Whisper STT (Port 8765):** Running as a standalone HTTP microservice.
  - **Kokoro TTS (Port 8766):** Running as a standalone HTTP microservice.
  - **CV Analysis (Port 8767):** Running as a standalone HTTP microservice.
  - **Ollama / Qwen 2.5 3B (Port 11434):** Running as a standalone LLM daemon.
  - **Deployment Distribution:** Teammates may deploy these across separate Oracle Cloud VMs. Inter-service communication takes place over HTTP/HTTPS network calls.

---

## 3. Component Inventory

| Component | Current Location | Runtime | Port | Production Host | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend SPA** | Root / `src/` | React 18, Vite 5 | 5173 (dev) | Vercel Static Hosting | **BLOCKED** (Hardcoded `/api` in 10 client files; missing `vercel.json` SPA rewrite) |
| **Express Backend** | `backend/` | Node.js 18+ (CJS) | 5000 | Oracle VM 1 (Ubuntu/Oracle Linux ARM64) | **READY WITH FIXES** (Needs proxy trust, process manager, env fixes) |
| **PostgreSQL** | Windows Service (`postgresql-x64-18`) | PostgreSQL 16+ | 5432 | Oracle VM 1 or Dedicated DB VM | **READY WITH FIXES** (Missing `DATABASE_URL` and SSL support in `database.js`) |
| **Faster-Whisper STT**| `backend/ai/stt_service.py` | Python 3.10+ (CTranslate2) | 8765 | Oracle VM 2 (ARM64 or x86_64) | **HIGH RISK** (ARM64 wheel availability unverified; CPU mode required) |
| **Kokoro TTS** | `backend/ai/tts_service.py` | Python 3.10+ (PyTorch/Kokoro) | 8766 | Oracle VM 3 (ARM64 or x86_64) | **BLOCKED** (Binds to `localhost` only; no remote network bind) |
| **CV Analysis Service** | `backend/ai/cv_service.py` | Python 3.10+ (OpenCV, PyTorch) | 8767 | Oracle VM 4 (ARM64 or x86_64) | **BLOCKED** (Requires local filesystem access to video; model files untracked in Git) |
| **Ollama (Qwen 2.5 3B)**| External Service (`ollama.exe`) | Go / C++ (Ollama Engine) | 11434| Oracle VM 5 (ARM64 or x86_64) | **BLOCKED** (Backend URL hardcoded to `localhost:11434` in `llmProvider.js`) |
| **Reminder Scheduler** | `backend/services/reminderScheduler.js`| In-process Node.js | N/A | Oracle VM 1 (Inside Express process) | **READY** (Atomic DB claims; persistent across VM restarts) |
| **Email Service** | `backend/services/emailService.js` | In-process Node.js (Nodemailer) | N/A | Oracle VM 1 (Connects to external SMTP) | **READY** (Config-driven, graceful fallback if unconfigured) |
| **Report Generation** | `backend/services/reportService.js` | In-process Node.js (PDFKit) | N/A | Oracle VM 1 (Streams directly to HTTP response)| **VERIFIED** (Pure JS, zero temp disk artifacts) |

---

## 4. Deployment Readiness Matrix

| Requirement | Status | Evidence | Risk | Required Action |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Base URL** | **BLOCKED** | `src/services/api.js:1`, `interviewApi.js:1`, `recordingApi.js:1` | Critical | Replace `const BASE_URL = '/api'` with `import.meta.env.VITE_API_URL` across all 10 API files. |
| **Frontend SPA Routing** | **HIGH RISK** | `src/App.jsx:88`, missing `vercel.json` | High | Add `vercel.json` with rewrite rules routing `/(.*)` to `/index.html`. |
| **Backend Binding** | **VERIFIED** | `backend/server.js:88` | Low | None. Node binds to `0.0.0.0` by default when host is omitted. |
| **Backend Process Mgmt** | **NOT VERIFIED**| `scripts/start.ps1:242-246` (Windows PowerShell only) | Medium | Create systemd service unit or PM2 ecosystem config for Linux. |
| **Database Connection** | **PARTIALLY VERIFIED** | `backend/config/database.js:4-10` | High | Add `DATABASE_URL` string parsing and `ssl: { rejectUnauthorized: false }` toggle. |
| **Database Migrations** | **VERIFIED** | `backend/config/database.js:27-436` | Low | Schema initialization is fully idempotent and executes on boot. |
| **Initial Admin User** | **HIGH RISK** | `backend/controllers/authController.js:14-19` | Medium | Public registration blocks `role: ADMIN`. Document manual SQL promotion step. |
| **CORS Configuration** | **VERIFIED** | `backend/server.js:29-34` | Low | Set `FRONTEND_URL` environment variable to match the deployed Vercel domain. |
| **Rate Limiting** | **HIGH RISK** | `backend/package.json:17`, absent in `server.js` | High | Import and mount `express-rate-limit` on `/api/auth` and `/api/stt`. |
| **Reverse Proxy / Trust**| **MEDIUM RISK**| `backend/server.js:27-38` | Medium | Add `app.set('trust proxy', 1)` to support client IP extraction behind Nginx. |
| **STT URL Configuration** | **VERIFIED** | `backend/services/sttService.js:23` | Low | Uses `process.env.STT_SERVICE_URL`. |
| **STT Bind Address** | **VERIFIED** | `backend/ai/stt_service.py:272` | Low | Binds to `("0.0.0.0", args.port)`. |
| **STT Auth Security** | **HIGH RISK** | `backend/routes/sttRoutes.js:36` | High | Mount `authenticate` middleware on `/api/stt/transcribe`. |
| **STT Hardware Support**| **HIGH RISK** | `scripts/start.ps1:179` (`--device cuda`) | High | Change launch argument to `--device cpu --compute-type int8` on CPU VMs. |
| **STT ARM64 Wheels** | **NOT VERIFIED**| `backend/ai/stt_service.py:51` (`ctranslate2`) | High | Verify CTranslate2 wheel on target Linux ARM64 OS or run STT on x86 VM. |
| **TTS URL Configuration** | **VERIFIED** | `backend/services/kokoroService.js:21` | Low | Uses `process.env.TTS_SERVICE_URL`. |
| **TTS Bind Address** | **BLOCKER** | `backend/ai/tts_service.py:192` | Critical | Change `'localhost'` to `'0.0.0.0'` in `HTTPServer`. |
| **TTS Fallback Safety** | **MEDIUM RISK**| `backend/services/ttsService.js:93` | Medium | Fallback to Gemini TTS fails if Gemini keys are absent. |
| **CV URL Configuration** | **VERIFIED** | `backend/services/cvService.js:23` | Low | Uses `process.env.CV_SERVICE_URL`. |
| **CV File Distribution** | **BLOCKER** | `backend/services/cvService.js:65`, `cv_service.py:1070` | Critical | CV service must accept file upload via multipart body or shared S3/NFS volume. |
| **CV Model Tracking** | **BLOCKER** | `git status backend/ai/cv_model/` | Critical | Commit model weights (`best_checkpoint.pt`, `face_detection_yunet_2023mar.onnx`) or host on cloud storage. |
| **Ollama URL Config** | **BLOCKER** | `backend/services/llmProvider.js:32` | Critical | Replace `const OLLAMA_BASE = 'http://localhost:11434'` with `process.env.OLLAMA_BASE_URL`. |
| **Ollama Concurrency** | **MEDIUM RISK**| `backend/services/llmProvider.js:80` (`keep_alive: '30m'`) | Medium | Model stays resident in memory; monitor concurrent request queuing. |
| **AI Service Auth** | **HIGH RISK** | STT, TTS, CV, Ollama endpoints | High | Implement internal shared secret/token header or restrict via VPC/firewall. |
| **Gemini Key Dependency**| **BLOCKER** | `backend/config/geminiKeys.js:18-20` | Critical | Prevent fatal error on boot when `keys.length === 0` in local AI mode. |
| **Environment Template**| **MEDIUM RISK**| Absence of `.env.example` | Medium | Provide a documented `.env.example` in repo root and `backend/`. |
| **Storage Persistence** | **HIGH RISK** | `backend/config/multer.js:5`, `multerRecording.js:7` | High | Document persistent volume mounting for `/uploads` on the backend VM. |
| **Scheduler Stability** | **VERIFIED** | `backend/services/reminderScheduler.js:208` | Low | Thread-safe, single timer with unref, idempotent database row locking. |
| **Email Reliability** | **VERIFIED** | `backend/services/emailService.js:54-61` | Low | Non-blocking, fails gracefully without crashing when SMTP is omitted. |
| **Report Generation** | **VERIFIED** | `backend/services/reportService.js:33-35` | Low | Pure JS memory stream, compatible with Linux container runtimes. |

---

## 5. Frontend Findings

### 5.1 Hardcoded Localhost and Relative Path References
- **Finding:** The frontend relies on relative `/api` paths that depend on the Vite development proxy (`vite.config.js:7-12`).
- **Files Affected:**
  - `src/services/api.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/interviewApi.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/analyticsApi.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/scheduleApi.js` (Line 15: `const BASE_URL = '/api'`)
  - `src/services/notificationApi.js` (Line 15: `const BASE_URL = '/api'`)
  - `src/services/reportApi.js` (Line 17: `const BASE_URL = '/api'`)
  - `src/services/recordingApi.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/cvApi.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/resumeApi.js` (Line 1: `const BASE_URL = '/api'`)
  - `src/services/shortlistInsight.js` (Uses relative API paths)
- **Contrast:** Only `src/services/adminApi.js` (Line 10: `const BASE = import.meta.env.VITE_API_URL || ''`) correctly supports an external base URL.
- **Production Consequence:** When deployed to Vercel at `https://hireai.vercel.app`, the browser sends all API calls to `https://hireai.vercel.app/api/...`. Vercel returns HTTP 404 for all endpoints, preventing authentication, dashboard access, and interview sessions.

### 5.2 Deep-Linking and SPA Fallback
- **Finding:** `src/App.jsx:88-94` uses `BrowserRouter` for client-side routing across 10 distinct top-level routes (`/student`, `/recruiter`, `/admin`, `/mock-interview`, etc.).
- **Missing Configuration:** The repository contains no `vercel.json` or `public/_redirects` file.
- **Production Consequence:** Direct navigation or refreshing any route other than `/` causes Vercel to return a static 404 page.

### 5.3 Mixed Content Constraints
- **Finding:** Vercel enforces HTTPS by default.
- **Production Consequence:** If the backend Oracle VM is exposed via raw HTTP (`http://<oracle-ip>:5000`), modern web browsers block all requests under strict Mixed Content security policies. The backend must be terminated with SSL/TLS.

---

## 6. Backend Findings

### 6.1 Process Lifecycle and Graceful Shutdown
- **Finding:** `backend/server.js:88-95` initializes the server via `app.listen(PORT)` without attaching handlers for `SIGTERM` or `SIGINT`.
- **Production Consequence:** In cloud container or systemd environments, rolling updates or VM shutdowns abruptly terminate active HTTP requests, file uploads, and ongoing interview evaluations without draining connections.

### 6.2 Error Handling and Process Stability
- **Finding:**
  - `backend/config/database.js:12-15`:
    ```javascript
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL client error:', err)
      process.exit(1)
    })
    ```
    Any transient PostgreSQL network interruption or connection reset forces the entire Node.js server process to exit immediately.
  - `backend/server.js:78-95`: No global `process.on('unhandledRejection')` or `process.on('uncaughtException')` handlers exist.
- **Production Consequence:** The server is vulnerable to abrupt crashes from unexpected socket errors or dropped database connections unless wrapped in an external process supervisor (PM2 or systemd).

### 6.3 Missing Reverse Proxy Configuration
- **Finding:** `app.set('trust proxy', 1)` is missing from `backend/server.js`.
- **Production Consequence:** When placed behind Nginx or a cloud load balancer, Express reads the proxy's IP rather than the true client IP (`req.ip`), breaking client-level IP logging and future rate-limiting enforcement.

### 6.4 Rate Limiting Inertia
- **Finding:** `express-rate-limit` is defined in `backend/package.json:17`, but grep analysis confirms it is **never imported or registered anywhere** in `backend/server.js` or `backend/routes/`.
- **Production Consequence:** High-impact endpoints such as `/api/auth/login`, `/api/auth/register`, `/api/stt/transcribe`, and `/api/interview/generate` are completely unthrottled, leaving the backend susceptible to credential stuffing and CPU exhaustion.

---

## 7. Database Findings

### 7.1 Connection String and SSL Compatibility
- **Finding:** `backend/config/database.js:4-10` instantiates `pg.Pool` exclusively with individual parameters:
  ```javascript
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'ai_recruitment',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD,
  })
  ```
- **Limitations:**
  1. Does not parse standard `DATABASE_URL` connection strings provided by cloud database providers.
  2. Does not configure `ssl` properties. If connecting to a PostgreSQL instance that enforces SSL, the connection fails.

### 7.2 Schema Initialization and Idempotency
- **Finding:** `backend/config/database.js:27-436` (`initDatabase()`) executes within a single transaction (`BEGIN` / `COMMIT`).
- **Inventory of Managed Tables:**
  1. `users` (Lines 33-88)
  2. `resumes` (Lines 114-123)
  3. `resume_analyses` (Lines 126-145)
  4. `interviews` (Lines 148-177)
  5. `interview_questions` (Lines 179-194)
  6. `interview_answers` (Lines 196-232)
  7. `interview_recordings` (Lines 234-290)
  8. `interview_cv_analysis` (Lines 295-359)
  9. `notifications` (Lines 363-391)
  10. `scheduled_interviews` (Lines 397-426)
- **Verification:** **VERIFIED**. Schema initialization is completely idempotent. It uses `CREATE TABLE IF NOT EXISTS`, conditional column alterations (`ADD COLUMN IF NOT EXISTS`), safe constraint drops/recreates, and index checks (`CREATE INDEX IF NOT EXISTS`). A clean database can be completely initialized from zero on first launch.

### 7.3 Initial Account Seeding
- **Finding:** `initDatabase()` contains no seed scripts or default admin creation. Furthermore, `backend/controllers/authController.js:14-19` restricts public registration to `USER` and `RECRUITER` roles only.
- **Operational Requirement:** To establish the first administrator in a fresh deployment, an operator must register an account and manually execute SQL:
  ```sql
  UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
  ```

---

## 8. AI Service Findings

### 8.1 Speech-to-Text (Faster-Whisper)
- **Service Script:** `backend/ai/stt_service.py`
- **Current Local Endpoint:** `http://localhost:8765`
- **Backend Invocation:** `backend/services/sttService.js:54-89` via `fetch(`${STT_SERVICE_URL}/transcribe`)` sending multipart/form-data.
- **Configurable via Environment Variable?** **YES** (`STT_SERVICE_URL`).
- **Authentication Supported?** **NO**. No token, API key, or header verification.
- **Timeout Configured?** **NO**. `fetch` has no timeout; hangs if Python process blocks.
- **Retry Configured?** **NO**.
- **Host Binding:** Binds to `0.0.0.0:args.port` (`backend/ai/stt_service.py:272`).
- **Hardware Assumptions:** `scripts/start.ps1:179` launches with `--device cuda --compute-type float16`. On an Oracle Always Free ARM64 CPU-only VM, this command fails immediately. It must be run with `--device cpu --compute-type int8` or `float32`.
- **Remote Deployment Blocker?** **NO** for network binding, but **HIGH RISK** on ARM64 wheel availability and unauthenticated compute exposure.

### 8.2 Text-to-Speech (Kokoro TTS)
- **Service Script:** `backend/ai/tts_service.py`
- **Current Local Endpoint:** `http://localhost:8766`
- **Backend Invocation:** `backend/services/kokoroService.js:49-85` via `fetch(`${TTS_SERVICE_URL}/speak`)` sending JSON `{ text }`.
- **Configurable via Environment Variable?** **YES** (`TTS_SERVICE_URL`).
- **Authentication Supported?** **NO**.
- **Timeout Configured?** **NO**.
- **Retry Configured?** **NO** (Node catches and falls back to Gemini TTS in `ttsService.js:93`).
- **Host Binding:** **BLOCKER**. `backend/ai/tts_service.py:192` hardcodes:
  ```python
  server = HTTPServer(('localhost', args.port), TTSHandler)
  ```
  It ignores external traffic entirely. Furthermore, `parse_args()` (Lines 145-149) does not accept a `--host` parameter.
- **Model Storage & Assets:** Models are downloaded automatically into HuggingFace cache (`~/.cache/huggingface/hub/`) on first invocation (`KPipeline(lang_code='a')`). Requires internet access during initial startup.
- **System Dependencies:** Requires `espeak-ng` system binary on Linux.
- **Remote Deployment Blocker?** **YES**. Cannot receive remote connections without editing line 192 or running an Nginx reverse proxy on the TTS host.

### 8.3 Computer Vision Analysis (CV Service)
- **Service Script:** `backend/ai/cv_service.py`
- **Current Local Endpoint:** `http://127.0.0.1:8767`
- **Backend Invocation:** `backend/services/cvService.js:57-94` via `fetch(`${CV_SERVICE_URL}/analyze`)` sending JSON:
  ```json
  { "file_path": filePath, "interview_id": interviewId }
  ```
- **Configurable via Environment Variable?** **YES** (`CV_SERVICE_URL`).
- **Authentication Supported?** **NO**.
- **Timeout Configured?** **NO**.
- **Retry Configured?** **NO**.
- **Distributed Architecture Blocker:** **CRITICAL BLOCKER**. `cv_service.py:1070-1087` expects the video to reside on its local disk and calls `cv2.VideoCapture(file_path)`. If Express is on VM 1 and the CV service is on VM 2, `file_path` (`/uploads/recordings/...`) does not exist on VM 2, resulting in immediate `FileNotFoundError` (HTTP 404).
- **Git Tracking Blocker:** **CRITICAL BLOCKER**. The trained PyTorch model weights (`backend/ai/cv_model/best_checkpoint.pt`, 44.8 MB), YuNet detector (`face_detection_yunet_2023mar.onnx`, 232 KB), and label mapping (`class_labels.json`, 91 B) are **untracked in Git**. A git clone contains no models; `load_model()` fails and `/analyze` returns HTTP 503.
- **Remote Deployment Blocker?** **YES** (Dual blocker: local filesystem assumption + untracked model files).

### 8.4 LLM / Ollama (Qwen 2.5 3B)
- **Service Daemon:** Ollama Server
- **Current Local Endpoint:** `http://localhost:11434`
- **Backend Invocation:** `backend/services/llmProvider.js:67-117` via `fetch(`${OLLAMA_BASE}/api/generate`)` sending JSON `{ model, prompt, stream: false, keep_alive: '30m' }`.
- **Configurable via Environment Variable?** **NO (CRITICAL BLOCKER)**. Line 32 hardcodes:
  ```javascript
  const OLLAMA_BASE = 'http://localhost:11434'
  ```
  There is no `process.env.OLLAMA_BASE_URL` or `OLLAMA_URL` check.
- **Model Name Configuration:** `process.env.OLLAMA_MODEL` defaults to `qwen2.5:7b` (Line 43), whereas the local system runs `qwen2.5:3b`.
- **Authentication Supported?** **NO**.
- **Timeout Configured?** **NO**. If Ollama stalls during generation, Node waits indefinitely.
- **Failure Fallback:** Does not fall back to Gemini on failure; throws an unhandled error immediately.
- **Remote Deployment Blocker?** **YES**. Hardcoded URL blocks deployment to an external Ollama VM.

---

## 9. Distributed Architecture Findings

### 9.1 Network Dependency Topology
```
[Client Browser]
       │
       ▼ (HTTPS)
[Vercel Frontend CDN] (hireai.vercel.app)
       │
       ▼ (HTTPS REST API)
[Oracle Cloud VM 1: Reverse Proxy (Nginx / SSL)]
       │
       ▼ (Local Port 5000)
[Express Backend]
       ├──► [PostgreSQL Database] (Port 5432)
       ├──► [SMTP Provider] (Port 587)
       │
       ├──► (HTTP Port 8765) ──► [Oracle Cloud VM 2: Faster-Whisper STT]
       ├──► (HTTP Port 8766) ──► [Oracle Cloud VM 3: Kokoro TTS]
       ├──► (HTTP Port 8767) ──► [Oracle Cloud VM 4: CV Analysis Service] (BROKEN: Shared FS required)
       └──► (HTTP Port 11434) ─► [Oracle Cloud VM 5: Ollama Qwen 2.5] (BROKEN: Hardcoded localhost)
```

### 9.2 Localhost Assumptions Inventory
1. **Frontend API Calls:** 10 service files assume `/api` maps to localhost via Vite dev server (`src/services/api.js:1`).
2. **LLM Provider:** `backend/services/llmProvider.js:32` assumes Ollama runs at `http://localhost:11434`.
3. **TTS Service Bind:** `backend/ai/tts_service.py:192` assumes TTS is called only from `localhost`.
4. **CV Service File Passing:** `backend/services/cvService.js:65` assumes the Python service shares the same storage drive as Express.
5. **Startup Automation:** `scripts/start.ps1` assumes all 7 services run concurrently on a single Windows desktop machine using Windows PowerShell and Windows Task Scheduler.

---

## 10. ARM64 / Oracle Compatibility

| Component | Target Architecture | Compatibility Status | Technical Evidence & Analysis |
| :--- | :--- | :--- | :--- |
| **Node.js Express Backend** | Ampere A1 (ARM64) | **VERIFIED COMPATIBLE** | All dependencies in `backend/package.json` are pure JavaScript (`bcryptjs`, `pg`, `pdfkit`, `csv-stringify`). No native C++ node-gyp bindings exist. |
| **PostgreSQL 16+** | Ampere A1 (ARM64) | **VERIFIED COMPATIBLE** | Official native aarch64 packages available in standard Ubuntu/Oracle Linux repositories (`apt install postgresql` / `dnf install postgresql-server`). |
| **Ollama (Qwen 2.5 3B)** | Ampere A1 (ARM64) | **VERIFIED COMPATIBLE** | Official Linux aarch64 binary provided by Ollama install script (`curl -fsSL https://ollama.com/install.sh`). Qwen 2.5 3B Q4_K_M runs within ~2.2 GB RAM. |
| **CV Analysis Service** | Ampere A1 (ARM64) | **LIKELY COMPATIBLE** | PyTorch (`torch`), torchvision, and `opencv-python-headless` publish standard Linux aarch64 wheels. ResNet-18 runs on CPU via `map_location="cpu"`. |
| **Kokoro TTS Service** | Ampere A1 (ARM64) | **LIKELY COMPATIBLE** | PyTorch and Kokoro pip packages install on ARM64; requires `apt install espeak-ng`. CPU inference is functional but exhibits higher latency. |
| **Faster-Whisper STT** | Ampere A1 (ARM64) | **NOT VERIFIED / HIGH RISK**| CTranslate2 lacks reliable official prebuilt manylinux aarch64 wheels on PyPI. Installing often attempts source compilation requiring OpenBLAS / ACL. |

---

## 11. Environment Variables Required for Production

The following variables must be configured across the production environment. **No secret values are shown.**

| Variable | Current Source | Required in Production? | Is Secret? | Purpose / Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `backend/.env` | **YES** | No | Set to `production`. Disables verbose debug logging. |
| `PORT` | `backend/.env` | **YES** | No | Internal port Express listens on (default: `5000`). |
| `FRONTEND_URL` | `backend/.env` | **YES** | No | Exact Vercel domain (e.g., `https://hireai.vercel.app`) for CORS origin validation. |
| `DB_HOST` | `backend/.env` | **YES** | No | IP address or hostname of the PostgreSQL VM. |
| `DB_PORT` | `backend/.env` | **YES** | No | Port for PostgreSQL (default: `5432`). |
| `DB_NAME` | `backend/.env` | **YES** | No | PostgreSQL database name (e.g., `hireai_db`). |
| `DB_USER` | `backend/.env` | **YES** | No | PostgreSQL application username. |
| `DB_PASSWORD` | `backend/.env` | **YES** | **YES** | PostgreSQL user password. |
| `JWT_SECRET` | `backend/.env` | **YES** | **YES** | High-entropy string for signing user session tokens. |
| `JWT_EXPIRES_IN` | `backend/.env` | **YES** | No | Session duration (e.g., `7d` or `24h`). |
| `AI_PROVIDER` | `backend/.env` | **YES** | No | Set to `ollama` for local free inference, or `gemini` for cloud. |
| `OLLAMA_MODEL` | `backend/.env` | **YES** | No | Set to `qwen2.5:3b` to match the lightweight free VM model. |
| `OLLAMA_BASE_URL` | **MISSING IN CODE** | **REQUIRED (FIX NEEDED)**| No | Remote URL for Ollama VM (e.g., `http://10.0.0.5:11434`). |
| `STT_SERVICE_URL` | `backend/.env` | **YES** | No | Remote URL for STT VM (e.g., `http://10.0.0.6:8765`). |
| `TTS_PROVIDER` | `backend/.env` | **YES** | No | Set to `kokoro` for local TTS, or `gemini` for cloud. |
| `TTS_SERVICE_URL` | `backend/.env` | **YES** | No | Remote URL for TTS VM (e.g., `http://10.0.0.7:8766`). |
| `CV_SERVICE_URL` | `backend/.env` | **YES** | No | Remote URL for CV VM (e.g., `http://10.0.0.8:8767`). |
| `SMTP_HOST` | `backend/.env` | Optional | No | SMTP relay host (e.g., SendGrid, Brevo, Gmail). |
| `SMTP_PORT` | `backend/.env` | Optional | No | SMTP port (`587` or `465`). |
| `SMTP_SECURE` | `backend/.env` | Optional | No | `true` for 465, `false` for 587. |
| `SMTP_USER` | `backend/.env` | Optional | **YES** | SMTP authentication username. |
| `SMTP_PASS` | `backend/.env` | Optional | **YES** | SMTP authentication password/token. |
| `SMTP_FROM` | `backend/.env` | Optional | No | Formatted sender string (`HireAI <no-reply@domain.com>`). |
| `REMINDER_INTERVAL_MS`| `backend/.env` | Optional | No | Scheduler poll interval in ms (default: `60000`). |
| `VITE_API_URL` | **MISSING IN FRONTEND**| **REQUIRED (FIX NEEDED)**| No | Vercel build variable: public backend API URL (`https://api.hireai.com`). |

---

## 12. Security Findings

### 12.1 Critical Severity
- **Unauthenticated Compute Ingestion (`backend/routes/sttRoutes.js:36`):**
  `POST /api/stt/transcribe` contains no `authenticate` middleware and accepts up to 25 MB file uploads. Any unauthenticated attacker on the internet can flood this endpoint with audio files, exhausting CPU and disk resources.
- **Unauthenticated Distributed AI Microservices:**
  The internal microservices (STT on 8765, TTS on 8766, CV on 8767, and Ollama on 11434) implement zero authentication, API keys, or caller validation. If exposed on public Oracle VM IP addresses without firewall or reverse proxy restrictions, they can be freely hijacked or overwhelmed by external actors.

### 12.2 High Severity
- **Absent Rate Limiting Across All Routes:**
  `express-rate-limit` is not applied. Sensitive authentication endpoints (`/api/auth/login`, `/api/auth/register`) and resource-heavy AI generation endpoints (`/api/interviews/generate`) have no request throttling, enabling brute-force password attacks and denial-of-service.
- **Non-Revocable Tokens for Blocked Users:**
  While administrators can set `is_active = false` (`backend/controllers/adminController.js:180`), the JWT authentication middleware (`backend/middleware/auth.js:11`) only verifies cryptographic token validity and does not query the database to verify if the account has been blocked. A blocked user retains full platform access until token expiration (up to 7 days).

### 12.3 Medium Severity
- **Exposed Server Headers:**
  While `helmet` is registered (`backend/server.js:27`), unhandled 404 and error routes return default Express error payloads.
- **Lack of Path Normalization on File Streams:**
  `backend/controllers/recordingController.js:167` streams files directly from database paths (`rec.file_path`). If historical records contain paths from foreign operating systems, streams fail or leak local file system details.

---

## 13. Data & Filesystem Findings

### 13.1 Local Filesystem Storage Assumptions
- **Resume Uploads:** Stored at `backend/uploads/resumes/` (`backend/config/multer.js:5`).
- **Video Recordings:** Stored at `backend/uploads/recordings/` (`backend/config/multerRecording.js:7`).
- **Disk Space Consumption:** Recording limit is set to 500 MB per file (`multerRecording.js:48`). An influx of 20 interview recordings can consume up to 10 GB of disk space. Oracle Always Free accounts provide 200 GB total block volume shared across all VMs.
- **Ephemeral Instance Risk:** If the backend VM crashes, is re-created, or scaled horizontally, all uploaded resumes and recordings are permanently lost unless mapped to a persistent Oracle Block Volume or offloaded to object storage (e.g., S3/OCI Object Storage).

### 13.2 OS-Specific Path Format Issues
- When running locally on Windows, `req.file.path` produces Windows-style absolute paths (e.g., `D:\Role-Based Dashboard System\backend\uploads\...`).
- Storing absolute host-specific paths in the database (`resumes.file_path` and `interview_recordings.file_path`) means that any database backup imported into Linux cannot locate files because Linux uses POSIX directory paths (`/var/uploads/...`).

---

## 14. Performance & Resource Findings

### 14.1 Oracle Cloud Always Free Target Capacity
- **Architecture:** Ampere A1 (ARM64)
- **Total Free Tier Allowance:** Up to 4 OCPUs and 24 GB RAM, split across 1 to 4 VMs, with 200 GB total block storage.

### 14.2 Service Resource Profile Allocation

| Service | Minimum OCPUs | Minimum RAM | Model Disk Footprint | Expected Bottleneck | Recommended Allocation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Backend + PostgreSQL**| 1 OCPU | 4 GB | ~5 GB (DB + Uploads) | Disk I/O & Network | Host together on VM 1 (Ubuntu ARM64). |
| **Ollama (Qwen 2.5 3B)** | 1 OCPU | 4 GB | ~2.5 GB (Q4 GGUF) | CPU Compute during inference | Host on VM 2 (or combine on VM 1 if 4 OCPU / 16 GB). |
| **Faster-Whisper STT** | 1 OCPU | 4 GB | ~500 MB (Whisper Small) | Audio decoding & matrix operations | Host on VM 3 (x86_64 recommended for CTranslate2). |
| **Kokoro TTS** | 1 OCPU | 4 GB | ~350 MB (Kokoro PyTorch) | PyTorch CPU synthesis latency | Host on VM 4 or share with STT. |
| **CV Analysis** | 1 OCPU | 4 GB | ~100 MB (ResNet + YuNet)| Frame decoding & inference loop | Must run on the same VM as Backend OR add multipart upload. |

---

## 15. Operational Readiness

### 15.1 Logging and Observability
- **Finding:** Logging is entirely unformatted `console.log` and `console.error` statements.
- **Production Need:** Implement structured JSON logging (Winston or Pino) with request IDs to trace distributed calls across services.
- **Health Checks:** Basic liveness endpoint exists at `GET /api/health` (`backend/server.js:42`), but it does not check PostgreSQL connectivity or downstream AI service readiness.

### 15.2 Background Scheduler Resilience
- **Finding:** `backend/services/reminderScheduler.js` runs via an in-memory `setInterval` (default: 60s) inside the Express process.
- **Reliability Assessment:** Safe for a single persistent VM. It performs atomic DB row claims (`UPDATE scheduled_interviews SET reminder_sent_24h = true WHERE id = $1 AND reminder_sent_24h = false`).
- **Limitation:** If the server is offline during a reminder window (e.g., the 45m–75m window), the reminder will not fire once the window has passed.

### 15.3 Backup & Recovery
- **Database:** No automated backup scripts exist in the repository. Daily `pg_dump` cron jobs must be configured on the host.
- **AI Checkpoints:** `best_checkpoint.pt` exists only on local developer disks. If lost, it requires full model retraining from FER/Emotic datasets.

---

## 16. Deployment Blockers

### Blocker 1: Hardcoded Ollama URL
- **File:** `backend/services/llmProvider.js:32`
- **Issue:** Line 32 defines `const OLLAMA_BASE = 'http://localhost:11434'`.
- **Failure Mode:** When Ollama is deployed on an external VM, the backend continues to query its own local loopback, resulting in `ECONNREFUSED` and complete LLM generation failure.
- **Required Fix:** Change line 32 to read from `process.env.OLLAMA_BASE_URL || 'http://localhost:11434'`.

### Blocker 2: CV Service Local Filesystem Assumption
- **File:** `backend/services/cvService.js:65` & `backend/ai/cv_service.py:1070-1087`
- **Issue:** Node sends `{ file_path: filePath }` where `filePath` is a local disk path on the backend VM. `cv_service.py` attempts `cv2.VideoCapture(file_path)` on its own host.
- **Failure Mode:** On separate VMs, `cv_service.py` throws `FileNotFoundError` (HTTP 404).
- **Required Fix:** Update `cvService.js` and `cv_service.py` to transmit video bytes via multipart/form-data upload, OR deploy the CV service on the exact same VM as the Express backend.

### Blocker 3: Kokoro TTS Localhost-Only Bind
- **File:** `backend/ai/tts_service.py:192`
- **Issue:** `server = HTTPServer(('localhost', args.port), TTSHandler)`.
- **Failure Mode:** When deployed to a standalone Oracle VM, the Python process refuses network connections arriving from external IP addresses.
- **Required Fix:** Modify bind address to `'0.0.0.0'` and add a `--host` CLI argument to `parse_args()`.

### Blocker 4: Untracked CV Model Assets
- **File:** `backend/ai/cv_model/best_checkpoint.pt` & `face_detection_yunet_2023mar.onnx`
- **Issue:** Files are untracked by Git.
- **Failure Mode:** Cloning the repository onto a cloud VM produces an empty `cv_model` directory. At startup, `cv_service.py:157` records a fatal warning and `/analyze` returns HTTP 503.
- **Required Fix:** Commit the model files to Git (or Git LFS) or configure an automated download step from cloud object storage during deployment.

### Blocker 5: Fatal Crash on Missing Gemini Keys
- **File:** `backend/config/geminiKeys.js:18-20`
- **Issue:** `if (keys.length === 0) throw new Error('Zero valid Gemini API keys found...')`.
- **Failure Mode:** In a free local-only deployment (`AI_PROVIDER=ollama`, `TTS_PROVIDER=kokoro`), Express requires `geminiKeys.js` on startup and crashes immediately if no Gemini keys are provided.
- **Required Fix:** Make missing Gemini keys non-fatal if `AI_PROVIDER !== 'gemini'`.

### Blocker 6: Hardcoded Frontend API Base URL
- **File:** `src/services/api.js:1` (and 9 other service files)
- **Issue:** `const BASE_URL = '/api'`.
- **Failure Mode:** When hosted on Vercel, requests route to Vercel's domain rather than the backend VM, breaking all platform API calls.
- **Required Fix:** Standardize all frontend service files to read `const BASE_URL = import.meta.env.VITE_API_URL || '/api'`.

---

## 17. Required Changes Before Deployment

### Must Fix (Mandatory for Distributed Architecture)
1. **Frontend:** Update all 10 API service files to use `import.meta.env.VITE_API_URL || '/api'`.
2. **Frontend:** Add `vercel.json` with SPA route rewrites (`/(.*)` -> `/index.html`).
3. **Backend:** Parameterize `OLLAMA_BASE` in `backend/services/llmProvider.js` with `process.env.OLLAMA_BASE_URL`.
4. **Backend:** Prevent fatal exit in `backend/config/geminiKeys.js` when running in local AI mode without keys.
5. **AI Services:** Change bind address in `backend/ai/tts_service.py` to `0.0.0.0`.
6. **AI Services:** Track and distribute `best_checkpoint.pt` and `face_detection_yunet_2023mar.onnx`.
7. **AI Services:** Resolve CV video transmission (either host CV on Backend VM or refactor `/analyze` to multipart upload).
8. **Dependencies:** Generate and commit a pinned `requirements.txt` for Python AI services.

### Strongly Recommended
1. **Security:** Add `authenticate` middleware to `POST /api/stt/transcribe`.
2. **Security:** Restrict STT, TTS, CV, and Ollama ports to private VPC IPs or require an internal authorization secret.
3. **Security:** Register `express-rate-limit` on `/api/auth/login` and `/api/interviews/generate`.
4. **Database:** Add `ssl: { rejectUnauthorized: false }` support and `DATABASE_URL` parsing to `backend/config/database.js`.
5. **Operational:** Configure Nginx with Let's Encrypt SSL on the backend VM to prevent Mixed Content errors.
6. **Operational:** Add `app.set('trust proxy', 1)` in `backend/server.js`.

### Optional
1. Implement object storage (S3 / Oracle OCI Object Storage) for resumes and recordings.
2. Add structured JSON logging with Winston/Pino.
3. Decouple the reminder scheduler into an independent PM2 process.

---

## 18. Deployment Sequence Recommendation

To achieve a clean, successful deployment once fixes are made, execute in the following order:

```
Step 1: Database Setup
  └── Provision PostgreSQL on Oracle VM 1. Create DB and user.
Step 2: Core Backend Deployment
  └── Deploy Express to Oracle VM 1. Run migrations via boot. Verify /api/health.
Step 3: Initial Admin Promotion
  └── Register user via frontend/curl; run SQL to promote user to role 'ADMIN'.
Step 4: AI Microservice Provisioning
  └── Deploy Ollama, Faster-Whisper, Kokoro, and CV to assigned VMs.
  └── Verify local health endpoints (/health).
Step 5: Backend-to-AI Interconnect
  └── Populate backend .env with internal VM URLs. Restart backend.
Step 6: Domain & SSL Setup
  └── Point custom domain to VM 1. Run Certbot/Nginx for HTTPS termination.
Step 7: Frontend Build & Static Deployment
  └── Configure VITE_API_URL=https://api.hireai.example.com in Vercel. Deploy.
Step 8: End-to-End Verification
  └── Test Auth -> Resume Parse -> Interview Session -> Audio/Video Recording -> CV Analysis.
```

---

## 19. Final Verdict

### Assessment Summary
- **Deployment Readiness:** **58%**
- **Status:** **BLOCKED**
- **Critical Blockers:** 6
- **High-Risk Issues:** 7
- **Medium-Risk Issues:** 4
- **Low-Risk Issues:** 3

### Explicit Answer
**"Can this project be deployed in the intended FREE distributed Oracle/Vercel architecture right now?"**

### **NO.**

The repository cannot be deployed in the intended distributed cloud architecture in its current state. Core AI services, frontend API clients, and inter-service communications contain hardcoded localhost assumptions, local filesystem dependencies, untracked model assets, and unhandled missing environment fallbacks that guarantee immediate runtime failure. 

However, because the business logic, database migrations, and component architectures are already well-structured, the system **CAN BE DEPLOYED** once the targeted code and configuration adjustments outlined in Section 17 are applied.

---

## 20. Evidence Appendix

The conclusions in this audit report are backed by direct inspection of the following files:

| File Inspected | Key Lines / Functions | Inspected Subject |
| :--- | :--- | :--- |
| `backend/server.js` | Lines 24-34, 42-44, 78-95 | Host binding, CORS origins, health check, boot lifecycle |
| `backend/config/database.js` | Lines 4-15, 27-436 | Connection pool, error handling, idempotent table migrations |
| `backend/config/geminiKeys.js` | Lines 16-20 | Fatal crash on missing API keys |
| `backend/services/llmProvider.js` | Lines 32, 67-117, 190-210 | Hardcoded Ollama localhost URL, generation loop |
| `backend/services/sttService.js` | Lines 20-24, 54-89 | STT URL configuration, multipart streaming |
| `backend/ai/stt_service.py` | Lines 34-41, 272-282 | Faster-Whisper CLI flags, 0.0.0.0 bind, model loading |
| `backend/services/kokoroService.js`| Lines 18-22, 49-85 | TTS URL configuration, audio buffer decoding |
| `backend/ai/tts_service.py` | Lines 145-150, 192 | Hardcoded localhost bind, missing `--host` flag |
| `backend/services/cvService.js` | Lines 20-25, 57-94 | CV URL configuration, local file_path parameter passing |
| `backend/ai/cv_service.py` | Lines 87-90, 161, 1070-1087 | Model paths, CPU device fallback, local file reading |
| `backend/routes/sttRoutes.js` | Lines 36-62 | Unauthenticated transcribe endpoint |
| `backend/routes/recordingRoutes.js` | Lines 20-28, 33-38 | Recording upload and stream authentication |
| `backend/controllers/recordingController.js`| Lines 19-118, 125-199 | Recording storage, range streaming, CV triggering |
| `backend/services/reminderScheduler.js` | Lines 24, 48-195, 208-233| Interval timer, atomic database row claiming |
| `backend/services/emailService.js` | Lines 39-82, 115-120 | Nodemailer pool, non-fatal fallback, HTML escaping |
| `backend/services/reportService.js` | Lines 30-35, 340-520 | In-memory PDF/CSV streaming, absence of temp files |
| `src/services/api.js` | Lines 1, 7-28 | Hardcoded `/api` base URL in frontend |
| `src/services/adminApi.js` | Lines 10, 20-30 | Correct `VITE_API_URL` implementation |
| `src/App.jsx` | Lines 18-45, 47-84, 86-94 | `BrowserRouter`, route protection, lack of SPA rewrite |
| `scripts/start.ps1` | Lines 6-15, 118-273 | Windows-specific paths, Task Scheduler, CUDA arguments |
| `.gitignore` | Lines 10-18, 31-48 | Exclusion of `geminiKeys.js`, untracked status of `cv_model` |
| `git status` | Output verified | Confirmed untracked status of `backend/ai/cv_model/` |
