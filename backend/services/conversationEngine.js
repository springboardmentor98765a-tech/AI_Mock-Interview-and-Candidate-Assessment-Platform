'use strict'

/**
 * conversationEngine.js
 *
 * Phase 4 — Conversation Decision Engine.
 *
 * Determines what the interviewer should do next by synthesising:
 *   - Interview Brain state (current question, transcript, live context)
 *   - Background Reasoner output (confidence, missing concepts, possible follow-up)
 *   - Interview Strategy (balance, progress, suggested next type)
 *
 * Gemini returns ONLY a structured decision object — not a natural-language
 * interview question.  Producing the actual question text is the responsibility
 * of a future phase.
 *
 * Allowed decision actions:
 *   ASK_FOLLOWUP         — ask a follow-up on the same topic
 *   ASK_CLARIFICATION    — ask the candidate to clarify something
 *   GO_DEEPER            — push the candidate deeper into the current topic
 *   CHANGE_TOPIC         — move to a new topic area
 *   ASK_CODING           — transition to a coding problem
 *   ASK_BEHAVIORAL       — ask a behavioral / situational question
 *   ASK_PROJECT          — ask about the candidate's project experience
 *   ASK_HR               — ask an HR / culture question
 *   ENCOURAGE            — offer brief encouragement before continuing
 *   MOVE_FORWARD         — close this question and move to the next one
 *   END_INTERVIEW        — signal that the interview should conclude
 *
 * This module intentionally does NOT:
 *   - Generate the interviewer's question text
 *   - Modify any Brain state
 *   - Replace the existing interview flow
 *   - Perform final scoring or evaluation
 *   - Implement silence detection
 *   - Modify frontend, STT, or TTS
 *   - Change any API contract
 *
 * @module conversationEngine
 */

const llmProvider = require('./llmProvider')
const brain       = require('./interviewBrain')
const strategy    = require('./interviewStrategy')

// ---------------------------------------------------------------------------
// Allowed action tokens — validated on Gemini response parsing
// ---------------------------------------------------------------------------

const ALLOWED_ACTIONS = new Set([
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

const ALLOWED_PRIORITIES = new Set(['high', 'medium', 'low'])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Make a structured interviewer decision for the given interview.
 *
 * Reads from Brain + Strategy + Background Reasoner, then calls Gemini
 * with a compact prompt and returns the validated decision object.
 *
 * Returns a fallback decision if anything fails — the interview is never
 * disrupted by engine errors.
 *
 * @param {number|string} interviewId
 * @returns {Promise<DecisionResult>}
 */
async function makeDecision(interviewId) {
  if (!interviewId) {
    console.warn('[ConversationEngine] makeDecision: missing interviewId — returning fallback')
    return _fallbackDecision('missing interviewId')
  }

  const brainState      = brain.getInterviewState(interviewId)
  const strategyState   = strategy.getStrategy(interviewId)

  if (!brainState) {
    console.warn(`[ConversationEngine] Brain state not found for interview ${interviewId} — returning fallback`)
    return _fallbackDecision('brain state not found')
  }

  try {
    const snapshot  = _buildSnapshot(brainState, strategyState)
    const prompt    = _buildPrompt(snapshot)
    const rawText   = await _callLLM(prompt)
    const decision  = _parseDecision(rawText, snapshot)
    console.log(`[ConversationEngine] Decision for interview ${interviewId}: ${decision.action} (priority: ${decision.priority})`)
    return decision
  } catch (err) {
    console.warn(`[ConversationEngine] makeDecision failed for interview ${interviewId}: ${err.message}`)
    return _fallbackDecision(err.message)
  }
}

/**
 * Produce a decision using ONLY the pre-computed background reasoning result,
 * without making a new Gemini call.
 *
 * Useful when the background reasoner has already analysed the answer and
 * the engine just needs to convert that into a decision format.
 *
 * Returns null if no background reasoning is available.
 *
 * @param {number|string} interviewId
 * @returns {DecisionResult|null}
 */
function makeLocalDecision(interviewId) {
  if (!interviewId) return null

  const brainState    = brain.getInterviewState(interviewId)
  const strategyState = strategy.getStrategy(interviewId)
  if (!brainState) return null

  const reasoning = brainState.backgroundReasoning?.latestResult
  if (!reasoning) return null

  return _deriveLocalDecision(reasoning, strategyState)
}

// ---------------------------------------------------------------------------
// Internal — input snapshot builder
// ---------------------------------------------------------------------------

/**
 * Build a compact, serialisable snapshot of everything the engine needs.
 * Deliberately excludes full question/answer history to keep prompt size small.
 *
 * @param {object}      brainState
 * @param {object|null} strategyState
 * @returns {EngineSnapshot}
 */
function _buildSnapshot(brainState, strategyState) {
  const reasoning = brainState.backgroundReasoning?.latestResult || null

  return {
    interviewId:      brainState.interviewId,
    role:             brainState.role             || '',
    interviewType:    brainState.interviewType    || 'mixed',
    difficulty:       strategyState?.currentDifficulty || brainState.difficulty || 'medium',

    // Current question
    currentQuestion:     brainState.currentQuestion     || '(no question)',
    currentQuestionType: brainState.currentQuestionType || 'technical',
    questionNumber:      brainState.currentQuestionNumber || 1,

    // Candidate's answer so far
    finalTranscript:  brainState.finalTranscript || brainState.liveTranscript || '',
    wordCount:        brainState.wordCount || 0,
    answerLength:     brainState.liveContext?.estimatedAnswerLength || 'short',

    // Live context signals
    mentionedTechnologies: (brainState.liveContext?.mentionedTechnologies || []).slice(0, 8),
    mentionedKeywords:     (brainState.liveContext?.mentionedKeywords     || []).slice(0, 12),
    lastMentionedTopic:    brainState.liveContext?.lastMentionedTopic    || null,

    // Background reasoning (pre-computed by Phase 3)
    reasoning: reasoning ? {
      confidence:       reasoning.confidence,
      likelyOutcome:    reasoning.likelyOutcome,
      missingConcepts:  (reasoning.missingConcepts || []).slice(0, 3),
      candidateStrength: reasoning.candidateStrength,
      candidateWeakness: reasoning.candidateWeakness,
      possibleFollowUp:  reasoning.possibleFollowUp,
    } : null,

    // Strategy (pre-computed by Phase 4a)
    strategy: strategyState ? {
      progressPercent:     strategyState.progressPercent,
      questionsAsked:      strategyState.questionsAsked,
      totalQuestions:      strategyState.totalQuestions,
      suggestedNextType:   strategyState.suggestedNextType,
      suggestedNextTopic:  strategyState.suggestedNextTopic,
      balanceHealthy:      strategyState.balanceHealthy,
      balanceWarnings:     (strategyState.balanceWarnings || []).slice(0, 2),
      consecutiveFollowUps: strategyState.consecutiveFollowUps || 0,
      topicsRemaining:     (strategyState.topicsRemaining || []).slice(0, 4),
    } : null,
  }
}

// ---------------------------------------------------------------------------
// Internal — compact Gemini prompt
// ---------------------------------------------------------------------------

/**
 * Build the smallest possible prompt that gives Gemini enough context
 * to return a meaningful interviewer decision.
 *
 * @param {EngineSnapshot} snap
 * @returns {string}
 */
function _buildPrompt(snap) {
  const reasoningBlock = snap.reasoning
    ? `Background analysis:
  - Confidence in answer: ${snap.reasoning.confidence}
  - Likely outcome: ${snap.reasoning.likelyOutcome}
  - Missing concepts: ${snap.reasoning.missingConcepts.join(', ') || 'none'}
  - Candidate strength: ${snap.reasoning.candidateStrength || 'n/a'}
  - Candidate weakness: ${snap.reasoning.candidateWeakness || 'none apparent'}
  - Possible follow-up hint: ${snap.reasoning.possibleFollowUp || 'none'}`
    : 'Background analysis: not yet available'

  const strategyBlock = snap.strategy
    ? `Interview strategy:
  - Progress: ${snap.strategy.progressPercent}% (Q${snap.strategy.questionsAsked}/${snap.strategy.totalQuestions})
  - Balance healthy: ${snap.strategy.balanceHealthy}
  - Suggested next type: ${snap.strategy.suggestedNextType}
  - Topics still needed: ${snap.strategy.topicsRemaining.join(', ') || 'none'}
  - Consecutive follow-ups so far: ${snap.strategy.consecutiveFollowUps}`
    : 'Interview strategy: not yet available'

  const transcriptBlock = snap.finalTranscript
    ? `Candidate's answer:\n"${snap.finalTranscript.slice(0, 600)}"`
    : 'Candidate has not answered yet.'

  return `You are the decision engine for an AI interviewer conducting a ${snap.interviewType} interview for the role: ${snap.role}.

Current question (${snap.currentQuestionType}): ${snap.currentQuestion}

${transcriptBlock}

Detected signals: ${snap.mentionedTechnologies.join(', ') || 'none'} | last topic: ${snap.lastMentionedTopic || 'n/a'}

${reasoningBlock}

${strategyBlock}

YOUR TASK: Decide what the interviewer should do NEXT. Do NOT write the question itself. Return ONLY a decision.

RULES:
1. Never ask more than 2 consecutive follow-ups on the same question.
2. If progress > 90% and balance is healthy, prefer MOVE_FORWARD or END_INTERVIEW.
3. If the candidate's answer is very short (< 20 words), prefer ENCOURAGE or ASK_CLARIFICATION.
4. If background analysis shows missing concepts and confidence < 0.6, prefer ASK_FOLLOWUP or GO_DEEPER.
5. If balance is unhealthy, prefer the suggested next type action.
6. Only use END_INTERVIEW when questionsAsked >= totalQuestions.

Allowed actions: ASK_FOLLOWUP, ASK_CLARIFICATION, GO_DEEPER, CHANGE_TOPIC, ASK_CODING, ASK_BEHAVIORAL, ASK_PROJECT, ASK_HR, ENCOURAGE, MOVE_FORWARD, END_INTERVIEW

CRITICAL INSTRUCTION: Return ONLY raw valid JSON. No markdown, no explanation. Response MUST begin with '{' and end with '}'.

Required format:
{
  "reaction": "One warm, natural sentence acknowledging the candidate's answer",
  "action": "ONE_OF_THE_ALLOWED_ACTIONS",
  "reason": "One concise sentence explaining why this action was chosen",
  "targetConcept": "The specific concept or topic this action targets, or null",
  "priority": "high | medium | low"
}`
}

// ---------------------------------------------------------------------------
// Internal — Gemini call
// ---------------------------------------------------------------------------

/**
 * Execute a Gemini call using the project's established key-rotation infrastructure.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function _callLLM(prompt) {
  const text = await llmProvider.generate(prompt, {
    maxTokens:   256,   // decision object only — must stay compact
    temperature: 0.2,   // slightly warmer for natural reaction text
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
 * Parse, validate, and sanitise the raw Gemini JSON response.
 * Falls back to a safe MOVE_FORWARD decision on any parse failure.
 *
 * @param {string}         rawText
 * @param {EngineSnapshot} snap
 * @returns {DecisionResult}
 */
function _parseDecision(rawText, snap) {
  try {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON object found in response')

    const parsed = JSON.parse(match[0])

    const action = typeof parsed.action === 'string' && ALLOWED_ACTIONS.has(parsed.action.toUpperCase())
      ? parsed.action.toUpperCase()
      : 'MOVE_FORWARD'

    const priority = typeof parsed.priority === 'string' && ALLOWED_PRIORITIES.has(parsed.priority.toLowerCase())
      ? parsed.priority.toLowerCase()
      : 'medium'

    return {
      action,
      reaction:      typeof parsed.reaction      === 'string' ? parsed.reaction.slice(0, 300)      : '',
      reason:        typeof parsed.reason        === 'string' ? parsed.reason.slice(0, 200)        : '',
      targetConcept: typeof parsed.targetConcept === 'string' ? parsed.targetConcept.slice(0, 100) : null,
      priority,
      _meta: {
        interviewId:     snap.interviewId,
        questionNumber:  snap.questionNumber,
        generatedAt:     new Date().toISOString(),
        hadReasoning:    snap.reasoning !== null,
        hadStrategy:     snap.strategy  !== null,
      },
    }
  } catch (err) {
    console.warn('[ConversationEngine] Decision parse error:', err.message)
    return _fallbackDecision(err.message)
  }
}

// ---------------------------------------------------------------------------
// Internal — local decision (no Gemini call)
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic decision from the background reasoning result alone.
 * No Gemini call. Used for low-latency contexts.
 *
 * @param {object}      reasoning
 * @param {object|null} strategyState
 * @returns {DecisionResult}
 */
function _deriveLocalDecision(reasoning, strategyState) {
  const { confidence, likelyOutcome, missingConcepts, possibleFollowUp } = reasoning

  const consecutiveFollowUps = strategyState?.consecutiveFollowUps || 0
  const progressPercent      = strategyState?.progressPercent       || 0
  const suggestedNextType    = strategyState?.suggestedNextType      || 'technical'

  // Rule-based local decisions — order matters (most specific first)
  if (progressPercent >= 95) {
    return _makeDecision('MOVE_FORWARD', 'Interview nearing completion.', null, 'low')
  }

  if (consecutiveFollowUps >= 2) {
    return _makeDecision(
      _typeToAction(suggestedNextType),
      'Maximum consecutive follow-ups reached — changing topic.',
      null,
      'high'
    )
  }

  if (confidence < 0.45 && likelyOutcome === 'poor') {
    return _makeDecision('ENCOURAGE', 'Candidate appears to be struggling.', null, 'medium')
  }

  if (confidence < 0.65 && (missingConcepts || []).length > 0 && consecutiveFollowUps < 2) {
    return _makeDecision(
      'ASK_FOLLOWUP',
      'Key concepts missing from answer.',
      missingConcepts[0] || null,
      'high'
    )
  }

  if (confidence >= 0.80 && likelyOutcome === 'good') {
    if (possibleFollowUp && consecutiveFollowUps < 1) {
      return _makeDecision('GO_DEEPER', 'Strong answer — probing further.', null, 'medium')
    }
    return _makeDecision('MOVE_FORWARD', 'Candidate answered well.', null, 'low')
  }

  return _makeDecision('MOVE_FORWARD', 'Proceeding to next question.', null, 'low')
}

// ---------------------------------------------------------------------------
// Internal — decision object factories
// ---------------------------------------------------------------------------

/**
 * @param {string}      action
 * @param {string}      reason
 * @param {string|null} targetConcept
 * @param {string}      priority
 * @returns {DecisionResult}
 */
function _makeDecision(action, reason, targetConcept, priority) {
  return {
    action,
    reaction:      '',
    reason,
    targetConcept: targetConcept || null,
    priority:      priority || 'medium',
    _meta:         { generatedAt: new Date().toISOString(), source: 'local' },
  }
}

/**
 * Safe fallback decision used whenever anything goes wrong.
 *
 * @param {string} reason
 * @returns {DecisionResult}
 */
function _fallbackDecision(reason) {
  return {
    action:        'MOVE_FORWARD',
    reaction:      '',
    reason:        `Fallback decision: ${reason}`,
    targetConcept: null,
    priority:      'low',
    _meta:         { generatedAt: new Date().toISOString(), source: 'fallback' },
  }
}

/**
 * Map a suggested question type string to its corresponding decision action.
 *
 * @param {string} type
 * @returns {string}
 */
function _typeToAction(type) {
  const map = {
    technical:    'CHANGE_TOPIC',
    coding:       'ASK_CODING',
    behavioral:   'ASK_BEHAVIORAL',
    project:      'ASK_PROJECT',
    hr:           'ASK_HR',
    aptitude:     'CHANGE_TOPIC',
    system_design:'CHANGE_TOPIC',
    resume:       'CHANGE_TOPIC',
  }
  return map[type] || 'CHANGE_TOPIC'
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  makeDecision,
  makeLocalDecision,
}
