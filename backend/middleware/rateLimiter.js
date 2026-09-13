'use strict'

/**
 * backend/middleware/rateLimiter.js
 *
 * Named rate limiters for HireAI Express routes.
 *
 * All limits are environment-configurable so production operators can tune
 * them without code changes. The defaults are permissive enough that normal
 * localhost development is never blocked.
 *
 * Uses express-rate-limit v7 (already in backend/package.json).
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Limiter            │ Default window │ Default max │ Env override       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  authLimiter        │ 15 min         │ 20 attempts │ RATE_AUTH_MAX      │
 * │  registerLimiter    │ 60 min         │ 10 attempts │ RATE_REGISTER_MAX  │
 * │  aiGenerateLimiter  │ 60 min         │ 30 requests │ RATE_AI_GENERATE_MAX│
 * │  sttLimiter         │ 15 min         │ 60 requests │ RATE_STT_MAX       │
 * │  healthLimiter      │  1 min         │ 30 requests │ RATE_HEALTH_MAX    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Localhost note:
 *   All limiters use the in-memory store (default). They reset when the
 *   server restarts. This is correct for single-instance development.
 *   For multi-instance production, replace the store with a Redis store.
 *
 * Trust-proxy note:
 *   See server.js for the trust-proxy setting that ensures the limiter
 *   reads the real client IP (X-Forwarded-For) behind Nginx, not the
 *   proxy's loopback IP.
 */

const rateLimit = require('express-rate-limit')

// ---------------------------------------------------------------------------
// Helper: read an int env var with a fallback default
// ---------------------------------------------------------------------------
function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

// ---------------------------------------------------------------------------
// Standard JSON 429 response — uniform across all limiters
// ---------------------------------------------------------------------------
function handler429(req, res, next, options) {
  res.status(429).json({
    success:     false,
    message:     options.message || 'Too many requests — please try again later.',
    retryAfter:  Math.ceil(options.windowMs / 1000),
  })
}

// ---------------------------------------------------------------------------
// authLimiter — POST /api/auth/login
//   Protects against credential-stuffing / brute-force.
//   20 attempts per 15 minutes per IP by default.
//   Developers running localhost can bump RATE_AUTH_MAX to e.g. 200.
// ---------------------------------------------------------------------------
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,                  // 15 minutes
  max:              envInt('RATE_AUTH_MAX', 20),
  standardHeaders:  'draft-7',                        // Retry-After header
  legacyHeaders:    false,
  message:          'Too many login attempts from this IP. Please wait 15 minutes.',
  handler:          handler429,
  skipSuccessfulRequests: true,                       // Only count failed attempts
})

// ---------------------------------------------------------------------------
// registerLimiter — POST /api/auth/register
//   Account creation is rarer and more expensive (bcrypt hash).
//   10 new registrations per 60 minutes per IP.
// ---------------------------------------------------------------------------
const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,                   // 60 minutes
  max:             envInt('RATE_REGISTER_MAX', 10),
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         'Too many registration attempts from this IP. Please try again later.',
  handler:         handler429,
})

// ---------------------------------------------------------------------------
// aiGenerateLimiter — POST /api/interviews/generate
//   Calls the LLM (Ollama or Gemini) to generate 8-10 interview questions.
//   Each call is expensive CPU/API-cost wise.
//   30 calls per 60 minutes per IP is generous for legitimate users; a
//   candidate generates an interview 2-4 times per session at most.
// ---------------------------------------------------------------------------
const aiGenerateLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,                   // 60 minutes
  max:             envInt('RATE_AI_GENERATE_MAX', 30),
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         'Too many interview generation requests. Please wait before generating another interview.',
  handler:         handler429,
})

// ---------------------------------------------------------------------------
// sttLimiter — POST /api/stt/transcribe
//   Audio transcription; sends up to 25 MB to the Faster-Whisper service.
//   60 requests per 15 minutes is enough for a full interview session
//   (one per question answer, typically 8-10 answers per interview).
// ---------------------------------------------------------------------------
const sttLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,                   // 15 minutes
  max:             envInt('RATE_STT_MAX', 60),
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         'Too many transcription requests. Please slow down.',
  handler:         handler429,
})

// ---------------------------------------------------------------------------
// healthLimiter — GET /api/health
//   Prevents the health endpoint from being used as a free ping-flood vector.
//   30 requests per minute per IP is plenty for load balancers; automated
//   health checks typically poll once every 10-30 seconds.
// ---------------------------------------------------------------------------
const healthLimiter = rateLimit({
  windowMs:        60 * 1000,                        // 1 minute
  max:             envInt('RATE_HEALTH_MAX', 30),
  standardHeaders: 'draft-7',
  legacyHeaders:   false,
  message:         'Health check rate limit exceeded.',
  handler:         handler429,
})

module.exports = {
  authLimiter,
  registerLimiter,
  aiGenerateLimiter,
  sttLimiter,
  healthLimiter,
}
