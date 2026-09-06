'use strict'

/**
 * backend/services/feedbackService.js
 *
 * Module 7 — AI Feedback Generation
 *
 * Generates structured, evidence-based narrative feedback from the
 * completed Module 7 scoring data.
 *
 * Five required output sections:
 *   1. strengths               — specific strengths backed by actual scores/signals
 *   2. weaknesses              — specific weak areas backed by actual scores/signals
 *   3. improvementSuggestions  — actionable steps, one per weakness
 *   4. practiceRecommendations — concrete practice activities
 *   5. learningResources       — topic/resource-type pairs (NO fabricated URLs)
 *
 * Design principles:
 *   - Reuses existing llmProvider.generate() (Ollama/Gemini)
 *   - Reuses extractFirstJson / safe-parse pattern from interviewService.js
 *   - Never crashes interview completion (all errors are non-fatal)
 *   - Never fabricates output when LLM fails
 *   - LLM cannot override numerical scores (scoringEngine owns numbers)
 *   - Returns null on failure so callers can preserve existing data
 */

const llmProvider = require('./llmProvider')

// ---------------------------------------------------------------------------
// JSON extraction helpers (mirrors interviewService.js pattern exactly)
// ---------------------------------------------------------------------------

function extractFirstJson(text) {
  if (!text || typeof text !== 'string') return null
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  let startIdx = -1
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (ch === '[' || ch === '{') { startIdx = i; break }
  }
  if (startIdx === -1) return null

  const stack = []
  let inString = false
  let isEscaped = false
  let endIdx = -1

  for (let i = startIdx; i < cleaned.length; i++) {
    const char = cleaned[i]
    if (inString) {
      if (isEscaped) { isEscaped = false }
      else if (char === '\\') { isEscaped = true }
      else if (char === '"') { inString = false }
      continue
    }
    if (char === '"') { inString = true; continue }
    if (char === '{' || char === '[') { stack.push(char) }
    else if (char === '}' || char === ']') {
      if (stack.length === 0) break
      const top = stack[stack.length - 1]
      if ((char === '}' && top === '{') || (char === ']' && top === '[')) {
        stack.pop()
        if (stack.length === 0) { endIdx = i; break }
      } else { break }
    }
  }

  if (endIdx === -1) return null
  let candidate = cleaned.slice(startIdx, endIdx + 1)
  candidate = candidate.replace(/,\s*([}\]])/g, '$1')
  return candidate
}

function parseFeedbackJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null
  const extracted = extractFirstJson(rawText) || rawText.trim()
  try {
    return JSON.parse(extracted)
  } catch (err) {
    console.error('[FeedbackService] JSON parse failed:', err.message)
    console.error('[FeedbackService] Raw (first 400 chars):', rawText.slice(0, 400))
    return null
  }
}

// ---------------------------------------------------------------------------
// Prompt assembly helpers
// ---------------------------------------------------------------------------

function fmtScore(v) {
  return (typeof v === 'number' && isFinite(v)) ? `${v}/100` : 'N/A'
}

function fmtPct(v, label) {
  if (typeof v !== 'number' || !isFinite(v)) return null
  return `${v}% ${label}`
}

/**
 * Build the evidence block that the LLM receives.
 * Only includes metrics that are actually available — never invents values.
 */
function buildEvidenceBlock({ module7, evaluation, speechSummary, cvAnalysis, role, interviewType }) {
  const m7 = module7 || {}
  const cat = m7.communication || m7.confidence || m7.technicalRelevance || m7.professionalism
    ? m7 : null

  const lines = []

  // ── Role context ──────────────────────────────────────────────────────────
  lines.push(`Role: ${role || 'Not specified'}`)
  lines.push(`Interview type: ${interviewType || 'Not specified'}`)

  // ── Module 7 scored results ───────────────────────────────────────────────
  lines.push('\nModule 7 Scored Results (these are the authoritative numerical scores):')
  if (cat) {
    const comm = cat ? m7.communication  : null
    const conf = cat ? m7.confidence     : null
    const tech = cat ? m7.technicalRelevance : null
    const prof = cat ? m7.professionalism : null
    lines.push(`  Communication (30%):       ${fmtScore(comm?.score)}`)
    lines.push(`  Confidence (25%):          ${fmtScore(conf?.score)}`)
    lines.push(`  Technical Relevance (30%): ${fmtScore(tech?.score)}`)
    lines.push(`  Professionalism (15%):     ${fmtScore(prof?.score)}`)
    lines.push(`  Overall score:             ${fmtScore(m7.overallScore)}`)
    lines.push(`  Performance rating:        ${m7.performanceRating || 'N/A'}`)
    // Source transparency — helps LLM understand which sub-signals drove each score
    if (conf?.cvWeightPct != null)
      lines.push(`  Confidence: ${conf.cvWeightPct}% from behavioural CV data, ${100 - conf.cvWeightPct}% from LLM estimate`)
    if (conf?.sources?.length)
      lines.push(`  Confidence sources: ${conf.sources.join(', ')}`)
    if (prof?.sources?.length)
      lines.push(`  Professionalism sources: ${prof.sources.join(', ')}`)
  } else {
    lines.push('  (Module 7 scores not yet available)')
  }

  // ── LLM evaluation category scores ───────────────────────────────────────
  const cs = evaluation?.category_scores
  if (cs) {
    lines.push('\nLLM Interview Evaluation Scores:')
    if (cs.technical       > 0) lines.push(`  Technical:       ${fmtScore(cs.technical)}`)
    if (cs.communication   > 0) lines.push(`  Communication:   ${fmtScore(cs.communication)}`)
    if (cs.problem_solving > 0) lines.push(`  Problem Solving: ${fmtScore(cs.problem_solving)}`)
    if (cs.confidence      > 0) lines.push(`  Confidence:      ${fmtScore(cs.confidence)}`)
    if (cs.grammar         > 0) lines.push(`  Grammar:         ${fmtScore(cs.grammar)}`)
  }

  // ── Speech analysis ───────────────────────────────────────────────────────
  const sp = speechSummary
  if (sp && (sp.answers_analysed > 0 || sp.avg_communication_score != null)) {
    lines.push('\nObjective Speech & Communication Analysis:')
    if (sp.avg_words_per_minute != null)
      lines.push(`  Speaking pace: ${sp.avg_words_per_minute} wpm (${sp.dominant_pace || 'N/A'})`)
    if (sp.avg_filler_rate != null)
      lines.push(`  Filler word rate: ${sp.avg_filler_rate}% of spoken words`)
    if (sp.avg_grammar_score != null)
      lines.push(`  Grammar score (measured): ${fmtScore(sp.avg_grammar_score)}`)
    if (sp.avg_communication_score != null)
      lines.push(`  Communication score (speech-measured): ${fmtScore(sp.avg_communication_score)}`)
    if (sp.answers_analysed != null)
      lines.push(`  Answers with speech data: ${sp.answers_analysed} of ${sp.total_answers || '?'}`)
  }

  // ── CV / behavioural analysis ─────────────────────────────────────────────
  const cv = cvAnalysis
  if (cv && (cv.engagement_estimate != null || cv.confidence_indicator != null)) {
    lines.push('\nBehavioural / CV Analysis:')
    if (cv.engagement_estimate  != null) lines.push(`  Engagement estimate: ${Math.round(cv.engagement_estimate * 100)}%`)
    if (cv.confidence_indicator != null) lines.push(`  Confidence indicator: ${Math.round(cv.confidence_indicator * 100)}%`)
    if (cv.attention_score      != null) lines.push(`  Attention score: ${Math.round(cv.attention_score * 100)}%`)
    if (cv.eye_contact_pct      != null) lines.push(`  Eye contact: ${cv.eye_contact_pct.toFixed(1)}%`)
    if (cv.face_detection_rate  != null) lines.push(`  Face detection rate: ${Math.round(cv.face_detection_rate * 100)}%`)
    if (cv.warning_count        != null) lines.push(`  Interview etiquette warnings: ${cv.warning_count}`)
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildFeedbackPrompt(evidenceBlock) {
  return `You are an expert technical interview assessor providing structured post-interview feedback.

Your job is to generate specific, evidence-based feedback for this candidate using ONLY the data provided below.

STRICT RULES:
- Every point in strengths and weaknesses MUST reference a specific score, signal, or measured metric.
- Do NOT invent performance observations that are not supported by the data.
- Do NOT generate generic praise like "Great job!" or "Keep up the good work!".
- Do NOT recalculate or override the numerical scores — they are fixed.
- Do NOT make medical or psychological claims.
- Do NOT make hiring decisions.
- Do NOT fabricate URLs, course names, or resource links.
- For learningResources, return topic + resourceType + reason — NEVER a URL.
- Keep all arrays concise (3–5 items each, except learningResources which can have 2–4).
- improvementSuggestions must be actionable and directly correspond to weaknesses (one per weakness).
- practiceRecommendations must be concrete activities derived from the improvement areas.
- Return ONLY valid JSON. No markdown fences, no explanations before or after.

Candidate Performance Data:
${evidenceBlock}

Return exactly this JSON structure (no extra keys, no markdown):
{
  "strengths": [
    "Specific strength based on an actual high-scoring metric"
  ],
  "weaknesses": [
    "Specific weakness based on an actual low-scoring metric"
  ],
  "improvementSuggestions": [
    "Actionable step directly addressing a listed weakness"
  ],
  "practiceRecommendations": [
    "Concrete practice activity derived from the improvement areas"
  ],
  "learningResources": [
    {
      "topic": "Topic area to study",
      "resourceType": "Resource type (e.g. Practice problems, Video tutorials, Book, Online course)",
      "reason": "Brief reason tied to a specific measured weak area"
    }
  ]
}`
}

// ---------------------------------------------------------------------------
// Output validation & normalisation
// ---------------------------------------------------------------------------

const SAFE_STRING_ARRAY = (v) =>
  Array.isArray(v) ? v.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()) : []

const SAFE_RESOURCE_ARRAY = (v) => {
  if (!Array.isArray(v)) return []
  return v.filter(r => r && typeof r === 'object' && r.topic && r.resourceType && r.reason)
    .map(r => ({
      topic:        String(r.topic || '').trim(),
      resourceType: String(r.resourceType || '').trim(),
      reason:       String(r.reason || '').trim(),
    }))
    // Safety: reject any entry that looks like it contains a URL
    .filter(r => !/https?:\/\//i.test(r.topic + r.resourceType + r.reason))
}

function normaliseParsed(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const strengths              = SAFE_STRING_ARRAY(parsed.strengths)
  const weaknesses             = SAFE_STRING_ARRAY(parsed.weaknesses)
  const improvementSuggestions = SAFE_STRING_ARRAY(parsed.improvementSuggestions)
  const practiceRecommendations = SAFE_STRING_ARRAY(parsed.practiceRecommendations)
  const learningResources      = SAFE_RESOURCE_ARRAY(parsed.learningResources)
  // Require at least strengths or weaknesses to consider the result valid
  if (strengths.length === 0 && weaknesses.length === 0) return null
  return { strengths, weaknesses, improvementSuggestions, practiceRecommendations, learningResources }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate Module 7 narrative feedback from scored interview data.
 *
 * @param {object} params
 * @param {object} params.module7            — result of scoringEngine.computeModule7Scores()
 * @param {object} params.evaluation         — result of interviewService.evaluateAnswers()
 * @param {object} params.speechSummary      — aggregated speech summary object (may be null)
 * @param {object} params.cvAnalysis         — CV analysis row from DB (may be null)
 * @param {string} params.role               — interview role
 * @param {string} params.interviewType      — interview type
 *
 * @returns {Promise<object|null>}
 *   Object with {strengths, weaknesses, improvementSuggestions, practiceRecommendations, learningResources}
 *   OR null if generation or parsing failed (caller must not store null as fake feedback)
 */
async function generateFeedback({ module7, evaluation, speechSummary, cvAnalysis, role, interviewType }) {
  try {
    const evidenceBlock = buildEvidenceBlock({ module7, evaluation, speechSummary, cvAnalysis, role, interviewType })
    const prompt        = buildFeedbackPrompt(evidenceBlock)

    let rawText
    try {
      rawText = await llmProvider.generate(prompt, { maxTokens: 3000, temperature: 0.3 })
    } catch (llmErr) {
      console.error('[FeedbackService] LLM call failed — feedback will be unavailable:', llmErr.message)
      return null
    }

    const parsed     = parseFeedbackJson(rawText)
    const normalised = normaliseParsed(parsed)

    if (!normalised) {
      console.error('[FeedbackService] LLM output could not be normalised — feedback will be unavailable')
      console.error('[FeedbackService] Raw (first 500 chars):', (rawText || '').slice(0, 500))
      return null
    }

    console.log(
      `[FeedbackService] Generated — strengths=${normalised.strengths.length} ` +
      `weaknesses=${normalised.weaknesses.length} ` +
      `suggestions=${normalised.improvementSuggestions.length} ` +
      `practice=${normalised.practiceRecommendations.length} ` +
      `resources=${normalised.learningResources.length}`
    )

    return normalised
  } catch (err) {
    console.error('[FeedbackService] Unexpected error — feedback will be unavailable:', err.message)
    return null
  }
}

module.exports = {
  generateFeedback,
  // Exported for unit testing
  _internal: {
    buildEvidenceBlock,
    buildFeedbackPrompt,
    parseFeedbackJson,
    normaliseParsed,
    extractFirstJson,
    SAFE_STRING_ARRAY,
    SAFE_RESOURCE_ARRAY,
  },
}
