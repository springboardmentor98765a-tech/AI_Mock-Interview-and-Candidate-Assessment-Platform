'use strict'

/**
 * interviewBrain.js
 *
 * Central in-memory state manager for all active interviews.
 * Keyed by interviewId (integer or string).
 *
 * Phase 1 — Foundation: interview state, question & answer history.
 * Phase 2 — Streaming transcripts + lightweight background context builder.
 * Phase 3 — Background AI Reasoner integration: stores reasoning results produced
 *            by backgroundReasoner.js; revision-guard prevents stale writes.
 *
 * This service intentionally does NOT:
 *   - Call Gemini or any AI model
 *   - Perform scoring or evaluation
 *   - Generate questions
 *   - Access PostgreSQL
 *   - Call TTS or STT
 *   - Implement WebSockets or Server-Sent Events
 *
 * @module interviewBrain
 */

/** @type {Map<string, InterviewState>} */
const _store = new Map()

// ---------------------------------------------------------------------------
// Internal key helper
// ---------------------------------------------------------------------------

/**
 * Normalise any interviewId to a consistent string Map key.
 * @param {number|string} interviewId
 * @returns {string}
 */
function _key(interviewId) {
  return String(interviewId)
}

// ---------------------------------------------------------------------------
// Initial state factory
// ---------------------------------------------------------------------------

/**
 * Build a fresh, fully-initialised InterviewState object.
 *
 * All Phase 1 and Phase 2 fields are present from creation so that
 * downstream consumers never encounter missing keys.
 *
 * @param {object}        params
 * @param {number|string} params.interviewId
 * @param {string}        params.role
 * @param {string}        params.interviewType
 * @param {string}        params.difficulty
 * @param {number}        params.totalQuestions
 * @returns {InterviewState}
 */
function _buildInitialState({ interviewId, role, interviewType, difficulty, totalQuestions }) {
  const now = new Date().toISOString()

  return {
    // ── Core identity ───────────────────────────────────────────────────────
    interviewId:   String(interviewId),
    role:          role          || '',
    interviewType: interviewType || '',
    difficulty:    difficulty    || '',
    totalQuestions: totalQuestions || 0,

    // ── Active question tracking ────────────────────────────────────────────
    currentQuestionNumber: 0,
    currentQuestion:       null,
    currentQuestionType:   null,

    // ── Timestamps ──────────────────────────────────────────────────────────
    interviewStartedAt: null,
    lastUpdatedAt:      now,

    // ── History (Phase 1) ───────────────────────────────────────────────────
    questionHistory: [],
    // { questionNumber, question, questionType, expectedLanguage,
    //   category, difficulty, sequence, askedAt }

    answerHistory: [],
    // { questionNumber, answer, receivedAt }

    // ── Semantic tracking — enriched in later phases ────────────────────────
    topicsCovered: [],
    strengths:     [],
    weaknesses:    [],

    // ── Follow-up management — used in later phases ─────────────────────────
    followUpsAsked: 0,

    // ── Evaluation — set only after AI evaluation in later phases ───────────
    interviewScore: null,

    // ── Per-type question counters ───────────────────────────────────────────
    metadata: {
      technicalQuestions:    0,
      codingQuestions:       0,
      behavioralQuestions:   0,
      projectQuestions:      0,
      hrQuestions:           0,
      aptitudeQuestions:     0,
      systemDesignQuestions: 0,
    },

    // ── Phase 2: Streaming transcript fields ─────────────────────────────────
    liveTranscript:         '',     // partial transcript being built right now
    finalTranscript:        '',     // sealed transcript after candidate finishes speaking
    isSpeaking:             false,  // true while STT is receiving audio
    speechStartedAt:        null,   // ms timestamp (Date.now()) when speaking began
    lastSpeechAt:           null,   // ms timestamp of most recent partial update
    partialTranscriptHistory: [],   // every revision: { revision, text, wordCount, recordedAt }
    transcriptRevision:     0,      // monotonically increasing counter per partial update
    wordCount:              0,      // word count of current liveTranscript
    speechDurationMs:       0,      // ms elapsed since speechStartedAt

    // ── Phase 2: Live context (background context builder) ──────────────────
    liveContext: {
      mentionedTechnologies:  [],   // tech names matched from transcript
      mentionedKeywords:      [],   // non-stop meaningful words
      lastMentionedTopic:     null, // last meaningful token seen
      estimatedAnswerLength:  'short', // 'short' | 'medium' | 'long' | 'very_long'
    },

    // ── Phase 3: Background AI Reasoner results ────────────────────────────────
    backgroundReasoning: {
      latestRevision:         0,     // transcriptRevision when the latest result was computed
      latestResult:           null,  // the structured JSON object returned by Gemini
      lastReasoningStarted:   null,  // ISO timestamp when the most recent task was launched
      lastReasoningCompleted: null,  // ISO timestamp when the most recent task finished
      reasoningInProgress:    false, // true while at least one Gemini task is running
    },

    // ── Reserved for future phases ───────────────────────────────────────────
    // silenceDetection:    null,
    // confidenceTracking:  null,
    // adaptiveSignals:     null,
    // latencyMetrics:      null,
  }
}

// ---------------------------------------------------------------------------
// ── Phase 1: Exported functions (unchanged signatures) ──────────────────────
// ---------------------------------------------------------------------------

/**
 * Create a new interview state and store it.
 * Overwrites any existing state for the same interviewId (safe for re-generation).
 *
 * @param {object}        params
 * @param {number|string} params.interviewId
 * @param {string}        params.role
 * @param {string}        params.interviewType
 * @param {string}        params.difficulty
 * @param {number}        params.totalQuestions
 * @returns {InterviewState|null}
 */
function createInterviewState(params) {
  if (!params || !params.interviewId) {
    console.warn('[InterviewBrain] createInterviewState: missing interviewId — skipped')
    return null
  }
  const state = _buildInitialState(params)
  _store.set(_key(params.interviewId), state)
  console.log(`[InterviewBrain] State created for interview ${params.interviewId} (${params.role})`)
  return state
}

/**
 * Return the live state for an interview.
 * Returns null (not an error) if the interview is not tracked.
 *
 * @param {number|string} interviewId
 * @returns {InterviewState|null}
 */
function getInterviewState(interviewId) {
  if (!interviewId) return null
  return _store.get(_key(interviewId)) || null
}

/**
 * Safely shallow-merge a partial update into the existing state.
 * Nested objects (e.g. `metadata`, `liveContext`) must be passed in full
 * when replacing; otherwise use their dedicated helper functions.
 *
 * @param {number|string}          interviewId
 * @param {Partial<InterviewState>} updates
 * @returns {InterviewState|null}
 */
function updateInterviewState(interviewId, updates) {
  if (!interviewId || !updates) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] updateInterviewState: interview ${interviewId} not found — skipped`)
    return null
  }
  const updated = Object.assign({}, existing, updates, {
    lastUpdatedAt: new Date().toISOString(),
  })
  _store.set(_key(interviewId), updated)
  return updated
}

/**
 * Record a question being asked.
 *
 * Automatically:
 *   - Pushes to questionHistory
 *   - Sets currentQuestion and currentQuestionType
 *   - Increments currentQuestionNumber
 *   - Increments the appropriate metadata counter
 *   - Updates lastUpdatedAt
 *
 * @param {number|string} interviewId
 * @param {object}        question
 * @param {string}        question.question
 * @param {string}        [question.questionType]
 * @param {string|null}   [question.expectedLanguage]
 * @param {string}        [question.category]
 * @param {string}        [question.difficulty]
 * @param {number}        [question.sequence]
 * @returns {InterviewState|null}
 */
function recordQuestion(interviewId, question) {
  if (!interviewId || !question) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] recordQuestion: interview ${interviewId} not found — skipped`)
    return null
  }

  const qType       = (question.questionType || 'technical').toLowerCase()
  const questionNum = (existing.currentQuestionNumber || 0) + 1
  const now         = new Date().toISOString()

  const historyEntry = {
    questionNumber:   questionNum,
    question:         question.question || '',
    questionType:     qType,
    expectedLanguage: question.expectedLanguage || null,
    category:         question.category || '',
    difficulty:       question.difficulty || '',
    sequence:         question.sequence || questionNum,
    askedAt:          now,
  }

  const metaKey     = _questionTypeToMetaKey(qType)
  const updatedMeta = Object.assign({}, existing.metadata)
  if (metaKey) updatedMeta[metaKey] = (updatedMeta[metaKey] || 0) + 1

  // Reset streaming transcript fields for the new question
  const updated = Object.assign({}, existing, {
    currentQuestionNumber:    questionNum,
    currentQuestion:          question.question || '',
    currentQuestionType:      qType,
    questionHistory:          [...existing.questionHistory, historyEntry],
    metadata:                 updatedMeta,
    lastUpdatedAt:            now,
    // Reset live transcript state ready for next answer
    liveTranscript:           '',
    finalTranscript:          '',
    isSpeaking:               false,
    speechStartedAt:          null,
    lastSpeechAt:             null,
    partialTranscriptHistory: [],
    transcriptRevision:       0,
    wordCount:                0,
    speechDurationMs:         0,
    liveContext: {
      mentionedTechnologies: [],
      mentionedKeywords:     [],
      lastMentionedTopic:    null,
      estimatedAnswerLength: 'short',
    },
  })

  _store.set(_key(interviewId), updated)
  return updated
}

/**
 * Record the candidate's answer to the current question.
 * Stores the transcript only — no evaluation, no scoring, no Gemini.
 *
 * @param {number|string} interviewId
 * @param {string}        answer
 * @returns {InterviewState|null}
 */
function recordAnswer(interviewId, answer) {
  if (!interviewId) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] recordAnswer: interview ${interviewId} not found — skipped`)
    return null
  }

  const now = new Date().toISOString()
  const answerEntry = {
    questionNumber: existing.currentQuestionNumber,
    answer:         typeof answer === 'string' ? answer : '',
    receivedAt:     now,
  }

  const updated = Object.assign({}, existing, {
    answerHistory: [...existing.answerHistory, answerEntry],
    lastUpdatedAt: now,
  })

  _store.set(_key(interviewId), updated)
  return updated
}

/**
 * Delete the in-memory state for a completed or abandoned interview.
 * Safe to call on a non-existent interviewId.
 *
 * @param {number|string} interviewId
 * @returns {boolean} true if deleted, false if not found
 */
function clearInterview(interviewId) {
  if (!interviewId) return false
  const existed = _store.has(_key(interviewId))
  _store.delete(_key(interviewId))
  if (existed) {
    console.log(`[InterviewBrain] State cleared for interview ${interviewId}`)
  }
  return existed
}

/**
 * Return the total number of active interviews tracked in memory.
 * Useful for diagnostics and health-check endpoints.
 *
 * @returns {number}
 */
function activeInterviewCount() {
  return _store.size
}

// ---------------------------------------------------------------------------
// ── Phase 2 Part 1: Streaming Transcript Functions ───────────────────────────
// ---------------------------------------------------------------------------

/**
 * Mark the candidate as having started speaking for the current question.
 *
 * Sets isSpeaking = true and records the wall-clock start time.
 * Should be called when the STT layer detects voice activity / speech onset.
 *
 * @param {number|string} interviewId
 * @returns {InterviewState|null}
 */
function startSpeaking(interviewId) {
  if (!interviewId) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] startSpeaking: interview ${interviewId} not found — skipped`)
    return null
  }

  const nowMs = Date.now()
  const updated = Object.assign({}, existing, {
    isSpeaking:      true,
    speechStartedAt: nowMs,
    lastSpeechAt:    nowMs,
    lastUpdatedAt:   new Date(nowMs).toISOString(),
  })

  _store.set(_key(interviewId), updated)
  return updated
}

/**
 * Update the live partial transcript while the candidate is speaking.
 *
 * Called on every incremental STT update.  Performs:
 *   - Stores the new text as liveTranscript
 *   - Appends a revision snapshot to partialTranscriptHistory
 *   - Increments transcriptRevision
 *   - Recalculates wordCount and speechDurationMs
 *   - Updates lastSpeechAt
 *   - Re-runs the background context builder on the new text
 *
 * @param {number|string} interviewId
 * @param {string}        partialTranscript — the latest cumulative partial text from STT
 * @returns {InterviewState|null}
 */
function updatePartialTranscript(interviewId, partialTranscript) {
  if (!interviewId) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] updatePartialTranscript: interview ${interviewId} not found — skipped`)
    return null
  }

  const text     = typeof partialTranscript === 'string' ? partialTranscript : ''
  const nowMs    = Date.now()
  const revision = (existing.transcriptRevision || 0) + 1
  const words    = _countWords(text)

  const speechDurationMs = existing.speechStartedAt
    ? nowMs - existing.speechStartedAt
    : 0

  const revisionEntry = {
    revision,
    text,
    wordCount:  words,
    recordedAt: new Date(nowMs).toISOString(),
  }

  // Rebuild live context from the latest full text
  const updatedContext = _buildLiveContext(text, existing.liveContext)

  const updated = Object.assign({}, existing, {
    liveTranscript:           text,
    lastSpeechAt:             nowMs,
    transcriptRevision:       revision,
    wordCount:                words,
    speechDurationMs,
    partialTranscriptHistory: [...existing.partialTranscriptHistory, revisionEntry],
    liveContext:              updatedContext,
    lastUpdatedAt:            new Date(nowMs).toISOString(),
  })

  _store.set(_key(interviewId), updated)
  return updated
}

/**
 * Seal the candidate's spoken answer once they finish speaking.
 *
 * Copies liveTranscript → finalTranscript, marks isSpeaking = false,
 * then delegates to the existing recordAnswer() to persist in answerHistory.
 * No answer storage is duplicated.
 *
 * @param {number|string} interviewId
 * @param {string}        finalTranscript — the definitive final transcript from STT
 * @returns {InterviewState|null}
 */
function finishSpeaking(interviewId, finalTranscript) {
  if (!interviewId) return null
  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] finishSpeaking: interview ${interviewId} not found — skipped`)
    return null
  }

  const text  = typeof finalTranscript === 'string' ? finalTranscript : existing.liveTranscript
  const nowMs = Date.now()

  const speechDurationMs = existing.speechStartedAt
    ? nowMs - existing.speechStartedAt
    : existing.speechDurationMs || 0

  // Seal the transcript fields
  const sealed = Object.assign({}, existing, {
    finalTranscript:  text,
    liveTranscript:   text,
    isSpeaking:       false,
    speechDurationMs,
    lastSpeechAt:     nowMs,
    lastUpdatedAt:    new Date(nowMs).toISOString(),
  })
  _store.set(_key(interviewId), sealed)

  // Delegate to existing recordAnswer — single source of truth for answer history
  return recordAnswer(interviewId, text)
}

// ---------------------------------------------------------------------------
// ── Phase 2 Part 2: Background Context Builder ───────────────────────────────
// ---------------------------------------------------------------------------

/**
 * Rebuild the lightweight live context from the latest transcript text.
 *
 * This is fully deterministic — no AI, no Gemini, no network calls.
 * Runs synchronously on every partial transcript update.
 *
 * Returns a fresh liveContext object merging the previous context
 * with newly discovered information.
 *
 * @param {string} text            — the current liveTranscript text
 * @param {object} existingContext — the previous liveContext object
 * @returns {object} updated liveContext
 */
function _buildLiveContext(text, existingContext) {
  const safe = typeof text === 'string' ? text : ''

  const technologies  = _extractTechnologies(safe)
  const keywords      = _extractKeywords(safe)
  const lastTopic     = _extractLastTopic(safe)
  const answerLength  = _classifyAnswerLength(_countWords(safe))

  // Merge discovered technologies (union, deduplicated, order-preserved)
  const prevTechs   = Array.isArray(existingContext?.mentionedTechnologies)
    ? existingContext.mentionedTechnologies
    : []
  const mergedTechs = _union(prevTechs, technologies)

  // Merge keywords (union, deduplicated)
  const prevKeys      = Array.isArray(existingContext?.mentionedKeywords)
    ? existingContext.mentionedKeywords
    : []
  const mergedKeywords = _union(prevKeys, keywords)

  return {
    mentionedTechnologies: mergedTechs,
    mentionedKeywords:     mergedKeywords,
    lastMentionedTopic:    lastTopic || existingContext?.lastMentionedTopic || null,
    estimatedAnswerLength: answerLength,
  }
}

// ---------------------------------------------------------------------------
// ── Context builder helpers ──────────────────────────────────────────────────
// ---------------------------------------------------------------------------

/**
 * Curated list of technology / framework / language names to match against.
 * Normalised to lowercase for case-insensitive comparison.
 * Extend this list as the platform grows.
 */
const _TECH_TERMS = new Set([
  // Languages
  'python', 'javascript', 'typescript', 'java', 'kotlin', 'swift', 'c', 'c++',
  'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'scala', 'r', 'matlab',
  'bash', 'shell', 'sql', 'nosql',
  // Web
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'remix',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite', 'babel',
  // Backend / runtimes
  'node', 'node.js', 'nodejs', 'express', 'fastapi', 'django', 'flask',
  'spring', 'spring boot', 'rails', 'laravel', 'graphql', 'rest', 'grpc',
  // Databases
  'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'cassandra',
  'dynamodb', 'elasticsearch', 'firebase', 'supabase', 'prisma', 'sequelize',
  // Cloud / DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform',
  'ansible', 'jenkins', 'github actions', 'ci/cd', 'linux', 'nginx',
  // AI / ML
  'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'scikit', 'pandas',
  'numpy', 'huggingface', 'langchain', 'gemini', 'openai', 'llm', 'nlp',
  'machine learning', 'deep learning', 'neural network',
  // Architecture
  'microservices', 'monolith', 'serverless', 'event-driven', 'message queue',
  'kafka', 'rabbitmq', 'websocket', 'api gateway', 'load balancer', 'cdn',
  // Concepts
  'oop', 'functional', 'solid', 'dry', 'tdd', 'bdd', 'agile', 'scrum',
  'git', 'github', 'gitlab', 'bitbucket',
])

/** Stop-words to exclude from keyword extraction. */
const _STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'that', 'this',
  'these', 'those', 'it', 'its', 'i', 'we', 'you', 'he', 'she', 'they',
  'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his', 'their',
  'what', 'when', 'where', 'why', 'how', 'which', 'who', 'so', 'as',
  'if', 'then', 'than', 'because', 'while', 'although', 'however',
  'also', 'just', 'very', 'about', 'like', 'use', 'used', 'using',
  'basically', 'essentially', 'actually', 'typically', 'generally',
])

/**
 * Extract technology names mentioned in the transcript.
 * Case-insensitive, whole-word matching.
 *
 * @param {string} text
 * @returns {string[]} matched technology names (lowercase, deduplicated)
 */
function _extractTechnologies(text) {
  const lower   = text.toLowerCase()
  const matched = []

  for (const term of _TECH_TERMS) {
    // Whole-word boundary match (works for single and multi-word terms)
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex   = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i')
    if (regex.test(lower) && !matched.includes(term)) {
      matched.push(term)
    }
  }
  return matched
}

/**
 * Extract meaningful non-stop-word tokens from the transcript.
 * Returns up to 30 unique keywords, longest first.
 *
 * @param {string} text
 * @returns {string[]}
 */
function _extractKeywords(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !_STOP_WORDS.has(t))

  const unique = [...new Set(tokens)]
  return unique
    .sort((a, b) => b.length - a.length)
    .slice(0, 30)
}

/**
 * Identify the last meaningful word/token mentioned — used as a rough
 * proxy for "last topic discussed" without any AI reasoning.
 *
 * @param {string} text
 * @returns {string|null}
 */
function _extractLastTopic(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 4 && !_STOP_WORDS.has(t))

  return tokens.length > 0 ? tokens[tokens.length - 1] : null
}

/**
 * Classify the candidate's answer length into a named tier.
 *
 * @param {number} wordCount
 * @returns {'short'|'medium'|'long'|'very_long'}
 */
function _classifyAnswerLength(wordCount) {
  if (wordCount < 20)  return 'short'
  if (wordCount < 60)  return 'medium'
  if (wordCount < 150) return 'long'
  return 'very_long'
}

/**
 * Count the number of words in a string.
 *
 * @param {string} text
 * @returns {number}
 */
function _countWords(text) {
  if (!text || !text.trim()) return 0
  return text.trim().split(/\s+/).length
}

/**
 * Return the union of two arrays, preserving order and deduplicating.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string[]}
 */
function _union(a, b) {
  const seen = new Set(a)
  const result = [...a]
  for (const item of b) {
    if (!seen.has(item)) {
      seen.add(item)
      result.push(item)
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Internal Phase 1 helper (unchanged)
// ---------------------------------------------------------------------------

/**
 * Map a questionType string to the correct metadata counter key.
 * Returns null for unknown types (counter simply not incremented).
 *
 * @param {string} questionType
 * @returns {string|null}
 */
function _questionTypeToMetaKey(questionType) {
  const map = {
    technical:    'technicalQuestions',
    coding:       'codingQuestions',
    behavioral:   'behavioralQuestions',
    project:      'projectQuestions',
    hr:           'hrQuestions',
    aptitude:     'aptitudeQuestions',
    system_design:'systemDesignQuestions',
    resume:       null,
  }
  return map[questionType] !== undefined ? map[questionType] : null
}

// ---------------------------------------------------------------------------
// ── Phase 3: Reasoning result storage ───────────────────────────────────────
// ---------------------------------------------------------------------------

/**
 * Store a completed background reasoning result inside the interview state.
 *
 * Called exclusively by backgroundReasoner.js after Gemini responds.
 * Applies the revision guard: the result is only written when
 * `revisionStarted` still matches the current `transcriptRevision`.
 * If the candidate has spoken more words since the task was launched,
 * the result is obsolete and is silently discarded.
 *
 * @param {number|string} interviewId
 * @param {number}        revisionStarted  — revision captured when the task launched
 * @param {object}        result           — structured JSON from Gemini
 * @returns {boolean} true if stored, false if discarded as obsolete
 */
function storeReasoningResult(interviewId, revisionStarted, result) {
  if (!interviewId || result == null) return false

  const existing = _store.get(_key(interviewId))
  if (!existing) {
    console.warn(`[InterviewBrain] storeReasoningResult: interview ${interviewId} not found — discarded`)
    return false
  }

  // Revision guard — discard if transcript has advanced since task launch
  if (existing.transcriptRevision !== revisionStarted) {
    console.log(
      `[InterviewBrain] Reasoning result obsolete for interview ${interviewId}` +
      ` (started at r${revisionStarted}, current r${existing.transcriptRevision}) — discarded`
    )
    return false
  }

  const now = new Date().toISOString()
  const updated = Object.assign({}, existing, {
    backgroundReasoning: {
      latestRevision:         revisionStarted,
      latestResult:           result,
      lastReasoningStarted:   existing.backgroundReasoning?.lastReasoningStarted || now,
      lastReasoningCompleted: now,
      reasoningInProgress:    false,
    },
    lastUpdatedAt: now,
  })

  _store.set(_key(interviewId), updated)
  console.log(`[InterviewBrain] Reasoning result stored for interview ${interviewId} (r${revisionStarted})`)
  return true
}

/**
 * Mark that a background reasoning task has been launched for an interview.
 * Sets reasoningInProgress = true and records lastReasoningStarted.
 * Called by backgroundReasoner.js before the Gemini request is fired.
 *
 * @param {number|string} interviewId
 * @returns {void}
 */
function markReasoningStarted(interviewId) {
  if (!interviewId) return
  const existing = _store.get(_key(interviewId))
  if (!existing) return

  const now = new Date().toISOString()
  const updated = Object.assign({}, existing, {
    backgroundReasoning: Object.assign({}, existing.backgroundReasoning, {
      lastReasoningStarted: now,
      reasoningInProgress:  true,
    }),
    lastUpdatedAt: now,
  })
  _store.set(_key(interviewId), updated)
}

/**
 * Mark that all background reasoning tasks have finished (or failed) for an interview.
 * Sets reasoningInProgress = false without overwriting latestResult.
 * Called by backgroundReasoner.js in its finally block.
 *
 * @param {number|string} interviewId
 * @returns {void}
 */
function markReasoningFinished(interviewId) {
  if (!interviewId) return
  const existing = _store.get(_key(interviewId))
  if (!existing) return

  const updated = Object.assign({}, existing, {
    backgroundReasoning: Object.assign({}, existing.backgroundReasoning, {
      reasoningInProgress: false,
    }),
    lastUpdatedAt: new Date().toISOString(),
  })
  _store.set(_key(interviewId), updated)
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Phase 1
  createInterviewState,
  getInterviewState,
  updateInterviewState,
  recordQuestion,
  recordAnswer,
  clearInterview,
  activeInterviewCount,

  // Phase 2 — Streaming transcript
  startSpeaking,
  updatePartialTranscript,
  finishSpeaking,

  // Phase 3 — Background reasoning result storage
  storeReasoningResult,
  markReasoningStarted,
  markReasoningFinished,
}
