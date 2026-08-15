'use strict'

/**
 * interviewStrategy.js
 *
 * Phase 4 — Interview Strategy Manager.
 *
 * Deterministic, AI-free module that maintains a per-interview strategy object.
 * The strategy describes the current shape, balance, progress, and direction
 * of an interview based entirely on the data already present in the
 * Interview Brain.
 *
 * Responsibilities:
 *   - Track which topics / question types have been covered.
 *   - Count questions per type (technical, coding, behavioral, hr, etc.).
 *   - Track difficulty progression.
 *   - Estimate overall interview progress as a percentage.
 *   - Suggest the next question topic based on coverage gaps and balance rules.
 *   - Report whether the current question balance is healthy.
 *   - Expose the strategy to the Conversation Engine and future consumers.
 *
 * This module intentionally does NOT:
 *   - Call Gemini or any AI model.
 *   - Generate interview questions.
 *   - Modify any Brain state.
 *   - Access PostgreSQL.
 *   - Perform scoring or evaluation.
 *   - Implement conversation decisions.
 *
 * @module interviewStrategy
 */

const brain = require('./interviewBrain')

// ---------------------------------------------------------------------------
// In-memory strategy store  (interviewId → StrategyState)
// ---------------------------------------------------------------------------

/** @type {Map<string, StrategyState>} */
const _strategyStore = new Map()

// ---------------------------------------------------------------------------
// Balance targets
// Defines the ideal percentage of each question type for a well-rounded interview.
// Adjusted based on interviewType at initialisation time.
// ---------------------------------------------------------------------------

/**
 * Default balance targets (fractions, must sum to 1.0).
 * Used for 'mixed' interview type.
 */
const DEFAULT_BALANCE = {
  technical:    0.40,
  coding:       0.20,
  behavioral:   0.20,
  project:      0.10,
  hr:           0.05,
  aptitude:     0.00,
  system_design: 0.05,
  resume:       0.00,
}

/**
 * Balance overrides per interview type.
 * Each entry overrides only the keys that differ from DEFAULT_BALANCE.
 */
const BALANCE_BY_TYPE = {
  technical:    { technical: 0.55, coding: 0.25, behavioral: 0.10, project: 0.05, hr: 0.05, system_design: 0.00 },
  coding:       { coding: 0.60, technical: 0.25, behavioral: 0.10, hr: 0.05, system_design: 0.00 },
  behavioral:   { behavioral: 0.55, hr: 0.15, technical: 0.15, project: 0.10, coding: 0.05 },
  hr:           { hr: 0.50, behavioral: 0.30, project: 0.15, technical: 0.05 },
  system_design:{ system_design: 0.50, technical: 0.30, behavioral: 0.10, coding: 0.10 },
  mixed:        DEFAULT_BALANCE,
  aptitude:     { aptitude: 0.50, technical: 0.30, behavioral: 0.15, hr: 0.05 },
}

// ---------------------------------------------------------------------------
// Difficulty progression curve
// The ideal difficulty for question N in an interview of length T.
// ---------------------------------------------------------------------------

/**
 * Topics that map to each question type — used for topic-coverage tracking.
 * A question type contributes to its topic bucket when recorded.
 */
const TYPE_TO_TOPIC = {
  technical:    'technical-concepts',
  coding:       'coding-problems',
  behavioral:   'behavioral-scenarios',
  project:      'project-experience',
  hr:           'hr-culture',
  aptitude:     'aptitude-logic',
  system_design:'system-design',
  resume:       'resume-walkthrough',
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise a fresh strategy for an interview.
 * Must be called once when the interview starts (after Brain.createInterviewState).
 *
 * @param {number|string} interviewId
 * @param {object}        [options]
 * @param {string}        [options.interviewType]  — overrides Brain value if provided
 * @param {string}        [options.difficulty]     — 'easy' | 'medium' | 'hard'
 * @param {number}        [options.totalQuestions]
 * @returns {StrategyState|null}
 */
function initializeStrategy(interviewId, options = {}) {
  if (!interviewId) {
    console.warn('[InterviewStrategy] initializeStrategy: missing interviewId — skipped')
    return null
  }

  const state        = brain.getInterviewState(interviewId)
  const interviewType = (options.interviewType || state?.interviewType || 'mixed').toLowerCase()
  const difficulty    = (options.difficulty    || state?.difficulty    || 'medium').toLowerCase()
  const totalQuestions = options.totalQuestions || state?.totalQuestions || 5

  const targetBalance = _resolveBalance(interviewType)

  const strategy = _buildInitialStrategy({
    interviewId:    String(interviewId),
    interviewType,
    difficulty,
    totalQuestions,
    targetBalance,
  })

  _strategyStore.set(String(interviewId), strategy)
  console.log(`[InterviewStrategy] Strategy initialised for interview ${interviewId} (${interviewType}, ${difficulty})`)
  return strategy
}

/**
 * Read the current Interview Brain state and recompute the strategy.
 * Should be called after every recordQuestion() or recordAnswer().
 *
 * @param {number|string} interviewId
 * @returns {StrategyState|null}
 */
function updateStrategy(interviewId) {
  if (!interviewId) return null

  const existing = _strategyStore.get(String(interviewId))
  if (!existing) {
    console.warn(`[InterviewStrategy] updateStrategy: strategy for interview ${interviewId} not found — skipped`)
    return null
  }

  const brainState = brain.getInterviewState(interviewId)
  if (!brainState) {
    console.warn(`[InterviewStrategy] updateStrategy: brain state for interview ${interviewId} not found — skipped`)
    return null
  }

  const updated = _recompute(existing, brainState)
  _strategyStore.set(String(interviewId), updated)
  return updated
}

/**
 * Return the current strategy for an interview without recomputing.
 *
 * @param {number|string} interviewId
 * @returns {StrategyState|null}
 */
function getStrategy(interviewId) {
  if (!interviewId) return null
  return _strategyStore.get(String(interviewId)) || null
}

/**
 * Reset the strategy for an interview back to its initial state.
 * Useful when a new question set is generated for the same interview.
 *
 * @param {number|string} interviewId
 * @returns {StrategyState|null}
 */
function resetStrategy(interviewId) {
  if (!interviewId) return null
  const existing = _strategyStore.get(String(interviewId))
  if (!existing) return null

  return initializeStrategy(interviewId, {
    interviewType:  existing.interviewType,
    difficulty:     existing.startingDifficulty,
    totalQuestions: existing.totalQuestions,
  })
}

/**
 * Remove the strategy for a completed or abandoned interview.
 *
 * @param {number|string} interviewId
 * @returns {boolean}
 */
function clearStrategy(interviewId) {
  if (!interviewId) return false
  const existed = _strategyStore.has(String(interviewId))
  _strategyStore.delete(String(interviewId))
  if (existed) console.log(`[InterviewStrategy] Strategy cleared for interview ${interviewId}`)
  return existed
}

/**
 * Return the number of active strategy records.
 * @returns {number}
 */
function activeStrategyCount() {
  return _strategyStore.size
}

// ---------------------------------------------------------------------------
// Internal — initial strategy factory
// ---------------------------------------------------------------------------

/**
 * @param {object} params
 * @returns {StrategyState}
 */
function _buildInitialStrategy({ interviewId, interviewType, difficulty, totalQuestions, targetBalance }) {
  const now = new Date().toISOString()
  return {
    interviewId,
    interviewType,
    startingDifficulty: difficulty,
    currentDifficulty:  difficulty,
    totalQuestions,
    lastUpdatedAt:      now,

    // Progress
    questionsAsked:      0,
    questionsAnswered:   0,
    progressPercent:     0,

    // Coverage
    topicsCovered:       [],
    topicsRemaining:     _initialTopicsRemaining(interviewType, targetBalance),

    // Per-type counts (actual)
    typeCounts: {
      technical:    0,
      coding:       0,
      behavioral:   0,
      project:      0,
      hr:           0,
      aptitude:     0,
      system_design:0,
      resume:       0,
    },

    // Target balance (fractions)
    targetBalance,

    // Balance health
    balanceHealthy:      true,
    balanceWarnings:     [],

    // Suggested next direction
    suggestedNextType:   _suggestFirstType(interviewType),
    suggestedNextTopic:  null,

    // Difficulty trajectory
    difficultyProgression: [difficulty],  // grows with each question

    // Follow-up tracking
    followUpCount:       0,
    consecutiveFollowUps:0,
  }
}

// ---------------------------------------------------------------------------
// Internal — recompute from Brain state
// ---------------------------------------------------------------------------

/**
 * Rebuild all derived strategy fields from the current Brain state.
 *
 * @param {StrategyState} existing
 * @param {object}        brainState
 * @returns {StrategyState}
 */
function _recompute(existing, brainState) {
  const qHistory = brainState.questionHistory || []
  const aHistory = brainState.answerHistory   || []
  const meta     = brainState.metadata        || {}
  const total    = existing.totalQuestions

  // Question / answer counts
  const questionsAsked    = qHistory.length
  const questionsAnswered = aHistory.length
  const progressPercent   = total > 0 ? Math.round((questionsAsked / total) * 100) : 0

  // Type counts from Brain metadata (already maintained by Phase 1)
  const typeCounts = {
    technical:    meta.technicalQuestions    || 0,
    coding:       meta.codingQuestions       || 0,
    behavioral:   meta.behavioralQuestions   || 0,
    project:      meta.projectQuestions      || 0,
    hr:           meta.hrQuestions           || 0,
    aptitude:     meta.aptitudeQuestions     || 0,
    system_design:meta.systemDesignQuestions || 0,
    resume:       0,  // not in metadata yet; will be added in a later phase
  }

  // Topics covered / remaining
  const topicsCovered   = _deriveTopicsCovered(qHistory)
  const topicsRemaining = _deriveTopicsRemaining(topicsCovered, existing.targetBalance)

  // Difficulty progression
  const difficultyProgression = _buildDifficultyProgression(qHistory, existing.startingDifficulty)
  const currentDifficulty     = difficultyProgression[difficultyProgression.length - 1] || existing.startingDifficulty

  // Balance health
  const { balanceHealthy, balanceWarnings } = _assessBalance(typeCounts, questionsAsked, existing.targetBalance, total)

  // Suggested next type
  const suggestedNextType  = _suggestNextType(typeCounts, questionsAsked, existing.targetBalance, total)
  const suggestedNextTopic = _suggestNextTopic(topicsRemaining, suggestedNextType)

  // Follow-up tracking
  const followUpCount        = brainState.followUpsAsked || 0
  const consecutiveFollowUps = _countConsecutiveFollowUps(qHistory)

  return Object.assign({}, existing, {
    questionsAsked,
    questionsAnswered,
    progressPercent,
    typeCounts,
    topicsCovered,
    topicsRemaining,
    difficultyProgression,
    currentDifficulty,
    balanceHealthy,
    balanceWarnings,
    suggestedNextType,
    suggestedNextTopic,
    followUpCount,
    consecutiveFollowUps,
    lastUpdatedAt: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the balance target for a given interview type.
 * Falls back to DEFAULT_BALANCE for unknown types.
 *
 * @param {string} interviewType
 * @returns {object}
 */
function _resolveBalance(interviewType) {
  return BALANCE_BY_TYPE[interviewType] || DEFAULT_BALANCE
}

/**
 * Build the initial list of topics remaining based on balance targets.
 * Any type with a target > 0 is included.
 *
 * @param {string} interviewType
 * @param {object} targetBalance
 * @returns {string[]}
 */
function _initialTopicsRemaining(interviewType, targetBalance) {
  return Object.entries(targetBalance)
    .filter(([, frac]) => frac > 0)
    .map(([type]) => TYPE_TO_TOPIC[type])
    .filter(Boolean)
}

/**
 * Derive which topics have been covered from the question history.
 *
 * @param {object[]} questionHistory
 * @returns {string[]}
 */
function _deriveTopicsCovered(questionHistory) {
  const seen = new Set()
  for (const q of questionHistory) {
    const topic = TYPE_TO_TOPIC[q.questionType]
    if (topic) seen.add(topic)
  }
  return [...seen]
}

/**
 * Return topics that have a non-zero target but haven't been covered yet.
 *
 * @param {string[]} covered
 * @param {object}   targetBalance
 * @returns {string[]}
 */
function _deriveTopicsRemaining(covered, targetBalance) {
  const coveredSet = new Set(covered)
  return Object.entries(targetBalance)
    .filter(([, frac]) => frac > 0)
    .map(([type]) => TYPE_TO_TOPIC[type])
    .filter(topic => topic && !coveredSet.has(topic))
}

/**
 * Build the difficulty progression array from the question history.
 * Heuristic: difficulty increases by one tier every 40% of total questions.
 *
 * @param {object[]} questionHistory
 * @param {string}   startingDifficulty
 * @returns {string[]}
 */
function _buildDifficultyProgression(questionHistory, startingDifficulty) {
  const tiers   = ['easy', 'medium', 'hard']
  const start   = tiers.indexOf(startingDifficulty)
  const safeIdx = start === -1 ? 1 : start

  return questionHistory.map((q, i) => {
    const bump  = Math.floor(i / Math.max(1, questionHistory.length) * (tiers.length - safeIdx))
    const level = Math.min(safeIdx + bump, tiers.length - 1)
    return q.difficulty || tiers[level]
  })
}

/**
 * Assess whether the current type distribution is healthy given the target.
 *
 * @param {object} typeCounts
 * @param {number} totalAsked
 * @param {object} targetBalance
 * @param {number} totalPlanned
 * @returns {{ balanceHealthy: boolean, balanceWarnings: string[] }}
 */
function _assessBalance(typeCounts, totalAsked, targetBalance, totalPlanned) {
  if (totalAsked === 0) return { balanceHealthy: true, balanceWarnings: [] }

  const warnings = []

  for (const [type, targetFraction] of Object.entries(targetBalance)) {
    if (targetFraction === 0) continue
    const actual  = (typeCounts[type] || 0) / totalAsked
    const deficit = targetFraction - actual

    // Warn if a type is more than 20 percentage points below its target
    if (deficit > 0.20 && totalAsked >= 3) {
      warnings.push(`${type} under-represented (${Math.round(actual * 100)}% actual vs ${Math.round(targetFraction * 100)}% target)`)
    }
  }

  return { balanceHealthy: warnings.length === 0, balanceWarnings: warnings }
}

/**
 * Suggest the most needed question type based on current vs target distribution.
 *
 * @param {object} typeCounts
 * @param {number} totalAsked
 * @param {object} targetBalance
 * @param {number} totalPlanned
 * @returns {string}
 */
function _suggestNextType(typeCounts, totalAsked, targetBalance, totalPlanned) {
  if (totalAsked === 0) return _firstNonZeroType(targetBalance)

  let maxDeficit = -Infinity
  let bestType   = _firstNonZeroType(targetBalance)

  for (const [type, targetFraction] of Object.entries(targetBalance)) {
    if (targetFraction === 0) continue
    const actual  = (typeCounts[type] || 0) / totalAsked
    const deficit = targetFraction - actual
    if (deficit > maxDeficit) {
      maxDeficit = deficit
      bestType   = type
    }
  }

  return bestType
}

/**
 * Suggest the next specific topic to cover based on remaining topics
 * and the suggested next type.
 *
 * @param {string[]} topicsRemaining
 * @param {string}   suggestedNextType
 * @returns {string|null}
 */
function _suggestNextTopic(topicsRemaining, suggestedNextType) {
  const ideal = TYPE_TO_TOPIC[suggestedNextType]
  if (ideal && topicsRemaining.includes(ideal)) return ideal
  return topicsRemaining[0] || null
}

/**
 * Suggest the first type to ask for a brand new interview.
 *
 * @param {string} interviewType
 * @returns {string}
 */
function _suggestFirstType(interviewType) {
  const openers = {
    technical:    'technical',
    coding:       'technical',
    behavioral:   'behavioral',
    hr:           'hr',
    system_design:'system_design',
    mixed:        'technical',
    aptitude:     'aptitude',
  }
  return openers[interviewType] || 'technical'
}

/**
 * Return the first type with a non-zero target fraction.
 *
 * @param {object} targetBalance
 * @returns {string}
 */
function _firstNonZeroType(targetBalance) {
  for (const [type, frac] of Object.entries(targetBalance)) {
    if (frac > 0) return type
  }
  return 'technical'
}

/**
 * Count how many consecutive follow-up questions appear at the end of history.
 *
 * @param {object[]} questionHistory
 * @returns {number}
 */
function _countConsecutiveFollowUps(questionHistory) {
  let count = 0
  for (let i = questionHistory.length - 1; i >= 0; i--) {
    if (questionHistory[i].questionType === 'followup') count++
    else break
  }
  return count
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  initializeStrategy,
  updateStrategy,
  getStrategy,
  resetStrategy,
  clearStrategy,
  activeStrategyCount,
}
