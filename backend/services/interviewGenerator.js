'use strict'

/**
 * interviewGenerator.js
 *
 * Phase 5 — Decision-Aware Interview Generator.
 *
 * Converts a structured Conversation Engine decision into a natural-language
 * interviewer response by calling Gemini with a compact, action-specific
 * prompt template.
 *
 * Responsibilities:
 *   - Select the correct prompt template based on the decision action.
 *   - Build a minimal context object from Brain + Strategy state.
 *   - Call Gemini to produce ONLY the wording of the interviewer response.
 *   - Parse and validate the response.
 *   - Fall back to the corresponding legacy question text automatically.
 *
 * Latency design:
 *   - Gemini receives ≤350 tokens and produces ≤120 tokens.
 *   - All reasoning, topic planning, and strategy are pre-computed by
 *     Phases 2–4 and consumed here without extra AI calls.
 *
 * This module intentionally does NOT:
 *   - Generate the initial question bank (that is interviewService.generateQuestions).
 *   - Perform scoring or evaluation.
 *   - Decide interview flow (that is conversationEngine).
 *   - Modify Brain state.
 *   - Change any API contract.
 *   - Modify frontend, STT, or TTS.
 *
 * @module interviewGenerator
 */

const llmProvider = require('./llmProvider')
const brain       = require('./interviewBrain')
const strategy    = require('./interviewStrategy')

// ---------------------------------------------------------------------------
// Supported action tokens (must match conversationEngine.js ALLOWED_ACTIONS)
// ---------------------------------------------------------------------------

const SUPPORTED_ACTIONS = new Set([
  'ASK_FOLLOWUP',
  'ASK_CLARIFICATION',
  'GO_DEEPER',
  'CHANGE_TOPIC',
  'ASK_CODING',
  'ASK_BEHAVIORAL',
  'ASK_PROJECT',
  'ASK_HR',
  'ENCOURAGE',
  'MOVE_FORWARD',
  'END_INTERVIEW',
])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate the next interviewer response based on a structured decision.
 *
 * This is the primary entry point for the adaptive interview path.
 *
 * @param {object}        decision                    — from conversationEngine.makeDecision()
 * @param {string}        decision.action             — one of SUPPORTED_ACTIONS
 * @param {string}        [decision.reaction]         — optional warm opener
 * @param {string}        [decision.reason]           — why this action was chosen
 * @param {string|null}   [decision.targetConcept]    — specific concept to target
 * @param {string}        [decision.priority]         — 'high' | 'medium' | 'low'
 * @param {number|string} interviewId                 — the active interview
 * @param {string}        [fallbackText]              — legacy question text to use on failure
 * @returns {Promise<GeneratorResult>}
 */
async function generateResponse(decision, interviewId, fallbackText) {
  // ── Validate decision ──────────────────────────────────────────────────────
  if (!decision || !decision.action || !SUPPORTED_ACTIONS.has(decision.action)) {
    console.warn(`[InterviewGenerator] Invalid or unsupported action "${decision?.action}" — using fallback`)
    return _makeFallbackResult(fallbackText, 'invalid_action')
  }

  if (!interviewId) {
    console.warn('[InterviewGenerator] Missing interviewId — using fallback')
    return _makeFallbackResult(fallbackText, 'missing_interview_id')
  }

  // ── Build context snapshot ─────────────────────────────────────────────────
  const ctx = _buildContext(interviewId, decision)

  // ── Build action-specific prompt ───────────────────────────────────────────
  const prompt = _buildPrompt(decision.action, decision, ctx)

  // ── Call Gemini ────────────────────────────────────────────────────────────
  try {
    const rawText = await _callLLM(prompt)
    const result  = _parseResponse(rawText, decision, ctx)
    console.log(`[InterviewGenerator] Generated response for action ${decision.action} (interview ${interviewId})`)
    return result
  } catch (err) {
    console.warn(`[InterviewGenerator] Generation failed for interview ${interviewId}: ${err.message} — using fallback`)
    return _makeFallbackResult(fallbackText, err.message)
  }
}

/**
 * Check whether a given action string is supported by this generator.
 *
 * @param {string} action
 * @returns {boolean}
 */
function isSupportedAction(action) {
  return typeof action === 'string' && SUPPORTED_ACTIONS.has(action)
}

// ---------------------------------------------------------------------------
// Internal — context builder
// ---------------------------------------------------------------------------

/**
 * Build a minimal, serialisable context object for prompt construction.
 * Reads from Brain and Strategy without modifying either.
 *
 * @param {number|string} interviewId
 * @param {object}        decision
 * @returns {GeneratorContext}
 */
function _buildContext(interviewId, decision) {
  const brainState    = brain.getInterviewState(interviewId)
  const strategyState = strategy.getStrategy(interviewId)

  const reasoning = brainState?.backgroundReasoning?.latestResult || null

  return {
    // Interview identity
    role:          brainState?.role          || 'Software Engineer',
    interviewType: brainState?.interviewType || 'mixed',
    difficulty:    strategyState?.currentDifficulty || brainState?.difficulty || 'medium',

    // Current question
    currentQuestion:     brainState?.currentQuestion     || '',
    currentQuestionType: brainState?.currentQuestionType || 'technical',
    questionNumber:      brainState?.currentQuestionNumber || 1,
    totalQuestions:      brainState?.totalQuestions || 5,

    // Candidate's answer
    transcript: brainState?.finalTranscript || brainState?.liveTranscript || '',
    answerLength: brainState?.liveContext?.estimatedAnswerLength || 'short',

    // Context signals
    mentionedTechnologies: (brainState?.liveContext?.mentionedTechnologies || []).slice(0, 6),
    lastTopic:             brainState?.liveContext?.lastMentionedTopic || null,

    // Reasoning summary (pre-computed by Phase 3)
    missingConcepts:  (reasoning?.missingConcepts  || []).slice(0, 3),
    possibleFollowUp: reasoning?.possibleFollowUp  || null,
    confidence:       reasoning?.confidence        ?? null,

    // Strategy
    suggestedNextType:  strategyState?.suggestedNextType  || 'technical',
    suggestedNextTopic: strategyState?.suggestedNextTopic || null,
    topicsRemaining:    (strategyState?.topicsRemaining   || []).slice(0, 3),
    progressPercent:    strategyState?.progressPercent    || 0,

    // Decision extras
    targetConcept: decision.targetConcept || null,
    reaction:      decision.reaction      || '',
  }
}

// ---------------------------------------------------------------------------
// Internal — prompt template dispatcher
// ---------------------------------------------------------------------------

/**
 * Select and render the correct prompt template for the given action.
 *
 * Each action has its own isolated template — no shared conditional branches.
 *
 * @param {string}           action
 * @param {object}           decision
 * @param {GeneratorContext} ctx
 * @returns {string}
 */
function _buildPrompt(action, decision, ctx) {
  const templates = {
    ASK_FOLLOWUP:     _tplAskFollowup,
    ASK_CLARIFICATION:_tplAskClarification,
    GO_DEEPER:        _tplGoDeeper,
    CHANGE_TOPIC:     _tplChangeTopic,
    ASK_CODING:       _tplAskCoding,
    ASK_BEHAVIORAL:   _tplAskBehavioral,
    ASK_PROJECT:      _tplAskProject,
    ASK_HR:           _tplAskHr,
    ENCOURAGE:        _tplEncourage,
    MOVE_FORWARD:     _tplMoveForward,
    END_INTERVIEW:    _tplEndInterview,
  }

  const template = templates[action]
  if (!template) {
    // Should never reach here given SUPPORTED_ACTIONS guard, but defensive
    return _tplMoveForward(decision, ctx)
  }
  return template(decision, ctx)
}

// ---------------------------------------------------------------------------
// Internal — prompt templates (one per action)
// ---------------------------------------------------------------------------

const _SYSTEM_PREAMBLE = (ctx) =>
  `You are conducting a ${ctx.interviewType} interview for the role of ${ctx.role} (difficulty: ${ctx.difficulty}).
Candidate's last answer: "${ctx.transcript.slice(0, 400)}"
Current question: "${ctx.currentQuestion.slice(0, 200)}"
Progress: Q${ctx.questionNumber}/${ctx.totalQuestions}`

const _OUTPUT_RULE =
  `Respond with the interviewer's spoken words only. Output exactly ONE realistic, concise interview question (maximum 2 sentences). Do NOT add meta-commentary (like "Great! Let's tackle...", "Awesome!", "Sure!"). Do NOT ask the candidate to build or implement entire projects from scratch. Keep it purely verbal, professional, and directly answerable into a microphone.`

function _tplAskFollowup(decision, ctx) {
  const concept = decision.targetConcept || (ctx.missingConcepts[0] ?? 'the concept just mentioned')
  const hint    = ctx.possibleFollowUp   || ''
  return `${_SYSTEM_PREAMBLE(ctx)}
Missing concept the candidate omitted: "${concept}"
${hint ? `Suggested follow-up direction: "${hint}"` : ''}

Generate exactly ONE focused follow-up interview question exploring the candidate's understanding of "${concept}". The question must be direct and interrogative.
${_OUTPUT_RULE}`
}

function _tplAskClarification(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

The candidate's answer was unclear or incomplete. Ask for clarification on the same topic in a natural interviewer voice. Do NOT change the subject.
${_OUTPUT_RULE}`
}

function _tplGoDeeper(decision, ctx) {
  const concept = decision.targetConcept || ctx.lastTopic || 'the topic'
  return `${_SYSTEM_PREAMBLE(ctx)}

The candidate answered adequately. Push deeper into "${concept}" by asking about underlying internals, performance trade-offs, or complex edge cases.
${_OUTPUT_RULE}`
}

function _tplChangeTopic(decision, ctx) {
  const nextTopic = ctx.suggestedNextTopic || ctx.suggestedNextType || 'databases'
  return `${_SYSTEM_PREAMBLE(ctx)}

Transition smoothly and ask ONE concise technical question about: ${nextTopic}.
${_OUTPUT_RULE}`
}

function _tplAskCoding(decision, ctx) {
  const concept = decision.targetConcept || ctx.lastTopic || 'an algorithmic problem'
  return `${_SYSTEM_PREAMBLE(ctx)}

Ask a conceptual problem-solving question about "${concept}" (e.g. data structure choice, algorithmic approach, time/space complexity trade-off). Do NOT ask them to write code from scratch.
${_OUTPUT_RULE}`
}

function _tplAskBehavioral(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

Ask ONE behavioral interview question using the STAR method format (Situation, Task, Action, Result) relevant to a ${ctx.role} role.
${_OUTPUT_RULE}`
}

function _tplAskProject(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

Ask ONE question about how the candidate architected, debugged, or delivered previous projects.
${_OUTPUT_RULE}`
}

function _tplAskHr(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

Ask ONE professional HR or culture-fit question appropriate for a ${ctx.role} role.
${_OUTPUT_RULE}`
}

function _tplEncourage(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

The candidate seems hesitant. Provide a brief encouraging transition and rephrase the question more simply to guide them.
${_OUTPUT_RULE}`
}

function _tplMoveForward(decision, ctx) {
  const nextTopic = ctx.suggestedNextTopic || ctx.suggestedNextType || 'the next topic'
  return `${_SYSTEM_PREAMBLE(ctx)}

The candidate completed their answer. Transition smoothly and ask ONE question about: ${nextTopic}.
${_OUTPUT_RULE}`
}

function _tplEndInterview(decision, ctx) {
  return `${_SYSTEM_PREAMBLE(ctx)}

The interview is complete. Generate a polite, professional closing statement thanking the candidate for their time. Do NOT ask any more questions.
${_OUTPUT_RULE}`
}

// ---------------------------------------------------------------------------
// Internal — Gemini call
// ---------------------------------------------------------------------------

/**
 * Execute the Gemini generation call with the project's key-rotation infrastructure.
 * Uses low maxOutputTokens to keep response compact and latency minimal.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function _callLLM(prompt) {
  const text = await llmProvider.generate(prompt, {
    maxTokens:   200,   // wording only — must stay compact
    temperature: 0.6,   // slightly creative for natural language
  })
  if (!text || !text.trim()) {
    throw new Error('LLM returned empty response')
  }
  return text.trim()
}

// ---------------------------------------------------------------------------
// Internal — response parser
// ---------------------------------------------------------------------------

/**
 * Parse and sanitise the raw Gemini text response.
 * Strips any accidental JSON, markdown, or labels that leak through.
 *
 * @param {string}           rawText
 * @param {object}           decision
 * @param {GeneratorContext} ctx
 * @returns {GeneratorResult}
 */
function _parseResponse(rawText, decision, ctx) {
  // Strip markdown code fences if Gemini adds them despite instructions
  let text = rawText
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/```$/gm, '')
    .trim()

  // Strip any JSON that leaked through (defensive)
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      text = parsed.text || parsed.response || parsed.interviewer || rawText
    } catch {
      // not JSON — keep as-is
    }
  }

  // Remove leading labels like "Interviewer:" or "Response:"
  text = text.replace(/^(interviewer|response|ai|answer)\s*:\s*/i, '')

  // Clamp to 3 sentences maximum
  text = _clampToSentences(text, 3)

  if (!text || text.length < 5) {
    throw new Error('Parsed response too short or empty')
  }

  return {
    text,
    action:        decision.action,
    targetConcept: decision.targetConcept || null,
    priority:      decision.priority      || 'medium',
    source:        'adaptive',
    generatedAt:   new Date().toISOString(),
    _meta: {
      role:           ctx.role,
      questionNumber: ctx.questionNumber,
      difficulty:     ctx.difficulty,
    },
  }
}

// ---------------------------------------------------------------------------
// Internal — fallback builder
// ---------------------------------------------------------------------------

/**
 * Build a fallback GeneratorResult using the legacy question text.
 * Called whenever adaptive generation fails.
 *
 * @param {string|undefined} fallbackText  — the pre-generated question from legacy path
 * @param {string}           reason        — why the fallback was triggered
 * @returns {GeneratorResult}
 */
function _makeFallbackResult(fallbackText, reason) {
  return {
    text:          fallbackText || '',
    action:        'MOVE_FORWARD',
    targetConcept: null,
    priority:      'low',
    source:        'legacy_fallback',
    generatedAt:   new Date().toISOString(),
    fallbackReason: reason,
    _meta:          {},
  }
}

// ---------------------------------------------------------------------------
// Internal — text utilities
// ---------------------------------------------------------------------------

/**
 * Clamp text to at most `maxSentences` sentences.
 * Splits on sentence-ending punctuation.
 *
 * @param {string} text
 * @param {number} maxSentences
 * @returns {string}
 */
function _clampToSentences(text, maxSentences) {
  // Split on '. ', '? ', '! ' boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  return sentences.slice(0, maxSentences).join(' ').trim()
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  generateResponse,
  isSupportedAction,
}
