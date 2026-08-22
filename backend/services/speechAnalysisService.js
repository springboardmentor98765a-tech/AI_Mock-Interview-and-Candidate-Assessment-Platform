'use strict'

/**
 * speechAnalysisService.js
 *
 * Produces structured Speech & Communication Analysis for each answered question.
 *
 * Inputs (all optional/graceful):
 *   - transcript         (string)  — the candidate's spoken answer text
 *   - audioDurationS     (number)  — actual spoken-audio duration in seconds from Whisper
 *   - segmentsMeta       (array)   — [{start, end, text}] per Whisper segment
 *   - questionText       (string)  — the question being answered (for completeness check)
 *   - expectedPoints     (array)   — key concepts expected in the answer
 *
 * Output shape:
 * {
 *   transcript,
 *   word_count, audio_duration_s,
 *   words_per_minute, pace_label,       // "Too Slow|Slow|Normal|Fast|Too Fast|insufficient_data"
 *   filler_count, filler_rate, fillers_found,
 *   grammar_score, grammar_issues,      // from LLM
 *   intelligibility_note,               // proxy only — no phoneme analysis
 *   pronunciation_score,                // "insufficient_audio" or proxy integer
 *   speech_clarity_score,               // derived from measurable signals
 *   response_completeness_score,        // 0-100, from LLM
 *   communication_score,                // combined weighted
 *   strengths, weaknesses, suggestions,
 *   analysis_errors                     // non-empty if any sub-analysis failed
 * }
 *
 * NEVER breaks the interview — all errors are caught and returned in analysis_errors.
 * NEVER fabricates pronunciation scores from Whisper confidence values.
 */

const llmProvider = require('./llmProvider')

// ---------------------------------------------------------------------------
// Filler word detection
// ---------------------------------------------------------------------------

// Each entry is [phrase, minWordLength] — longer phrases checked first to avoid
// false-positives on sub-words (e.g. "like" is NOT in this list because
// "I'd like to explain..." is completely valid English).
const FILLER_PHRASES = [
  'um',
  'uh',
  'uh uh',
  'uhh',
  'umm',
  'hmm',
  'hm',
  'you know',
  'basically',
  'actually',
  'i mean',
  'sort of',
  'kind of',
  'like i said',
  'i guess',
  'i suppose',
  'right so',
  'so yeah',
  'and stuff',
  'and things',
  'et cetera',
  'and so on',
  'you see',
  'i think i think',
  'literally',
  'obviously',
  'clearly',
]

function detectFillers(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return { filler_count: 0, filler_rate: 0, fillers_found: [] }
  }

  // Normalise: lowercase, collapse whitespace, strip punctuation that isn't mid-word
  const normalised = transcript.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim()
  const words = normalised.split(' ')
  const wordCount = words.length

  // Sort longer phrases first so "i mean" is detected before "i"
  const sortedFillers = [...FILLER_PHRASES].sort((a, b) => b.split(' ').length - a.split(' ').length)

  const foundMap = {}

  for (const filler of sortedFillers) {
    const fillerWords = filler.split(' ')
    const fillerLen   = fillerWords.length

    for (let i = 0; i <= words.length - fillerLen; i++) {
      const slice = words.slice(i, i + fillerLen).join(' ')
      if (slice === filler) {
        foundMap[filler] = (foundMap[filler] || 0) + 1
      }
    }
  }

  const fillers_found = Object.entries(foundMap).map(([phrase, count]) => ({ phrase, count }))
  const filler_count  = fillers_found.reduce((s, f) => s + f.count, 0)
  const filler_rate   = wordCount > 0 ? Math.round((filler_count / wordCount) * 100) : 0

  return { filler_count, filler_rate, fillers_found }
}

// ---------------------------------------------------------------------------
// Speaking pace analysis
// ---------------------------------------------------------------------------

const PACE_MIN_WORDS     = 10   // below this, pace is not meaningful
const PACE_MIN_DURATION  = 3    // below this many seconds, rate is not meaningful

function analyzePace(wordCount, audioDurationS) {
  if (
    !wordCount ||
    !audioDurationS ||
    wordCount < PACE_MIN_WORDS ||
    audioDurationS < PACE_MIN_DURATION
  ) {
    return {
      words_per_minute: null,
      pace_label: 'insufficient_data',
    }
  }

  const wpm = Math.round((wordCount / audioDurationS) * 60)

  let pace_label
  if      (wpm < 90)  pace_label = 'Too Slow'
  else if (wpm < 120) pace_label = 'Slow'
  else if (wpm <= 170) pace_label = 'Normal'
  else if (wpm <= 210) pace_label = 'Fast'
  else                 pace_label = 'Too Fast'

  return { words_per_minute: wpm, pace_label }
}

// ---------------------------------------------------------------------------
// Speech clarity score (from measurable signals — no audio waveform needed)
// ---------------------------------------------------------------------------

function computeClarityScore({ fillerRate, paceLabel, wordCount, segmentsMeta }) {
  if (!wordCount || wordCount < 5) return null

  let score = 100

  // Deduct for high filler rate
  if      (fillerRate > 20) score -= 25
  else if (fillerRate > 12) score -= 15
  else if (fillerRate > 6)  score -= 8
  else if (fillerRate > 3)  score -= 3

  // Deduct for extreme pace (comprehension impact)
  if      (paceLabel === 'Too Slow' || paceLabel === 'Too Fast') score -= 20
  else if (paceLabel === 'Slow'     || paceLabel === 'Fast')     score -= 8

  // Deduct for excessive hesitation gaps (long silences between segments)
  if (Array.isArray(segmentsMeta) && segmentsMeta.length >= 2) {
    let longGaps = 0
    for (let i = 1; i < segmentsMeta.length; i++) {
      const gap = segmentsMeta[i].start - segmentsMeta[i - 1].end
      if (gap > 3.0) longGaps++
    }
    if      (longGaps >= 4) score -= 15
    else if (longGaps >= 2) score -= 8
    else if (longGaps >= 1) score -= 3
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ---------------------------------------------------------------------------
// Grammar + response completeness via LLM
// ---------------------------------------------------------------------------

function buildGrammarAndCompletenessPrompt(transcript, questionText, expectedPoints) {
  const epList = Array.isArray(expectedPoints) && expectedPoints.length > 0
    ? expectedPoints.map(p => `- ${p}`).join('\n')
    : '(none specified)'

  return `You are an expert English language evaluator and interview assessor.

Evaluate the following spoken interview answer for grammar quality and response completeness.

IMPORTANT NOTES:
- This is SPOKEN English from a voice interview, not written text. Do NOT penalise:
  * Informal contractions (you're, I've, it's, etc.)
  * Technical terms, API names, framework names, library names, acronyms
  * Minor repetition typical of natural speech
  * Sentence fragments that are conversational
- DO penalise: incorrect subject-verb agreement, wrong tense usage, confused sentence structure, missing articles where clearly wrong, malapropisms.
- Response completeness: did the candidate actually address the question and cover the expected key points?

Interview Question:
"${(questionText || '').replace(/"/g, '\\"')}"

Expected Key Points:
${epList}

Candidate's Spoken Answer:
"${(transcript || '').replace(/"/g, '\\"').slice(0, 1200)}"

CRITICAL INSTRUCTION: Return ONLY raw valid JSON. No markdown, no code fences, no explanations. Response MUST begin with '{' and end with '}'.

Return exactly this structure:
{
  "grammar_score": 85,
  "grammar_issues": [
    { "original": "exact phrase from transcript", "suggestion": "corrected phrase", "type": "tense|agreement|structure|other" }
  ],
  "response_completeness_score": 75,
  "completeness_notes": "One sentence explaining what was addressed and what was missing."
}

Scoring rules:
- grammar_score: integer 0–100. 100 = near-perfect grammar for spoken English. 0 = barely intelligible.
- grammar_issues: list at most 4 genuine issues. Empty array [] if none found.
- response_completeness_score: integer 0–100. 100 = fully addressed the question with all key points. 0 = completely off-topic or no answer.`
}

async function analyzeGrammarAndCompleteness(transcript, questionText, expectedPoints) {
  if (!transcript || transcript.trim().length < 10) {
    return {
      grammar_score: null,
      grammar_issues: [],
      response_completeness_score: null,
      completeness_notes: 'Transcript too short or empty for grammar analysis.',
    }
  }

  const prompt = buildGrammarAndCompletenessPrompt(transcript, questionText, expectedPoints)

  let raw
  try {
    raw = await llmProvider.generate(prompt, { maxTokens: 1024, temperature: 0.1 })
  } catch (llmErr) {
    return {
      grammar_score: null,
      grammar_issues: [],
      response_completeness_score: null,
      completeness_notes: `LLM unavailable: ${llmErr.message}`,
    }
  }

  // Parse LLM JSON response
  try {
    let cleaned = raw.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const startIdx = cleaned.indexOf('{')
    const endIdx   = cleaned.lastIndexOf('}')
    if (startIdx === -1 || endIdx === -1) throw new Error('No JSON object found')
    const jsonStr = cleaned.slice(startIdx, endIdx + 1).replace(/,(\s*[}\]])/g, '$1')
    const parsed  = JSON.parse(jsonStr)

    // NF-02 FIX: use null when the LLM omits a field entirely.
    // Number(undefined) || 0 silently creates a fake 0 score.
    // Explicit null-check: field present (including 0) → clamp; absent → null.
    // parsed.x != null is true for 0, false for undefined/null.
    return {
      grammar_score:               parsed.grammar_score != null
        ? Math.min(100, Math.max(0, Number(parsed.grammar_score)))
        : null,
      grammar_issues:               Array.isArray(parsed.grammar_issues) ? parsed.grammar_issues.slice(0, 6) : [],
      response_completeness_score: parsed.response_completeness_score != null
        ? Math.min(100, Math.max(0, Number(parsed.response_completeness_score)))
        : null,
      completeness_notes:           String(parsed.completeness_notes || ''),
    }
  } catch (parseErr) {
    return {
      grammar_score: null,
      grammar_issues: [],
      response_completeness_score: null,
      completeness_notes: `Could not parse LLM grammar response: ${parseErr.message}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Communication score combinator
// ---------------------------------------------------------------------------
// Weights for communication score:
//   Grammar quality:           30%
//   Response completeness:     35%
//   Speech clarity:            20%
//   Pace penalty/bonus:        15%

function computeCommunicationScore({ grammarScore, completenessScore, clarityScore, paceLabel }) {
  const hasGrammar     = typeof grammarScore === 'number'
  const hasCompleteness = typeof completenessScore === 'number'
  const hasClarity     = typeof clarityScore === 'number'

  if (!hasGrammar && !hasCompleteness && !hasClarity) return null

  let score    = 0
  let totalWt  = 0

  if (hasGrammar) {
    score   += grammarScore * 0.30
    totalWt += 0.30
  }
  if (hasCompleteness) {
    score   += completenessScore * 0.35
    totalWt += 0.35
  }
  if (hasClarity) {
    score   += clarityScore * 0.20
    totalWt += 0.20
  }

  // Pace component (15%): only contribute when we have a real measurement.
  // NF-03 FIX: previously a default of 75 was always added even when pace was
  // 'insufficient_data', fabricating up to ~11 points. Now we only add the pace
  // component (and its weight) when paceLabel is a known valid measurement.
  const VALID_PACE_LABELS = new Set(['Normal', 'Slow', 'Fast', 'Too Slow', 'Too Fast'])
  if (paceLabel && VALID_PACE_LABELS.has(paceLabel)) {
    let paceScore
    if      (paceLabel === 'Normal')   paceScore = 100
    else if (paceLabel === 'Slow')     paceScore = 80
    else if (paceLabel === 'Fast')     paceScore = 75
    else if (paceLabel === 'Too Slow') paceScore = 55
    else                               paceScore = 50  // 'Too Fast'
    score   += paceScore * 0.15
    totalWt += 0.15
  }

  const normalised = totalWt > 0 ? Math.round(score / totalWt) : null
  return Math.min(100, Math.max(0, normalised))
}

// ---------------------------------------------------------------------------
// Strengths / weaknesses / suggestions builder
// ---------------------------------------------------------------------------

function buildStrengthsWeaknessesSuggestions({
  fillerRate, paceLabel, grammarScore, completenessScore, clarityScore, grammarIssues
}) {
  const strengths   = []
  const weaknesses  = []
  const suggestions = []

  // Filler words
  if (fillerRate <= 2)       strengths.push('Very low use of filler words — confident, fluent delivery.')
  else if (fillerRate <= 5)  strengths.push('Minimal filler word usage — speech flows naturally.')
  else if (fillerRate <= 10) weaknesses.push('Moderate filler word usage (um, uh, you know). Aim to pause silently instead.')
  else                        weaknesses.push(`High filler word rate (${fillerRate}% of words). This significantly impacts perceived confidence.`)

  if (fillerRate > 5) suggestions.push('Practice pausing silently instead of using "um" or "uh". Record yourself to build awareness.')

  // Pace
  if (paceLabel === 'Normal') strengths.push('Speaking pace is well-calibrated for clear communication.')
  else if (paceLabel === 'Slow')     { weaknesses.push('Slightly slow speaking pace.'); suggestions.push('Aim for 120–160 words per minute for optimal interview pace.') }
  else if (paceLabel === 'Fast')     { weaknesses.push('Slightly fast speaking pace.'); suggestions.push('Slow down slightly — a measured pace conveys confidence.') }
  else if (paceLabel === 'Too Slow') { weaknesses.push('Speaking pace is too slow, which can lose the interviewer\'s attention.'); suggestions.push('Practice speaking at 120+ WPM.') }
  else if (paceLabel === 'Too Fast') { weaknesses.push('Speaking pace is too fast, reducing clarity.'); suggestions.push('Breathe deliberately between sentences.') }

  // Grammar
  if (typeof grammarScore === 'number') {
    if      (grammarScore >= 90) strengths.push('Excellent spoken grammar and sentence structure.')
    else if (grammarScore >= 75) strengths.push('Good spoken grammar overall with minor imperfections.')
    else if (grammarScore >= 60) weaknesses.push('Some grammar issues — review subject-verb agreement and tense consistency.')
    else                          weaknesses.push('Significant grammar issues that impact professional impression.')
    if (grammarScore < 70)        suggestions.push('Review your grammar issues noted below and practice correcting them in mock answers.')
  }

  // Completeness
  if (typeof completenessScore === 'number') {
    if      (completenessScore >= 85) strengths.push('Answer was comprehensive and covered all key points.')
    else if (completenessScore >= 65) strengths.push('Answer addressed the core of the question.')
    else if (completenessScore >= 45) weaknesses.push('Answer was partially incomplete — some key points were missed.')
    else                               weaknesses.push('Answer did not sufficiently address the question or missed critical points.')
    if (completenessScore < 60) suggestions.push('Structure your answers using the STAR method (Situation, Task, Action, Result) to ensure completeness.')
  }

  return {
    strengths:   strengths.slice(0, 4),
    weaknesses:  weaknesses.slice(0, 4),
    suggestions: suggestions.slice(0, 4),
  }
}

// ---------------------------------------------------------------------------
// Main public function
// ---------------------------------------------------------------------------

/**
 * Analyse speech and communication quality for a single answered question.
 *
 * @param {object} params
 * @param {string}  params.transcript      — the candidate's answer text
 * @param {number}  [params.audioDurationS] — actual spoken audio duration in seconds
 * @param {Array}   [params.segmentsMeta]   — [{start, end, text}] from Whisper
 * @param {string}  [params.questionText]   — the question (for completeness)
 * @param {Array}   [params.expectedPoints] — key points expected in answer
 * @returns {Promise<object>} structured speech analysis (never throws)
 */
async function analyzeAnswer({ transcript, audioDurationS, segmentsMeta, questionText, expectedPoints }) {
  const analysis_errors = []

  // Normalise inputs
  const safeTranscript    = typeof transcript === 'string' ? transcript.trim() : ''
  const safeAudioDuration = typeof audioDurationS === 'number' && audioDurationS > 0 ? audioDurationS : null
  const safeSegments      = Array.isArray(segmentsMeta) ? segmentsMeta : []

  const wordCount = safeTranscript ? safeTranscript.split(/\s+/).filter(Boolean).length : 0

  // ── 1. Filler word detection ─────────────────────────────────────────────
  let fillerResult = { filler_count: 0, filler_rate: 0, fillers_found: [] }
  try {
    fillerResult = detectFillers(safeTranscript)
  } catch (e) {
    analysis_errors.push(`filler_detection: ${e.message}`)
  }

  // ── 2. Speaking pace ─────────────────────────────────────────────────────
  let paceResult = { words_per_minute: null, pace_label: 'insufficient_data' }
  try {
    paceResult = analyzePace(wordCount, safeAudioDuration)
  } catch (e) {
    analysis_errors.push(`pace_analysis: ${e.message}`)
  }

  // ── 3. Speech clarity (signal-based, no audio waveform) ──────────────────
  let clarityScore = null
  try {
    clarityScore = computeClarityScore({
      fillerRate:   fillerResult.filler_rate,
      paceLabel:    paceResult.pace_label,
      wordCount,
      segmentsMeta: safeSegments,
    })
  } catch (e) {
    analysis_errors.push(`clarity_score: ${e.message}`)
  }

  // ── 4. Grammar + completeness via LLM ────────────────────────────────────
  let grammarResult = {
    grammar_score: null,
    grammar_issues: [],
    response_completeness_score: null,
    completeness_notes: '',
  }
  try {
    grammarResult = await analyzeGrammarAndCompleteness(
      safeTranscript,
      questionText || '',
      expectedPoints || []
    )
  } catch (e) {
    analysis_errors.push(`grammar_completeness: ${e.message}`)
  }

  // ── 5. Pronunciation / intelligibility note ───────────────────────────────
  // We do NOT have access to raw audio waveforms or phoneme models at this point.
  // Whisper confidence is NOT a pronunciation score — it reflects model uncertainty
  // about speech-to-text, not articulation quality.
  // We return a clearly-labelled proxy based on the intelligibility signals we do have.
  let pronunciation_score = 'insufficient_audio'
  let intelligibility_note = 'Phoneme-level pronunciation analysis requires dedicated acoustic processing (e.g. Kaldi, Montreal Forced Aligner) which is not available in this pipeline. Score is not computed to avoid fabrication.'

  if (safeAudioDuration && safeAudioDuration >= 3 && wordCount >= 10) {
    // Proxy approach: use clarity signals as an intelligibility proxy.
    // High clarity + low fillers + normal pace → likely intelligible.
    // Labelled explicitly as a PROXY, not a true pronunciation score.
    if (typeof clarityScore === 'number') {
      pronunciation_score = clarityScore
      intelligibility_note =
        'Intelligibility proxy derived from speech clarity signals (filler rate, pace, hesitation gaps). ' +
        'True phoneme-level pronunciation analysis is not available in this pipeline — this score reflects communication clarity, not articulatory precision.'
    }
  }

  // ── 6. Communication score ────────────────────────────────────────────────
  let communicationScore = null
  try {
    communicationScore = computeCommunicationScore({
      grammarScore:      grammarResult.grammar_score,
      completenessScore: grammarResult.response_completeness_score,
      clarityScore,
      paceLabel:         paceResult.pace_label,
    })
  } catch (e) {
    analysis_errors.push(`communication_score: ${e.message}`)
  }

  // ── 7. Strengths / weaknesses / suggestions ───────────────────────────────
  let swResult = { strengths: [], weaknesses: [], suggestions: [] }
  try {
    swResult = buildStrengthsWeaknessesSuggestions({
      fillerRate:       fillerResult.filler_rate,
      paceLabel:        paceResult.pace_label,
      grammarScore:     grammarResult.grammar_score,
      completenessScore: grammarResult.response_completeness_score,
      clarityScore,
      grammarIssues:    grammarResult.grammar_issues,
    })
  } catch (e) {
    analysis_errors.push(`strengths_weaknesses: ${e.message}`)
  }

  return {
    transcript:                    safeTranscript,
    word_count:                    wordCount,
    audio_duration_s:              safeAudioDuration,
    words_per_minute:              paceResult.words_per_minute,
    pace_label:                    paceResult.pace_label,
    filler_count:                  fillerResult.filler_count,
    filler_rate:                   fillerResult.filler_rate,
    fillers_found:                 fillerResult.fillers_found,
    grammar_score:                 grammarResult.grammar_score,
    grammar_issues:                grammarResult.grammar_issues,
    intelligibility_note,
    pronunciation_score,
    speech_clarity_score:          clarityScore,
    response_completeness_score:   grammarResult.response_completeness_score,
    completeness_notes:            grammarResult.completeness_notes,
    communication_score:           communicationScore,
    strengths:                     swResult.strengths,
    weaknesses:                    swResult.weaknesses,
    suggestions:                   swResult.suggestions,
    analysis_errors:               analysis_errors.length > 0 ? analysis_errors : undefined,
  }
}

module.exports = { analyzeAnswer, detectFillers, analyzePace }
