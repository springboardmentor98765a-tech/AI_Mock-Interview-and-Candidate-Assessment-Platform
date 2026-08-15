'use strict'

/**
 * backgroundReasoner.js
 *
 * Phase 3 of the Interview Brain.
 *
 * Provides two tightly related capabilities:
 *
 *   1. Background AI Reasoner
 *      Calls Gemini with a compact, targeted prompt to analyse the candidate's
 *      partial answer while they are still speaking.  The result is stored
 *      inside the Interview Brain for future phases to consume (adaptive
 *      follow-ups, topic switching, real-time coaching, etc.).
 *
 *   2. Intelligent Reasoning Scheduler
 *      Decides WHEN reasoning should fire based on three lightweight triggers:
 *        a) Word-growth threshold  — transcript has grown by ≥15 new words
 *        b) Time threshold         — candidate has spoken for ≥2.5 seconds
 *        c) New technology/keyword — context builder detected a new signal
 *
 *      A simple debounce prevents Gemini from being called on every keystroke.
 *      A revision-based guard ensures that if the transcript advances while
 *      Gemini is still processing, the stale result is silently discarded.
 *
 * This service intentionally does NOT:
 *   - Generate interview questions
 *   - Perform final scoring or evaluation
 *   - Decide interview flow or next question
 *   - Implement silence detection
 *   - Change any API contract
 *   - Modify frontend, STT, or TTS behaviour
 *
 * @module backgroundReasoner
 */

const llmProvider = require('./llmProvider')
const brain       = require('./interviewBrain')

// ---------------------------------------------------------------------------
// Scheduler state
// One lightweight scheduler record per active interview.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} SchedulerRecord
 * @property {number}  lastTriggeredRevision  - transcriptRevision when reasoning last fired
 * @property {number}  lastTriggeredWordCount  - wordCount when reasoning last fired
 * @property {number}  lastTriggerTimeMs       - Date.now() when reasoning last fired
 * @property {number}  techCount               - number of techs known when reasoning last fired
 * @property {boolean} taskRunning             - true while a Gemini call is in-flight
 */

/** @type {Map<string, SchedulerRecord>} */
const _schedulerState = new Map()

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Minimum new words added since last trigger to qualify as a word-growth trigger. */
const WORD_GROWTH_THRESHOLD = 20

/** Minimum elapsed ms since last trigger to qualify as a time trigger. */
const TIME_THRESHOLD_MS = 2500

/** Minimum debounce between any two reasoning invocations, in ms. */
const DEBOUNCE_MS = 800

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether background reasoning should be triggered for the given
 * interview state snapshot, and if so launch it asynchronously.
 *
 * This function returns IMMEDIATELY — it never awaits Gemini.
 * It is designed to be called from Brain.updatePartialTranscript() or any
 * other high-frequency update path without incurring latency.
 *
 * @param {object} state  — a snapshot of the current InterviewState
 * @returns {void}
 */
function maybeSchedule(state) {
  if (!state || !state.interviewId) return

  const id  = String(state.interviewId)
  const rec = _schedulerState.get(id) || _makeSchedulerRecord()

  const nowMs           = Date.now()
  const currentRevision = state.transcriptRevision || 0
  const currentWords    = state.wordCount || 0
  const currentTechs    = (state.liveContext?.mentionedTechnologies || []).length
  const timeSinceLast   = nowMs - (rec.lastTriggerTimeMs || 0)

  // ── Debounce gate — never fire more frequently than DEBOUNCE_MS ──────────
  if (timeSinceLast < DEBOUNCE_MS) return

  // ── Concurrency guard — one Qwen task at a time (4 GB VRAM constraint) ──
  if (rec.taskRunning) {
    console.log(`[BackgroundReasoner] Skipping — reasoning already in-flight for interview ${id}`)
    return
  }

  // ── Trigger evaluation ───────────────────────────────────────────────────
  const wordGrowth     = currentWords - rec.lastTriggeredWordCount
  const newTechFound   = currentTechs > rec.techCount
  const timeElapsed    = timeSinceLast >= TIME_THRESHOLD_MS

  const shouldTrigger  =
    wordGrowth  >= WORD_GROWTH_THRESHOLD ||
    timeElapsed ||
    newTechFound

  if (!shouldTrigger) return

  // ── Update scheduler record synchronously before async work ─────────────
  _schedulerState.set(id, {
    lastTriggeredRevision: currentRevision,
    lastTriggeredWordCount: currentWords,
    lastTriggerTimeMs:      nowMs,
    techCount:              currentTechs,
    taskRunning:            true,
  })

  // ── Fire and forget — never awaited ─────────────────────────────────────
  _runReasoning(state, currentRevision).catch(err => {
    console.warn(`[BackgroundReasoner] Unhandled error for interview ${id}:`, err.message)
  })
}

/**
 * Clean up scheduler state when an interview ends.
 * Should be called alongside Brain.clearInterview().
 *
 * @param {number|string} interviewId
 * @returns {void}
 */
function clearScheduler(interviewId) {
  if (!interviewId) return
  _schedulerState.delete(String(interviewId))
}

/**
 * Return diagnostic info about the scheduler for a given interview.
 * Useful for health checks and debugging.
 *
 * @param {number|string} interviewId
 * @returns {SchedulerRecord|null}
 */
function getSchedulerState(interviewId) {
  if (!interviewId) return null
  return _schedulerState.get(String(interviewId)) || null
}

// ---------------------------------------------------------------------------
// Internal — reasoning execution
// ---------------------------------------------------------------------------

/**
 * Perform the actual Gemini reasoning call.
 *
 * Lifecycle:
 *   1. Snapshot inputs from current brain state
 *   2. Notify Brain that reasoning has started (sets reasoningInProgress = true)
 *   3. Build compact prompt
 *   4. Call Gemini via the existing executeGeminiCall infrastructure
 *   5. Parse and validate JSON response
 *   6. Inject revision number into result
 *   7. Attempt to store via brain.storeReasoningResult() — which applies the revision guard
 *   8. In all cases (success or failure), mark reasoning finished
 *
 * @param {object} state           — InterviewState snapshot at trigger time
 * @param {number} revisionStarted — transcriptRevision captured at trigger time
 * @returns {Promise<void>}
 */
async function _runReasoning(state, revisionStarted) {
  const interviewId = state.interviewId

  console.log(`[FLOW] Background Reasoner started for interview ${interviewId} (r${revisionStarted})`)
  brain.markReasoningStarted(interviewId)

  try {
    const prompt  = _buildPrompt(state)
    const rawText = await _callLLM(prompt)
    const result  = _parseResult(rawText, revisionStarted)

    if (result) {
      brain.storeReasoningResult(interviewId, revisionStarted, result)
      console.log(`[FLOW] Background Reasoner updates stored for interview ${interviewId}`)
    } else {
      console.warn(`[BackgroundReasoner] Could not parse Gemini response for interview ${interviewId}`)
    }
  } catch (err) {
    console.warn(`[BackgroundReasoner] Reasoning failed for interview ${interviewId}: ${err.message}`)
  } finally {
    console.log(`[FLOW] Background Reasoner finished for interview ${interviewId}`)
    brain.markReasoningFinished(interviewId)
    const existing = _schedulerState.get(String(interviewId))
    if (existing) {
      _schedulerState.set(String(interviewId), Object.assign({}, existing, { taskRunning: false }))
    }
  }
}

// ---------------------------------------------------------------------------
// Internal — compact prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the smallest possible prompt that gives Gemini enough context
 * to reason usefully about the candidate's partial answer.
 *
 * Deliberately excludes:
 *   - Full question history
 *   - All previous answers
 *   - Evaluation instructions
 *   - Scoring instructions
 *
 * @param {object} state — InterviewState snapshot
 * @returns {string}
 */
function _buildPrompt(state) {
  const question     = state.currentQuestion     || '(unknown question)'
  const questionType = state.currentQuestionType || 'technical'
  const transcript   = state.liveTranscript      || ''
  const techs        = (state.liveContext?.mentionedTechnologies || []).slice(0, 10).join(', ') || 'none detected'
  const keywords     = (state.liveContext?.mentionedKeywords     || []).slice(0, 15).join(', ') || 'none detected'
  const lastTopic    = state.liveContext?.lastMentionedTopic || 'unknown'

  return `You are assisting an AI interview platform. Analyse the candidate's PARTIAL answer spoken so far.

Interview Question (${questionType}): ${question}

Candidate's partial answer so far:
"${transcript}"

Detected technologies: ${techs}
Detected keywords: ${keywords}
Last topic mentioned: ${lastTopic}

CRITICAL: This is a PARTIAL answer. The candidate is still speaking.
Do NOT evaluate completeness. Do NOT generate a next question.
Provide lightweight real-time analysis ONLY.

CRITICAL INSTRUCTION: Return ONLY raw valid JSON. No markdown, no explanation. Response MUST begin with '{' and end with '}'.

Return exactly this structure:
{
  "confidence": 0.0,
  "likelyOutcome": "good|average|poor",
  "missingConcepts": ["concept1", "concept2"],
  "candidateStrength": "one short sentence",
  "candidateWeakness": "one short sentence or null",
  "possibleFollowUp": "one short follow-up question or null",
  "revision": 0
}

Rules:
- confidence: float 0.0–1.0 estimating how well the candidate is answering so far
- likelyOutcome: "good" | "average" | "poor"
- missingConcepts: up to 3 key concepts not yet mentioned; empty array if none
- candidateStrength: brief observation on what the candidate is doing well
- candidateWeakness: brief observation or null if none apparent yet
- possibleFollowUp: a short follow-up question that might deepen the answer, or null
- revision: set to 0 (the platform will inject the correct value)`
}

// ---------------------------------------------------------------------------
// Internal — Gemini call
// ---------------------------------------------------------------------------

/**
 * Execute a single Gemini text generation call using the project's
 * established key-rotation and retry infrastructure.
 *
 * @param {string} prompt
 * @returns {Promise<string>} raw text response from Gemini
 */
async function _callLLM(prompt) {
  const text = await llmProvider.generate(prompt, {
    maxTokens:   512,   // compact response only
    temperature: 0.1,   // low temperature for deterministic analysis
  })
  if (!text || !text.trim()) {
    throw new Error('LLM returned empty response')
  }
  return text
}

// ---------------------------------------------------------------------------
// Internal — response parser
// ---------------------------------------------------------------------------

/**
 * Parse and validate the raw Gemini JSON response.
 * Injects the correct `revision` value.
 * Returns null on any parse or validation failure.
 *
 * @param {string} rawText        — raw text from Gemini
 * @param {number} revisionStarted
 * @returns {object|null}
 */
function _parseResult(rawText, revisionStarted) {
  try {
    // Extract the first JSON object from the text (handles markdown leakage)
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0])

    // Validate required fields
    if (typeof parsed.confidence    !== 'number') return null
    if (typeof parsed.likelyOutcome !== 'string') return null

    // Sanitise and clamp
    const result = {
      confidence:       Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      likelyOutcome:    ['good', 'average', 'poor'].includes(parsed.likelyOutcome)
        ? parsed.likelyOutcome
        : 'average',
      missingConcepts:  Array.isArray(parsed.missingConcepts)
        ? parsed.missingConcepts.slice(0, 3).map(String)
        : [],
      candidateStrength: typeof parsed.candidateStrength === 'string'
        ? parsed.candidateStrength
        : null,
      candidateWeakness: typeof parsed.candidateWeakness === 'string'
        ? parsed.candidateWeakness
        : null,
      possibleFollowUp: typeof parsed.possibleFollowUp === 'string'
        ? parsed.possibleFollowUp
        : null,
      revision: revisionStarted,   // always overwrite with the correct value
    }

    return result
  } catch (err) {
    console.warn('[BackgroundReasoner] JSON parse error:', err.message)
    return null
  }
}

// ---------------------------------------------------------------------------
// Internal — scheduler record factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh scheduler record for a new interview.
 * @returns {SchedulerRecord}
 */
function _makeSchedulerRecord() {
  return {
    lastTriggeredRevision:  0,
    lastTriggeredWordCount: 0,
    lastTriggerTimeMs:      0,
    techCount:              0,
    taskRunning:            false,
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  maybeSchedule,
  clearScheduler,
  getSchedulerState,
}
