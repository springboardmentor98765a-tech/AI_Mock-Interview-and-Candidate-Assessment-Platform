# SmartHire AI — Audit Report

Audited 5 August 2026 against the live codebase and a running server backed by
PostgreSQL 18. Every claim below was verified by executing code, not by reading
comments or names.

**Headline (original audit):** the backend was in good shape — 66 automated
tests passing, no 500s, no injection or RBAC holes. **The frontend was the
problem.** All three dashboards were entirely hardcoded; only login and
registration talked to the API.

> ## ✅ REMEDIATED — 5 August 2026
>
> All 20 bucket-A items are fixed. Every dashboard now reads from the database
> or from measured events; nothing renders a number that cannot be traced to a
> real row. Score-dependent panels render an explicit **"Not yet available"**
> affordance rather than a fabricated or zero value.
>
> - **13 new endpoints** — analytics, tickets, settings, metrics, live monitoring,
>   block/unblock, directory
> - **Tests: 66 → 111 passing**, 2 skipped (Gemini free-tier quota)
> - Frontend builds clean; all three dashboards verified in a real browser
>   against the live API
>
> See §7 for the per-item disposition and §8 for what still has no data source.

---

## 1. Feature inventory

| Module / feature | State | Evidence |
|---|---|---|
| **M1 — JWT auth** | **FULLY WORKING** | `api/auth.py`, `core/security.py` — register/login verified end to end |
| **M1 — Google OAuth2** | **FULLY WORKING** | `api/auth.py:75-150`; `/health` reports `google_login: true` |
| **M1 — GitHub OAuth2** | **FULLY WORKING** | `api/auth.py:153-257`; `/health` reports `github_login: true` |
| **M1 — RBAC** | **FULLY WORKING** | `core/deps.py:43` `require_roles`; 12 RBAC tests pass |
| **M1 — Session management** | **PARTIAL** | JWT expiry only. No refresh token, no server-side revocation, no logout endpoint |
| **M1 — Account lockout** | **STUB (client-side only)** | `context/AuthContext.jsx:78-94` — localStorage. Clearing storage removes the penalty; the server has no rate limiting at all |
| **M2 — Résumé PDF upload** | **FULLY WORKING** | `api/resumes.py` — magic bytes, size cap, uuid4 storage |
| **M2 — Skill extraction** | **FULLY WORKING** | `services/ai_provider.py:extract_resume` — all 6 components verified populated |
| **M2 — Experience / education / tech / summary** | **FULLY WORKING** | Same call; verified against a real PDF |
| **M2 — Frontend résumé UI** | **STUB** | `pages/candidate/CandidateHome.jsx:150-206` — file input never uploads; nothing reaches the server |
| **M3 — Question generation (4 types)** | **FULLY WORKING** | `api/interviews.py:70`, verified for HR/TECHNICAL/BEHAVIORAL/APTITUDE |
| **M3 — Difficulty selection** | **FULLY WORKING** | Verified distinct output per level |
| **M3 — Domain customisation** | **FULLY WORKING** | Free-text column; invented domains produce tailored questions |
| **M3 — Fallback question bank** | **FULLY WORKING** | `services/question_bank.py` — 96 questions, exercised when AI unavailable |
| **M3 — Session lifecycle** | **FULLY WORKING** | `CREATED → IN_PROGRESS → COMPLETED`, 5 tests pass |
| **M3 — REST APIs** | **FULLY WORKING** | All 8 endpoints, 30 tests pass |
| **M3 — Voice interviewer** | **FULLY WORKING (backend)** | `api/voice.py` WebSocket; verified end to end with real TTS/STT |
| **M3 — Voice frontend** | **STUB** | `pages/candidate/LiveSession.jsx` — fake timer, hardcoded question, no webcam, no mic, no WebSocket |
| **M4-M10 (speech analysis, emotion, scoring, notifications)** | **MISSING** | No code exists |
| **Candidate dashboard** | **STUB** | `CandidateHome.jsx` — zero API calls |
| **Recruiter dashboard** | **STUB** | `RecruiterHome.jsx` — zero API calls |
| **Admin dashboard** | **STUB** | `AdminHome.jsx` — zero API calls |
| **Report tickets** | **STUB** | `lib/tickets.js` — localStorage; invisible across browsers/users |
| **Report download** | **PARTIAL** | `lib/report.js` works, but formats hardcoded data |

---

## 2. Endpoint table

All verified by real HTTP calls against a running server.

| Method | Path | Auth / role | Real logic? |
|---|---|---|---|
| GET | `/` | public | Real (static status) |
| GET | `/api/health` | public | **Real** — reports live DB dialect + provider flags |
| POST | `/api/auth/register` | public | **Real** — validates, rejects duplicates + self-service ADMIN, BCrypt |
| POST | `/api/auth/login` | public | **Real** — verifies hash, issues JWT |
| GET | `/api/auth/google/login` · `/callback` | public | **Real** — OAuth2, upserts user |
| GET | `/api/auth/github/login` · `/callback` | public | **Real** — OAuth2 + verified-email lookup |
| GET | `/api/users/me` | any authed | **Real** |
| PUT | `/api/users/me` | any authed | **Real** — no role field, so no escalation |
| GET | `/api/users` | **ADMIN** | **Real** |
| PUT | `/api/users/{id}/role` | **ADMIN** | **Real** |
| POST | `/api/resumes` | **CANDIDATE** | **Real** — validate → store → pypdf → Gemini → persist |
| GET | `/api/resumes/me` | **CANDIDATE** | **Real** |
| GET | `/api/resumes/candidate/{id}` | **RECRUITER, ADMIN** | **Real** |
| POST | `/api/interviews/generate` | any authed | **Real** — AI with bank fallback |
| GET | `/api/interviews` | any authed | **Real** — user-scoped, filterable |
| GET | `/api/interviews/{id}` | any authed | **Real** |
| PUT | `/api/interviews/{id}` | any authed | **Real** |
| DELETE | `/api/interviews/{id}` | any authed | **Real** — cascade verified |
| POST | `/api/interviews/start` | any authed | **Real** |
| GET | `/api/interviews/history` | any authed | **Real** |
| GET | `/api/interviews/domains` | any authed | **Real** (static suggestion list, by design) |
| WS | `/api/interviews/voice/{id}` | JWT via query | **Real** — TTS/STT, persists transcripts |
| GET | `/api/interviews/voice/demo` | public | Real (static HTML client) |

**No endpoint returns canned data.** Every one is backed by a database query or
a provider call.

**Missing endpoints the frontend would need:** analytics/metrics, ticket CRUD,
admin user management (block/unblock), platform settings, API usage stats.

---

## 3. Fake data findings

### Bucket A — fake data pretending to be real (must be fixed or emptied)

| # | Location | What it fakes |
|---|---|---|
| A1 | `CandidateHome.jsx:10` `STATS` | "6 Interviews, 78% Avg score, 1 Awaiting, 82% Best" — invented |
| A2 | `CandidateHome.jsx:17` `SKILLS` | Skill scores + trend deltas — no scoring engine exists |
| A3 | `CandidateHome.jsx:24` `SESSIONS` | 4 fabricated interview records with dates and scores |
| A4 | `CandidateHome.jsx:31` `RECRUITERS` | 3 invented recruiters ("Sonia Rathod", "TechCorp") |
| A5 | `CandidateHome.jsx:37` `BREAKDOWN` | Score breakdown — the weights are spec, the **values are invented** |
| A6 | `RecruiterHome.jsx:9` `STATS` | "24 Candidates, 18 Assessed, 69% Avg, 2 Live now" |
| A7 | `RecruiterHome.jsx:16` `CANDIDATES` | 4 fake candidates with scores, ranks, skill arrays |
| A8 | `RecruiterHome.jsx:25` `DISTRIBUTION` | Invented score histogram (276 phantom candidates) |
| A9 | `RecruiterHome.jsx:33` `POOL_SKILLS` | Invented pool averages |
| A10 | `RecruiterHome.jsx:40` `LIVE` | Fake "live now" monitoring feed |
| A11 | `RecruiterHome.jsx:47` `BREAKDOWN` | Invented values |
| A12 | `AdminHome.jsx:6` `STATS` | "312 users, 48 recruiters, 1,284 interviews, 72%" — DB has **7 users, 11 interviews** |
| A13 | `AdminHome.jsx:13` `ACTIVITY` | Fabricated audit log with fake timestamps |
| A14 | `AdminHome.jsx:20` `INITIAL_USERS` | 4 invented users — real ones are one API call away |
| A15 | `AdminHome.jsx:29` `API_STATS` | "48,912 requests, 142ms avg, 0.4% errors" — nothing is measured |
| A16 | `AdminHome.jsx:37` `LATENCY` | Invented 8-point latency time series |
| A17 | `AdminHome.jsx:48` `ENDPOINTS` | Per-endpoint stats for **paths that don't exist** (`/api/v1/...`) |
| A18 | `LiveSession.jsx:5` `METRICS` | "Eye contact 87%, Confidence High, Pace 148wpm" — no such analysis exists |
| A19 | `LiveSession.jsx:11-12,49,51` | Hardcoded timer, question text and a pre-written "your response" |
| A20 | `AdminHome.jsx:63` `settings` | Settings UI writes to React state only; never persists |

**A17 is the most damaging in a demo** — it displays fabricated performance
metrics for API paths this application has never had.

### Bucket B — legitimate hardcoded values (leave alone)

| Location | Why it stays |
|---|---|
| `services/question_bank.py` — 96 questions + `SUGGESTED_DOMAINS` | Deliberate documented fallback; keeps the app working with no key |
| `models/*.py` enums (`Role`, `Difficulty`, `SessionStatus`, `ResumeStatus`, `Provider`, `InterviewType`, `QuestionSource`) | Domain enums |
| `core/config.py` defaults | Config defaults, overridden by `.env` |
| `services/ai_provider.py` prompt guidance dicts | Prompt engineering, not data |
| `services/pdf_text.py:MIN_USABLE_CHARS = 200` | Deliberate scanned-PDF threshold |
| `CandidateHome.jsx:44` / `RecruiterHome.jsx:54` `TYPES` / `LEVELS` | Mirror backend enums |
| `Landing.jsx` `STEPS` / `ROLES` | Marketing copy |
| `Register.jsx:7` `ROLES` | Self-service roles, matches `SELF_SERVICE_ROLES` |
| `lib/tickets.js:8` `REASONS` | Enum-like report reasons |
| `AuthContext.jsx` `MAX_ATTEMPTS` / `LOCK_MINUTES` | Policy constants (the *mechanism* is the problem, not these) |
| `tests/fixtures/*` | Test fixtures |
| `api/voice.py:_DEMO_PAGE` | Deliberate self-contained demo client |

### Bucket C — ask me before touching

| # | Item | The question |
|---|---|---|
| C1 | `CandidateHome.jsx` score/analytics sections (A1, A2, A5) | **No scoring engine exists** (Module 7, unbuilt). Show zero/empty states, or hide these sections until scoring ships? |
| C2 | `lib/tickets.js` localStorage tickets | Build a real `tickets` table + endpoints now, or leave as a known prototype? Not in any module spec. |
| C3 | `AdminHome.jsx` API usage/latency (A15-A17) | Real telemetry needs request-timing middleware + a metrics store. Build it, or empty-state it? |
| C4 | `AdminHome.jsx` platform settings (A20) | Needs a settings table. Persist, or mark clearly as not-yet-wired? |
| C5 | `LiveSession.jsx` | Rewrite against the working voice WebSocket, or leave until Modules 5/6? |
| C6 | `RecruiterHome.jsx` `LIVE` monitoring (A10) | Needs live session tracking. Derive from `interviews.status = IN_PROGRESS`, or empty-state? |
| C7 | `DevScreenSwitcher.jsx` | It's broken (see F4). Fix, or delete? |

---

## 4. Test results

**No test suite existed.** I wrote one: `backend/tests/` — 68 tests across 4 files,
run over real HTTP against a live server.

```
66 passed, 2 skipped in 16.25s
```

| File | Tests | Covers |
|---|---|---|
| `test_auth_rbac.py` | 18 | login, register, JWT, email enumeration, privilege escalation, role guards |
| `test_interviews.py` | 30 | generation × 4 types, validation, CRUD, ownership isolation, lifecycle, route ordering |
| `test_resumes.py` | 14 | upload validation, all negative cases, RBAC, retrieval |
| `test_voice.py` | 6 | WebSocket auth (4401/4404), demo page, protocol errors |

**The 2 skips are real** — résumé extraction could not be tested because the
Gemini free-tier quota was exhausted mid-run (see F1).

### Failures found and fixed during the audit

1. **3 test failures** — my own fixtures used `.test`/`.local` TLDs, which
   `email-validator` rejects with 422. Fixture bug, not an app bug; switched to
   `example.com`.

### Robustness probes — all clean, no 500s

| Probe | Result |
|---|---|
| Malformed JSON | 422 |
| Negative / non-numeric / overflow ids | 404 / 422 / 404 |
| **SQL injection** (`x'; DROP TABLE interviews;--`) | **201, stored as inert text; all tables intact** |
| Unicode + emoji domain | 201 |
| 1000-char domain | 422 |
| Garbage / prefix-less bearer token | 401 |
| Empty multipart upload | 400 |

**Zero 500s and zero unhandled exceptions across the entire audit.**

---

## 5. What's missing & needs immediate care

### SEVERITY 1 — security

**S1. No server-side rate limiting or account lockout.**
The 30-minute lockout is `localStorage` only (`AuthContext.jsx:78-94`).
`localStorage.clear()` removes it, and `curl` never sees it. Login, registration
and the expensive AI endpoints can all be hammered without limit.
*Fix:* server-side attempt counter keyed on email+IP; per-user quota on AI endpoints.

**S2. JWTs cannot be revoked.**
No logout endpoint, no refresh token, no denylist. A leaked token is valid for
its full 24 hours. Changing a user's role does not invalidate their existing token.
*Fix:* shorten expiry, add refresh tokens, add a revocation list keyed on `jti`.

**S3. Voice WebSocket token travels in the query string.**
`api/voice.py` — unavoidable for browser WebSockets, but query strings land in
server logs and proxy logs. *Fix:* issue a short-lived single-use ticket for the
socket rather than passing the session JWT.

**S4. Uploaded résumés are never deleted.**
Every upload — including `FAILED` ones — persists forever under `backend/uploads/`.
Candidate PII with no retention policy. *Fix:* delete on failure, cap versions
per user, add a retention job.

*Checked and clean:* SQL injection (parameterised), path traversal (uuid4
filenames), secrets (`.env` + `uploads/` both gitignored, `.env.example` holds
placeholders only), password hashing (BCrypt), email enumeration (identical
401s), privilege escalation (`UserUpdate` has no role field).

### SEVERITY 2 — broken core flows

**F1. Gemini free tier is 20 requests/day, not 1,500.**
Observed: `GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20, model:
gemini-3.6-flash`. **This corrects what I told you earlier.** The audit alone
exhausted the daily quota. Both modules share it, so ~20 AI operations per day
total — one voice interview can consume several.
*Fix options:* switch `GEMINI_MODEL` to a higher-quota model such as
`gemini-2.5-flash`, enable billing, or accept the fallback bank for demos.
**Your decision — I have not changed the model.**

**F2. A quota 429 is reported to the user as "check that GEMINI_API_KEY is set".**
`api/resumes.py:157` collapses every `AIUnavailable` into one message. The key is
fine; the quota is gone. Actively misleading. *Fix:* distinguish 429 from missing
key and return "temporarily unavailable, try again shortly".

**F3. The entire frontend beyond login is disconnected.**
Only `AuthContext.jsx` and `Login.jsx` import `lib/api`. Three dashboards, the
résumé uploader and the live session render hardcoded constants. The working
backend is invisible to a user.

**F4. `DevScreenSwitcher` is broken.**
`DevScreenSwitcher.jsx:30` calls `login({email, role, name, provider})` — but
`AuthContext.login` expects `{email, password}` and posts to the API. It will
always fail. `devLogin` exists and is what it should call. Dev-only, low impact.

**F5. `LiveSession.jsx` claims to record and doesn't.**
Shows "Recording", "Webcam active · 720p" and a live timer with no webcam, no
microphone and no WebSocket. The working voice interviewer is at
`/api/interviews/voice/demo` instead.

### SEVERITY 3 — gaps against the module specs

| Gap | Spec |
|---|---|
| No speech analysis (grammar, filler words, pace) | Module 5 |
| No emotion detection / eye tracking | Module 6 |
| No scoring engine or the 30/25/30/15 weighting | Module 7 |
| No analytics endpoints | Module 8 |
| No notifications or email | Module 9 |
| `raw_text` is stored but never feeds question generation | M2→M3 integration |
| No Alembic migrations (`create_all` only) | Deployment |
| No frontend tests, no CI | Module 10 |

---

## 6. Analytics: fake vs real

**Nothing has been converted yet** — this report is Phases 1-3; Phase 4 awaits
your approval.

### Can be made real immediately from existing tables

| Metric | Source |
|---|---|
| Total users / by role | `SELECT count(*) FROM users GROUP BY role` |
| Total interviews, by type/difficulty/status | `interviews` |
| Interviews per candidate, completion rate | `interviews.status` |
| Questions asked vs answered | `interview_questions.answer_text IS NOT NULL` |
| Interview history with real dates/durations | `started_at`, `completed_at` |
| Résumé counts, parse success rate | `resumes.status` |
| Top skills/technologies across candidates | `resumes.skills` / `technologies` JSON |
| Live sessions now | `interviews.status = 'IN_PROGRESS'` |
| Interviews over time | `date_trunc` on `created_at` |

### Has no data source — must show an honest empty state

| Metric | Blocked by |
|---|---|
| Any score (avg, best, breakdown, ranking, distribution) | Module 7 unbuilt |
| Communication / confidence / technical / professionalism | Modules 5-7 |
| Eye contact, pace, emotion | Module 6 |
| API request counts, latency, error rate | No telemetry middleware |
| Audit/activity log | No audit table |

---

---

## 7. Remediation — per-item disposition

**Legend:** **REAL** = now computed from database rows or measured events ·
**EMPTY** = renders an explicit "Not yet available" affordance, no number.

### Bucket A — all 20 resolved

| # | Item | Disposition | Source |
|---|---|---|---|
| A1 | Candidate `STATS` | **REAL** | `GET /analytics/candidate` — interview/question counts |
| A2 | Candidate `SKILLS` | **EMPTY** | Needs Module 7 |
| A3 | Candidate `SESSIONS` | **REAL** | `GET /interviews` — real types, domains, statuses, durations |
| A4 | Candidate `RECRUITERS` | **REAL** | `GET /users/directory?role=RECRUITER` |
| A5 | Candidate `BREAKDOWN` | **EMPTY** | Needs Module 7 |
| A6 | Recruiter `STATS` | **REAL** | `GET /analytics/recruiter` |
| A7 | Recruiter `CANDIDATES` | **REAL** | `GET /analytics/recruiter/candidates` — no score, no rank |
| A8 | `DISTRIBUTION` | **EMPTY** | Needs Module 7 |
| A9 | `POOL_SKILLS` | **EMPTY** | Needs Module 7 |
| A10 | Recruiter `LIVE` | **REAL** | `GET /analytics/live` — `status = IN_PROGRESS`, real Q-progress |
| A11 | Recruiter `BREAKDOWN` | **EMPTY** | Needs Module 7 |
| A12 | Admin `STATS` | **REAL** | `GET /analytics/admin` — **312→11 users, 1,284→11 interviews** |
| A13 | Admin `ACTIVITY` | **EMPTY** | No audit table exists |
| A14 | Admin `INITIAL_USERS` | **REAL** | `GET /users` + working role change and block |
| A15 | `API_STATS` | **REAL** | `GET /metrics` — measured by timing middleware |
| A16 | `LATENCY` | **REAL** | Real avg/p95/p99 from measured requests |
| A17 | `ENDPOINTS` | **REAL** | Actual route templates — the invented `/api/v1/*` paths are gone |
| A18 | `LiveSession` `METRICS` | **EMPTY** | No eye-contact/confidence/pace analysis exists |
| A19 | `LiveSession` hardcoded Q&A | **REAL** | Rewritten on the voice WebSocket — real questions, real mic, real transcripts |
| A20 | Admin `settings` | **REAL** | `GET/PUT /settings` — persisted **and enforced** |

### Also changed

| Item | Change |
|---|---|
| `lib/tickets.js` | **Deleted.** localStorage prototype replaced by a real `tickets` table + CRUD |
| `lib/report.js` | Rewired to build from real API data; states plainly that scores do not exist |
| `DevScreenSwitcher` | **Fixed** (F4) — called `login()` with no password and always failed; now uses the seeded demo accounts and gets a real JWT |
| Admin AI panel | Was an editable model dropdown that persisted nothing. Now read-only, showing the real `GEMINI_MODEL` from `/health` |
| Recruiter templates | Was React-state-only. Now an honest "Not yet available" — there is no templates table |
| `users.is_blocked` | New column (via `ALTER TABLE`) — blocking now rejects login **and** invalidates the existing JWT |

### Backend added

`app/models/{ticket,setting}.py` · `app/schemas/{analytics,ticket}.py` ·
`app/api/{analytics,tickets,settings}.py` · `app/services/metrics.py` ·
`frontend/src/lib/useApi.js` · `frontend/src/components/Panel.jsx`

### Bucket B — untouched, as required

Question bank, all enums, config defaults, prompt guidance, `MIN_USABLE_CHARS`,
`TYPES`/`LEVELS`, landing copy, `REASONS`, lockout constants, test fixtures,
voice demo page. All verified still present.

---

## 8. What still has no data source

Everything below awaits **Module 7 (AI Feedback & Scoring)**. None of it is
faked, estimated or seeded — each renders "Not yet available" with the reason.

| Metric | Blocked by |
|---|---|
| Overall / average / best score | Module 7 |
| Communication, confidence, technical, professionalism ratings | Modules 5-7 |
| Score breakdown (the 30/25/30/15 weighting) | Module 7 |
| Score distribution across the pool | Module 7 |
| Candidate ranking and comparison | Module 7 |
| Eye contact, emotion, speaking pace | Module 6 |
| Administrator audit log | No audit table |
| Interview templates | No templates table |

**Two caveats on what *is* real:**

- **Telemetry is in-process.** Counters reset on server restart, which is why
  the API returns `window_start` and the UI says "totals since &lt;time&gt;"
  rather than implying all-time figures.
- **`interviews_last_14_days`** is a real time series, but the platform is days
  old, so most buckets are legitimately zero.

---

## 9. Still outstanding (unchanged by this work)

The security findings in §5 are **not** addressed by the remediation:

1. **S1** — no server-side rate limiting; the 30-minute lockout is still
   localStorage-only and `curl` bypasses it entirely
2. **S2** — JWTs still cannot be revoked (though blocking now invalidates them)
3. **S4** — uploaded résumés, including failed ones, are still never deleted
4. **F1** — Gemini free tier is **20 requests/day**, not 1,500; both modules
   share it
5. **F2** — a quota 429 is still reported as "check that GEMINI_API_KEY is set"
