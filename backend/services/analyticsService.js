'use strict'

/**
 * analyticsService.js — Module 8: Dashboard & Analytics
 *
 * Provides reusable analytics query functions for candidate and recruiter dashboards.
 * All scoring data originates from the existing Module 7 scoringEngine outputs stored
 * in interviews.category_scores (JSONB). No secondary scoring logic is introduced here.
 *
 * Key design principles:
 *  - All SQL uses parameterized queries ($1, $2, ...).
 *  - category_scores JSONB is parsed safely; null/missing values are coerced to null.
 *  - Scores are always returned on the canonical 0–100 scale.
 *  - No mock data, no fabricated values.
 *  - Functions return null for missing data rather than placeholder values.
 */

const { pool } = require('../config/database')

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Safely coerce a value to a rounded integer, or return null.
 * @param {*} v
 * @returns {number|null}
 */
function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n)
}

/**
 * Safely extract a float value, or return null.
 * @param {*} v
 * @returns {number|null}
 */
function toFloat(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n * 10) / 10
}

/**
 * Parse a category_scores JSONB object (which may arrive as a plain object or a
 * JSON string from older driver versions) and return null on any failure.
 * @param {*} raw  — DB value from category_scores column
 * @returns {object|null}
 */
function parseCategoryScores(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  if (typeof raw === 'object') return raw
  return null
}

/**
 * Extract the four canonical Module 7 category scores from a parsed category_scores
 * object. Returns null for each category that is missing or not a valid number.
 * @param {object|null} cs  — parsed category_scores
 * @returns {{ communication, confidence, technicalRelevance, professionalism }}
 */
function extractM7Cats(cs) {
  const m7 = cs?.module7_scores
  return {
    communication:      toInt(m7?.communication?.score),
    confidence:         toInt(m7?.confidence?.score),
    technicalRelevance: toInt(m7?.technicalRelevance?.score),
    professionalism:    toInt(m7?.professionalism?.score),
    performanceRating:  m7?.performanceRating || null,
    overallScore:       toInt(m7?.overallScore),
  }
}

/**
 * Compute the arithmetic mean of an array of numbers, ignoring nulls.
 * Returns null when the array is empty or all values are null.
 * @param {Array<number|null>} arr
 * @returns {number|null}
 */
function mean(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && isFinite(v))
  if (valid.length === 0) return null
  return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length)
}

/* ─── Weak-Area Prediction ────────────────────────────────────────────────── */

/**
 * WEAK-AREA RECOMMENDATION LIBRARY
 *
 * Area-specific, targeted recommendations for each canonical Module 7 category.
 * These are selected based on the detected weak area — NOT generic for all candidates.
 */
const WEAK_AREA_RECOMMENDATIONS = {
  communication: [
    'Structure your answers using the STAR method (Situation, Task, Action, Result).',
    'Practise speaking at a measured pace — avoid rushing under pressure.',
    'Reduce filler words (um, uh, like) by pausing briefly to collect your thoughts.',
    'Record yourself answering mock questions and listen for clarity and conciseness.',
    'Aim for direct answers: state your conclusion first, then provide supporting detail.',
  ],
  confidence: [
    'Practice answering questions under a strict time limit to simulate real pressure.',
    'Prepare and rehearse 3–5 strong examples from your past experience.',
    'Avoid hedging language ("I think maybe…") — commit to your answer.',
    'Run timed mock interviews regularly to build familiarity with the format.',
    'Focus on steady, consistent eye contact and upright posture during video sessions.',
  ],
  technicalRelevance: [
    'Review the core technical fundamentals required for your target role.',
    'Practise explaining trade-offs and design decisions, not just solutions.',
    'Work through role-specific technical questions on LeetCode, HackerRank, or similar.',
    'For system design roles: practise diagramming scalable architectures out loud.',
    'Tie your technical answers to real business impact whenever possible.',
  ],
  professionalism: [
    'Organise longer answers with clear signposting ("First… Then… Finally…").',
    'Manage response length: aim for 60–90 seconds per answer, then invite follow-up.',
    'Avoid overly casual language; maintain a professional yet conversational tone.',
    'Research the company and role thoroughly before each interview session.',
    'Follow up every practice session with a brief self-review for improvement areas.',
  ],
}

/**
 * CATEGORY DISPLAY NAMES — maps internal camelCase keys to readable labels.
 */
const CATEGORY_LABELS = {
  communication:      'Communication',
  confidence:         'Confidence',
  technicalRelevance: 'Technical Relevance',
  professionalism:    'Professionalism',
}

/**
 * predictWeakAreas(enriched, latestRole)
 *
 * Module 8 — Weak-Area Prediction
 *
 * Analyses the candidate's historical Module 7 category scores to identify
 * persistent or emerging weak areas. The prediction is:
 *   - DETERMINISTIC  — same data → same output, every time.
 *   - EXPLAINABLE    — every result includes the reason text and exact figures.
 *   - NULL-SAFE      — gracefully handles missing/null category values.
 *   - HISTORY-BASED  — requires real historical data; never fabricates trends.
 *
 * Thresholds and formula (documented for auditability):
 * ─────────────────────────────────────────────────────
 *  LOW_SCORE_THRESHOLD  = 65  — a single category score below this is "weak"
 *  PERSISTENT_COUNT     = 2   — ≥2 low scores = persistent weakness
 *  HIGH_RISK_AVG        = 55  — average below this is "High" risk
 *  HIGH_RISK_RATIO      = 0.75— ≥75% of scores below threshold → High risk
 *  MEDIUM_RISK_RATIO    = 0.50— ≥50% of scores below threshold → Medium risk
 *
 * Risk levels:
 *   High     — average < HIGH_RISK_AVG  OR  (persistent AND declining trend)
 *   Medium   — average < LOW_SCORE_THRESHOLD AND lowScoreCount >= PERSISTENT_COUNT
 *   Emerging — only 1 low score detected; insufficient history for persistence claim
 *
 * Trend (requires ≥2 valid scores):
 *   Computed by comparing the average of the chronologically EARLIER half of scores
 *   against the LATER half (the most recent scores). A difference of >5 points
 *   constitutes a meaningful direction.
 *     Positive diff (later > earlier) → 'improving'
 *     Negative diff (later < earlier) → 'declining'
 *     |diff| ≤ 5                      → 'stable'
 *   Fewer than 2 scores               → 'insufficient_data'
 *
 * @param {Array}       enriched    — array of per-interview enriched objects from
 *                                    getCandidateAnalytics (ASC by completed_at).
 *                                    Each item has: { communication, confidence,
 *                                    technicalRelevance, professionalism, role }
 * @param {string|null} latestRole  — most recent selected_role for context only.
 * @returns {{ status: string, weakAreas: Array }}
 */
function predictWeakAreas(enriched, latestRole) {
  const LOW_SCORE_THRESHOLD = 65
  const PERSISTENT_COUNT    = 2
  const HIGH_RISK_AVG       = 55
  const HIGH_RISK_RATIO     = 0.75
  const TREND_MIN_DELTA     = 5   // points difference needed to call a trend

  const CATEGORIES = ['communication', 'confidence', 'technicalRelevance', 'professionalism']

  // ── Insufficient history guards ──────────────────────────────────────────
  if (!Array.isArray(enriched) || enriched.length === 0) {
    return {
      status: 'no_data',
      message: 'No completed interview history available for weak-area prediction.',
      weakAreas: [],
    }
  }

  // ── Per-category analysis ────────────────────────────────────────────────
  const weakAreas = []
  let categoriesWithData = 0  // how many categories have at least one valid M7 score

  for (const cat of CATEGORIES) {
    // Collect the chronologically-ordered valid scores for this category
    // (null/missing scores from legacy interviews are excluded cleanly)
    const catScores = enriched
      .map(r => r[cat])
      .filter(s => s !== null && s !== undefined && isFinite(Number(s)))
      .map(Number)

    // No Module 7 data at all for this category — skip without penalty
    if (catScores.length === 0) continue
    categoriesWithData++

    const avgScore    = mean(catScores)          // rounded integer (our helper)
    const recentScore = catScores[catScores.length - 1]  // most recent score
    const lowScores   = catScores.filter(s => s < LOW_SCORE_THRESHOLD)
    const lowCount    = lowScores.length
    const sampleSize  = catScores.length
    const lowRatio    = lowCount / sampleSize

    // No evidence of weakness for this category
    if (avgScore === null || avgScore >= LOW_SCORE_THRESHOLD) continue
    if (lowCount === 0) continue

    // ── Trend computation ────────────────────────────────────────────────
    let trend = 'insufficient_data'
    if (catScores.length >= 2) {
      const mid      = Math.ceil(catScores.length / 2)
      const earlier  = catScores.slice(0, mid)
      const later    = catScores.slice(mid)
      const avgEarly = earlier.reduce((s, v) => s + v, 0) / earlier.length
      const avgLate  = later.reduce((s, v) => s + v, 0) / later.length
      const delta    = avgLate - avgEarly
      if (delta > TREND_MIN_DELTA)       trend = 'improving'
      else if (delta < -TREND_MIN_DELTA) trend = 'declining'
      else                               trend = 'stable'
    }

    // ── Risk-level determination ─────────────────────────────────────────
    let riskLevel
    if (sampleSize === 1) {
      // Cannot claim persistence with 1 valid score
      riskLevel = 'Emerging'
    } else if (avgScore < HIGH_RISK_AVG || (lowCount >= PERSISTENT_COUNT && trend === 'declining')) {
      riskLevel = 'High'
    } else if (lowCount >= PERSISTENT_COUNT || lowRatio >= HIGH_RISK_RATIO) {
      riskLevel = 'High'
    } else if (lowRatio >= 0.5) {
      riskLevel = 'Medium'
    } else if (lowCount >= 1) {
      riskLevel = 'Medium'
    } else {
      riskLevel = 'Emerging'
    }

    // ── Risk indicator (0–100 deterministic, NOT a probability) ──────────
    // Derived from: (lowRatio * 50) + (distance below threshold * 0.5)
    // Capped [0, 100]. Transparently labelled as a "risk indicator" in the
    // API, NOT as a scientifically calibrated probability.
    const distanceBelow = Math.max(0, LOW_SCORE_THRESHOLD - avgScore)
    const riskIndicator = Math.min(100, Math.round(lowRatio * 50 + distanceBelow * 0.5))

    // ── Human-readable reason ────────────────────────────────────────────
    const label     = CATEGORY_LABELS[cat]
    const trendText = trend === 'insufficient_data'
      ? 'insufficient history for trend analysis'
      : `showing a ${trend} trend`
    const persistenceText = sampleSize === 1
      ? 'only one interview score recorded'
      : `${lowCount} of ${sampleSize} interviews scored below ${LOW_SCORE_THRESHOLD}`
    const reason = `${label} has an average score of ${avgScore}/100 across ${sampleSize} interview${sampleSize !== 1 ? 's' : ''} (${persistenceText}), ${trendText}.`

    // ── Select targeted recommendations (first 3 for the detected area) ──
    const recommendations = (WEAK_AREA_RECOMMENDATIONS[cat] || []).slice(0, 3)

    weakAreas.push({
      area:            label,
      categoryKey:     cat,
      riskLevel,
      riskIndicator,   // 0–100 deterministic indicator, NOT a probability
      averageScore:    avgScore,
      recentScore:     recentScore,
      lowestScore:     Math.min(...catScores),
      lowScoreCount:   lowCount,
      sampleSize,
      trend,
      reason,
      recommendations,
      // Context: most recent role
      contextRole: latestRole || null,
    })
  }

  // ── Sort: High → Medium → Emerging, then by averageScore ascending ────
  const RISK_ORDER = { High: 0, Medium: 1, Emerging: 2 }
  weakAreas.sort((a, b) => {
    const rDiff = (RISK_ORDER[a.riskLevel] ?? 3) - (RISK_ORDER[b.riskLevel] ?? 3)
    if (rDiff !== 0) return rDiff
    return (a.averageScore ?? 100) - (b.averageScore ?? 100)
  })

  if (weakAreas.length === 0) {
    // If no category had any valid M7 scores (all interviews are legacy/unscored),
    // return insufficient_history — not a false positive "no weakness" status.
    if (categoriesWithData === 0) {
      return {
        status:  'insufficient_history',
        message: 'No Module 7 competency scores found in your interview history. Complete a scored AI interview to enable weak-area prediction.',
        weakAreas: [],
      }
    }
    // Genuinely all scored categories are above the threshold.
    return {
      status:  'no_persistent_weakness',
      message: 'No persistent weak areas detected from your interview history. Keep up the strong performance!',
      weakAreas: [],
    }
  }

  return {
    status:    'predicted',
    weakAreas,
    // Metadata for UI display
    metadata: {
      interviewsAnalysed: enriched.length,
      categoriesAnalysed: CATEGORIES.length,
      threshold:          LOW_SCORE_THRESHOLD,
      note:               'riskIndicator is a deterministic metric derived from score history, not a statistical probability.',
    },
  }
}

/* ─── Improvement Progress ────────────────────────────────────────────────── */

/**
 * computeImprovementProgress(enriched)
 *
 * Module 8 — Longitudinal Improvement Progress Tracking
 *
 * Compares the candidate's EARLIER interview performance with their LATER
 * interview performance using the exact same half-split method as predictWeakAreas,
 * ensuring consistent trend semantics across the dashboard.
 *
 * Design principles:
 *  - DETERMINISTIC  — same input → same output every time.
 *  - REAL DATA ONLY — uses only valid Module 7 scores; nulls excluded.
 *  - NO FABRICATION — refuses to claim progress from a single interview.
 *  - CONSISTENT     — uses same TREND_MIN_DELTA (5 pts) as predictWeakAreas.
 *
 * Method (documented for auditability):
 *  1. Filter valid scored data: interviews where overallScore is not null.
 *  2. For each dimension (overall + 4 M7 categories), collect chronological values.
 *  3. If fewer than 2 valid values → insufficient_history for that dimension.
 *  4. Split: earlier = first ⌈N/2⌉ values, later = remaining values.
 *  5. delta = mean(later) − mean(earlier), rounded to 1 decimal.
 *  6. direction: delta > TREND_MIN_DELTA → 'improving', < −TREND_MIN_DELTA → 'declining', else 'stable'.
 *
 * @param {Array} enriched  — chronologically ordered enriched interview rows from
 *                            getCandidateAnalytics step 2. Each item has:
 *                            { overallScore, communication, confidence,
 *                              technicalRelevance, professionalism }
 * @returns {object}        — { status, interviewsAnalysed, overall, categories }
 */
function computeImprovementProgress(enriched) {
  const TREND_MIN_DELTA = 5   // must match predictWeakAreas for consistency

  // Guard: null / empty input
  if (!Array.isArray(enriched) || enriched.length === 0) {
    return {
      status:             'no_data',
      interviewsAnalysed: 0,
      message:            'No completed interview history available to track improvement progress.',
    }
  }

  /**
   * Compute progress for a single dimension given an array of chronological scores.
   * @param {Array<number|null>} allScores
   * @returns {{ status, earlierAverage, laterAverage, delta, direction }}
   */
  function dimensionProgress(allScores) {
    // Filter to valid non-null numbers (score=0 IS valid)
    const valid = allScores
      .filter(s => s !== null && s !== undefined && isFinite(Number(s)))
      .map(Number)

    if (valid.length < 2) {
      return {
        status:          'insufficient_history',
        earlierAverage:  valid.length === 1 ? Math.round(valid[0]) : null,
        laterAverage:    null,
        delta:           null,
        direction:       null,
        validCount:      valid.length,
      }
    }

    const mid          = Math.ceil(valid.length / 2)
    const earlierVals  = valid.slice(0, mid)
    const laterVals    = valid.slice(mid)
    const earlierAvg   = earlierVals.reduce((s, v) => s + v, 0) / earlierVals.length
    const laterAvg     = laterVals.reduce((s, v) => s + v, 0) / laterVals.length
    const delta        = Math.round((laterAvg - earlierAvg) * 10) / 10  // 1 decimal

    let direction
    if (delta > TREND_MIN_DELTA)       direction = 'improving'
    else if (delta < -TREND_MIN_DELTA) direction = 'declining'
    else                               direction = 'stable'

    return {
      status:         'tracked',
      earlierAverage: Math.round(earlierAvg),
      laterAverage:   Math.round(laterAvg),
      delta,
      direction,
      validCount:     valid.length,
    }
  }

  // ── Compute per-dimension ────────────────────────────────────────────────
  const overallProgress = dimensionProgress(enriched.map(r => r.overallScore))
  const categoryProgress = {
    communication:      dimensionProgress(enriched.map(r => r.communication)),
    confidence:         dimensionProgress(enriched.map(r => r.confidence)),
    technicalRelevance: dimensionProgress(enriched.map(r => r.technicalRelevance)),
    professionalism:    dimensionProgress(enriched.map(r => r.professionalism)),
  }

  // ── Top-level status ─────────────────────────────────────────────────────
  // If even the overall dimension is insufficient, return explicit insufficient_history
  if (overallProgress.status === 'insufficient_history') {
    const validOverall = enriched
      .map(r => r.overallScore)
      .filter(s => s !== null && s !== undefined && isFinite(Number(s)))
    return {
      status:             'insufficient_history',
      interviewsAnalysed: enriched.length,
      validScoredCount:   validOverall.length,
      message:            'Complete another scored interview to track improvement progress.',
      overall:            overallProgress,
      categories:         categoryProgress,
    }
  }

  return {
    status:             'tracked',
    interviewsAnalysed: enriched.length,
    overall:            overallProgress,
    categories:         categoryProgress,
    // Human-readable top-level summary
    summary: (() => {
      const d = overallProgress.delta
      if (overallProgress.direction === 'improving') return `Overall score improved by ${d > 0 ? '+' : ''}${d} points`
      if (overallProgress.direction === 'declining') return `Overall score declined by ${d} points`
      return `Overall score is stable (${d > 0 ? '+' : ''}${d} points)`
    })(),
  }
}

/* ─── Candidate Analytics ──────────────────────────────────────────────────── */

/**
 * getCandidateAnalytics(userId)
 *
 * Returns a comprehensive analytics summary for a single candidate,
 * including overall performance statistics, Module 7 category averages,
 * chronological trend data, performance rating distribution, and
 * resume-derived skills when available.
 *
 * @param {number|string} userId
 * @returns {Promise<object>}
 */
async function getCandidateAnalytics(userId) {
  // ── 1. Fetch all completed interviews for the candidate ──────────────────
  const ivResult = await pool.query(
    `SELECT
       iv.id,
       iv.selected_role,
       iv.interview_type,
       iv.difficulty,
       iv.score,
       iv.completed_at,
       iv.duration,
       iv.performance_rating,
       iv.hire_recommendation,
       iv.questions_answered,
       iv.question_count,
       iv.category_scores
     FROM interviews iv
     WHERE iv.user_id = $1
       AND iv.status  = 'completed'
     ORDER BY iv.completed_at ASC`,
    [userId]
  )

  const rows = ivResult.rows

  // ── 2. Derive category scores per interview ──────────────────────────────
  const enriched = rows.map(row => {
    const cs    = parseCategoryScores(row.category_scores)
    const cats  = extractM7Cats(cs)
    return {
      interviewId:         row.id,
      role:                row.selected_role,
      interviewType:       row.interview_type,
      difficulty:          row.difficulty,
      overallScore:        toInt(row.score),
      completedAt:         row.completed_at,
      duration:            row.duration || null,
      performanceRating:   cats.performanceRating || row.performance_rating || null,
      hireRecommendation:  row.hire_recommendation || null,
      questionsAnswered:   row.questions_answered || 0,
      questionCount:       row.question_count || 0,
      communication:       cats.communication,
      confidence:          cats.confidence,
      technicalRelevance:  cats.technicalRelevance,
      professionalism:     cats.professionalism,
    }
  })

  // ── 3. Summary statistics ────────────────────────────────────────────────
  const overallScores = enriched.map(r => r.overallScore).filter(s => s !== null)

  const summary = {
    totalInterviews:  enriched.length,
    averageScore:     mean(overallScores),
    highestScore:     overallScores.length > 0 ? Math.max(...overallScores) : null,
    lowestScore:      overallScores.length > 0 ? Math.min(...overallScores) : null,
    latestScore:      enriched.length > 0 ? enriched[enriched.length - 1].overallScore : null,
    latestRole:       enriched.length > 0 ? enriched[enriched.length - 1].role : null,
    latestCompletedAt: enriched.length > 0 ? enriched[enriched.length - 1].completedAt : null,
  }

  // ── 4. Category averages ─────────────────────────────────────────────────
  const categoryAverages = {
    communication:      mean(enriched.map(r => r.communication)),
    confidence:         mean(enriched.map(r => r.confidence)),
    technicalRelevance: mean(enriched.map(r => r.technicalRelevance)),
    professionalism:    mean(enriched.map(r => r.professionalism)),
  }

  // ── 5. Performance rating distribution ──────────────────────────────────
  const ratingDist = {}
  const ratingLabels = ['Excellent', 'Good', 'Average', 'Needs Improvement', 'Poor']
  ratingLabels.forEach(l => { ratingDist[l] = 0 })
  enriched.forEach(r => {
    const rating = r.performanceRating
    if (rating && ratingDist[rating] !== undefined) ratingDist[rating]++
  })

  // ── 6. Chronological trend data (chart-ready) ───────────────────────────
  const trends = enriched.map((r, idx) => ({
    interviewIndex:     idx + 1,                // 1-based label for chart axis
    interviewId:        r.interviewId,
    completedAt:        r.completedAt,
    role:               r.role,
    difficulty:         r.difficulty,
    overallScore:       r.overallScore,
    communication:      r.communication,
    confidence:         r.confidence,
    technicalRelevance: r.technicalRelevance,
    professionalism:    r.professionalism,
    performanceRating:  r.performanceRating,
  }))

  // ── 7. Resume-derived skills ─────────────────────────────────────────────
  //    Fetch the most recently analyzed resume skills for this user.
  //    Only expose skills and technologies arrays; never invent skill match scores.
  const resumeSkills = await getCandidateResumeSkills(userId)

  // ── 8. Weak-area prediction ──────────────────────────────────────────────
  //    Pure deterministic analysis of the enriched history built above.
  //    No additional DB query required — reuses data already fetched in step 1–2.
  const latestRole = enriched.length > 0 ? enriched[enriched.length - 1].role : null
  const weakAreaPrediction = predictWeakAreas(enriched, latestRole)

  // ── 9. Improvement Progress ──────────────────────────────────────────────
  //    Pure deterministic calculation reusing the enriched array already built.
  //    No additional DB query. Same earlier/later split method as predictWeakAreas.
  const improvementProgress = computeImprovementProgress(enriched)

  return {
    success:   true,
    summary,
    categoryAverages,
    ratingDistribution: ratingDist,
    trends,
    resumeSkills,
    // Module 8 — Weak-Area Prediction (deterministic, history-based)
    weakAreaPrediction,
    // Module 8 — Longitudinal Improvement Progress (deterministic, history-based)
    improvementProgress,
    // interviewHistory is a compact per-interview list for table rendering
    interviewHistory: enriched.map(r => ({
      interviewId:        r.interviewId,
      role:               r.role,
      interviewType:      r.interviewType,
      difficulty:         r.difficulty,
      overallScore:       r.overallScore,
      completedAt:        r.completedAt,
      performanceRating:  r.performanceRating,
      hireRecommendation: r.hireRecommendation,
    })),
  }
}

/**
 * getCandidateResumeSkills(userId)
 *
 * Returns skills and technologies from the candidate's most recently analyzed
 * resume. Returns null when no resume analysis exists.
 *
 * IMPORTANT: These are resume-declared skills, NOT interview performance scores.
 * We do not fabricate match percentages or proficiency levels from interview data.
 *
 * @param {number|string} userId
 * @returns {Promise<object|null>}
 */
async function getCandidateResumeSkills(userId) {
  const result = await pool.query(
    `SELECT ra.skills, ra.technologies, ra.ats_score, ra.analyzed_at
       FROM resume_analyses ra
       JOIN resumes r ON r.id = ra.resume_id
      WHERE r.user_id = $1
      ORDER BY ra.analyzed_at DESC
      LIMIT 1`,
    [userId]
  )

  if (!result.rows[0]) return null

  const row = result.rows[0]

  // skills and technologies may be arrays or objects depending on AI extraction
  const parseJsonbArray = (raw) => {
    if (!raw) return null
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'object') {
      // Some AI extractors return { items: [...] } or { skills: [...] }
      const vals = Object.values(raw)
      const flat  = vals.flat(2)
      return flat.filter(x => typeof x === 'string').length > 0 ? flat.filter(x => typeof x === 'string') : null
    }
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : null } catch { return null }
    }
    return null
  }

  // ats_score may be a number or JSONB object from AI extraction
  const atsScore = (() => {
    const raw = row.ats_score
    if (raw === null || raw === undefined) return null
    if (typeof raw === 'number') return Math.round(raw)
    if (typeof raw === 'object' && raw.score != null) return toInt(raw.score)
    if (typeof raw === 'string') {
      const n = Number(raw)
      if (isFinite(n)) return Math.round(n)
      try {
        const p = JSON.parse(raw)
        if (p?.score != null) return toInt(p.score)
      } catch { /* ignore */ }
    }
    return null
  })()

  return {
    skills:      parseJsonbArray(row.skills),
    technologies: parseJsonbArray(row.technologies),
    atsScore,     // authentic ATS score when available
    analyzedAt:  row.analyzed_at,
  }
}

/* ─── Recruiter Analytics ──────────────────────────────────────────────────── */

/**
 * getRecruiterAnalytics()
 *
 * Returns platform-wide analytics for RECRUITER / ADMIN roles covering:
 *  - Weekly interview volume (real DB completions, last 12 weeks)
 *  - Score distribution across all candidates
 *  - Per-category averages across all candidates
 *  - Merit-ordered candidate rankings
 *
 * @returns {Promise<object>}
 */
async function getRecruiterAnalytics() {
  const [weeklyData, scoreDistData, categoryData, rankingData] = await Promise.all([
    getRecruiterWeeklyTrend(),
    getRecruiterScoreDistribution(),
    getRecruiterCategoryAverages(),
    getRecruiterCandidateRankings(),
  ])

  return {
    success: true,
    weeklyTrend:       weeklyData,
    scoreDistribution: scoreDistData,
    categoryAverages:  categoryData,
    candidateRankings: rankingData,
  }
}

/**
 * getRecruiterWeeklyTrend()
 *
 * Aggregates real weekly completed interview counts from the database
 * using DATE_TRUNC('week', completed_at). Returns the last 12 complete weeks.
 *
 * NOTE: We do not have a "scheduled" interview concept in the current schema;
 * only completed_at is tracked. We do NOT fabricate a "scheduled" series.
 *
 * @returns {Promise<Array>}
 */
async function getRecruiterWeeklyTrend() {
  const result = await pool.query(
    `SELECT
       DATE_TRUNC('week', completed_at)::date AS week_start,
       COUNT(*)::integer                       AS completed
     FROM interviews
     WHERE status      = 'completed'
       AND completed_at IS NOT NULL
       AND completed_at >= NOW() - INTERVAL '84 days'   -- last 12 weeks
     GROUP BY week_start
     ORDER BY week_start ASC`
  )

  return result.rows.map(row => ({
    weekStart: row.week_start,
    // Human-readable label: "Sep 1"
    week: new Date(row.week_start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    completed: row.completed,
  }))
}

/**
 * getRecruiterScoreDistribution()
 *
 * Bins completed interview scores into five canonical ranges.
 * Returns real candidate counts per bin.
 *
 * @returns {Promise<Array>}
 */
async function getRecruiterScoreDistribution() {
  const result = await pool.query(
    `SELECT
       CASE
         WHEN score >= 90 THEN '90–100'
         WHEN score >= 80 THEN '80–89'
         WHEN score >= 70 THEN '70–79'
         WHEN score >= 60 THEN '60–69'
         ELSE '<60'
       END                 AS score_range,
       COUNT(*)::integer   AS candidate_count
     FROM interviews
     WHERE status = 'completed'
       AND score  IS NOT NULL
     GROUP BY score_range
     ORDER BY
       CASE score_range
         WHEN '90–100' THEN 1
         WHEN '80–89'  THEN 2
         WHEN '70–79'  THEN 3
         WHEN '60–69'  THEN 4
         ELSE               5
       END`
  )

  // Return all 5 buckets, filling missing ones with 0
  const bins = { '90–100': 0, '80–89': 0, '70–79': 0, '60–69': 0, '<60': 0 }
  result.rows.forEach(r => { if (bins[r.score_range] !== undefined) bins[r.score_range] = r.candidate_count })
  return Object.entries(bins).map(([range, count]) => ({ range, count }))
}

/**
 * getRecruiterCategoryAverages()
 *
 * Computes platform-wide averages of the four canonical Module 7 categories
 * across all completed interviews that have module7_scores.
 *
 * Uses PostgreSQL JSON operators to extract JSONB values inline.
 * Falls back gracefully when category_scores is missing.
 *
 * @returns {Promise<object>}
 */
async function getRecruiterCategoryAverages() {
  const result = await pool.query(
    `SELECT
       ROUND(AVG((category_scores->'module7_scores'->'communication'->>'score')::numeric))::integer  AS avg_communication,
       ROUND(AVG((category_scores->'module7_scores'->'confidence'->>'score')::numeric))::integer     AS avg_confidence,
       ROUND(AVG((category_scores->'module7_scores'->'technicalRelevance'->>'score')::numeric))::integer AS avg_technical_relevance,
       ROUND(AVG((category_scores->'module7_scores'->'professionalism'->>'score')::numeric))::integer AS avg_professionalism,
       COUNT(*) FILTER (WHERE category_scores->'module7_scores' IS NOT NULL)::integer                AS interviews_with_m7
     FROM interviews
     WHERE status = 'completed'
       AND category_scores IS NOT NULL`
  )

  const row = result.rows[0] || {}
  return {
    communication:      row.avg_communication      ?? null,
    confidence:         row.avg_confidence         ?? null,
    technicalRelevance: row.avg_technical_relevance ?? null,
    professionalism:    row.avg_professionalism     ?? null,
    interviewsWithM7:   row.interviews_with_m7      ?? 0,
  }
}

/**
 * getRecruiterCandidateRankings(limit = 100)
 *
 * Returns candidates ranked by their highest interview score (merit-based),
 * in descending order. Each candidate may appear multiple times if they
 * completed multiple interviews; each row represents one completed interview.
 *
 * Exposes authentic resume ATS score when a resume_analysis row exists for
 * the same candidate (joined via interviews.resume_analysis_id). Returns null
 * for resumeScore when no authentic data is available.
 *
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecruiterCandidateRankings(limit = 100) {
  const result = await pool.query(
    `SELECT
       iv.id               AS interview_id,
       iv.selected_role    AS role,
       iv.interview_type,
       iv.difficulty,
       iv.score,
       iv.performance_rating,
       iv.hire_recommendation,
       iv.completed_at,
       iv.duration,
       iv.questions_answered,
       iv.question_count,
       iv.category_scores,
       -- candidate
       u.id                AS candidate_id,
       u.name              AS candidate_name,
       u.email             AS candidate_email,
       -- authentic resume ATS score (null when no resume was used for this interview)
       ra.ats_score        AS resume_ats_score,
       -- rank by score desc among all completed interviews
       RANK() OVER (ORDER BY iv.score DESC NULLS LAST) AS merit_rank
     FROM interviews iv
     JOIN users u ON u.id = iv.user_id
     LEFT JOIN resume_analyses ra ON ra.id = iv.resume_analysis_id
     WHERE iv.status = 'completed'
     ORDER BY merit_rank ASC, iv.completed_at DESC
     LIMIT $1`,
    [limit]
  )

  return result.rows.map(row => {
    const cs    = parseCategoryScores(row.category_scores)
    const cats  = extractM7Cats(cs)

    // Extract numeric ATS score from JSONB (may be a number, or an object like {score: 85})
    let resumeScore = null
    if (row.resume_ats_score !== null && row.resume_ats_score !== undefined) {
      const raw = row.resume_ats_score
      if (typeof raw === 'number') resumeScore = Math.round(raw)
      else if (typeof raw === 'object' && raw.score != null) resumeScore = toInt(raw.score)
      else if (typeof raw === 'string') {
        const n = Number(raw)
        if (isFinite(n)) resumeScore = Math.round(n)
        else {
          try {
            const p = JSON.parse(raw)
            if (p?.score != null) resumeScore = toInt(p.score)
          } catch { /* ignore */ }
        }
      }
    }

    return {
      rank:              Number(row.merit_rank),
      interviewId:       row.interview_id,
      candidateId:       row.candidate_id,
      candidateName:     row.candidate_name,
      candidateEmail:    row.candidate_email,
      role:              row.role,
      interviewType:     row.interview_type,
      difficulty:        row.difficulty,
      overallScore:      toInt(row.score),
      performanceRating: cats.performanceRating || row.performance_rating || null,
      hireRecommendation: row.hire_recommendation || null,
      completedAt:       row.completed_at,
      duration:          row.duration || null,
      questionsAnswered: row.questions_answered || 0,
      questionCount:     row.question_count || 0,
      // Canonical Module 7 category scores (null when interview predates Module 7)
      communication:     cats.communication,
      confidence:        cats.confidence,
      technicalRelevance: cats.technicalRelevance,
      professionalism:   cats.professionalism,
      // Authentic ATS resume score — null when no linked resume analysis exists
      resumeScore,
    }
  })
}

/* ─── Exports ──────────────────────────────────────────────────────────────── */

module.exports = {
  getCandidateAnalytics,
  getCandidateResumeSkills,
  getRecruiterAnalytics,
  getRecruiterWeeklyTrend,
  getRecruiterScoreDistribution,
  getRecruiterCategoryAverages,
  getRecruiterCandidateRankings,
  // Exported for unit testing (pure functions, no DB dependency)
  predictWeakAreas,
  computeImprovementProgress,
}
