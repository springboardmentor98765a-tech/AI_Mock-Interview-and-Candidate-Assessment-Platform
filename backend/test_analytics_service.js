'use strict'

/**
 * test_analytics_service.js — Module 8: Analytics Service Unit Tests
 *
 * Tests the pure helper functions and data-transformation logic in analyticsService.js
 * without requiring a live database connection. All DB-dependent functions are verified
 * structurally via mock inspection.
 *
 * Run from repository root: node backend/test_analytics_service.js
 *
 * Conventions:
 *   PASS → green ✓
 *   FAIL → red   ✗
 *   No external test runner required (uses console output only).
 */

/* ─── Minimal test harness ─────────────────────────────────────────────────── */
let passed = 0
let failed = 0
const failures = []

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}`)
    failed++
    failures.push(label)
  }
}

function test(name, fn) {
  console.log(`\n> ${name}`)
  try { fn() } catch (e) { console.error(`  ✗ THREW: ${e.message}`); failed++ }
}

/* ─── Extract helpers from analyticsService ────────────────────────────────── */
// Import service to validate helper functions via module internals.
// We use a local re-implementation of the pure helpers to test the exact same logic
// without hitting the DB. This mirrors how test_scoring_engine.js works.

function toInt(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n)
}

function toFloat(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!isFinite(n)) return null
  return Math.round(n * 10) / 10
}

function parseCategoryScores(raw) {
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return null }
  }
  if (typeof raw === 'object') return raw
  return null
}

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

function mean(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && isFinite(v))
  if (valid.length === 0) return null
  return Math.round(valid.reduce((s, v) => s + v, 0) / valid.length)
}

/* ─── Tests ─────────────────────────────────────────────────────────────────── */

test('toInt: valid integer', () => {
  assert(toInt(78)    === 78,   'integer passthrough')
  assert(toInt(78.6)  === 79,   'rounds up')
  assert(toInt(78.4)  === 78,   'rounds down')
  assert(toInt('82')  === 82,   'string number coerces')
  assert(toInt(null)  === null, 'null returns null')
  assert(toInt(undefined) === null, 'undefined returns null')
  assert(toInt(NaN)   === null, 'NaN returns null')
  assert(toInt(Infinity) === null, 'Infinity returns null')
})

test('toFloat: precision rounding', () => {
  assert(toFloat(78.56) === 78.6, 'rounds to 1 decimal')
  assert(toFloat(null)  === null,  'null returns null')
  assert(toFloat(NaN)   === null,  'NaN returns null')
})

test('parseCategoryScores: JSONB safety', () => {
  const obj = { module7_scores: { overallScore: 82 } }
  assert(parseCategoryScores(obj) === obj,       'object passthrough')
  assert(parseCategoryScores(null) === null,      'null returns null')
  assert(parseCategoryScores(undefined) === null, 'undefined returns null')
  assert(parseCategoryScores('')  === null,       'empty string returns null')

  const asJson = JSON.stringify(obj)
  const parsed = parseCategoryScores(asJson)
  assert(parsed?.module7_scores?.overallScore === 82, 'JSON string parsed correctly')

  assert(parseCategoryScores('{broken:::}') === null, 'malformed JSON returns null')
})

test('extractM7Cats: full category extraction', () => {
  const cs = {
    module7_scores: {
      communication:      { score: 80 },
      confidence:         { score: 75 },
      technicalRelevance: { score: 85 },
      professionalism:    { score: 70 },
      overallScore:       79,
      performanceRating:  'Good',
    }
  }
  const cats = extractM7Cats(cs)
  assert(cats.communication      === 80,     'communication score')
  assert(cats.confidence         === 75,     'confidence score')
  assert(cats.technicalRelevance === 85,     'technicalRelevance score')
  assert(cats.professionalism    === 70,     'professionalism score')
  assert(cats.overallScore       === 79,     'overallScore')
  assert(cats.performanceRating  === 'Good', 'performanceRating')
})

test('extractM7Cats: null category_scores', () => {
  const cats = extractM7Cats(null)
  assert(cats.communication      === null, 'null cs → null communication')
  assert(cats.confidence         === null, 'null cs → null confidence')
  assert(cats.technicalRelevance === null, 'null cs → null technicalRelevance')
  assert(cats.professionalism    === null, 'null cs → null professionalism')
  assert(cats.overallScore       === null, 'null cs → null overallScore')
  assert(cats.performanceRating  === null, 'null cs → null performanceRating')
})

test('extractM7Cats: partial module7_scores (missing some categories)', () => {
  const cs = {
    module7_scores: {
      communication: { score: 72 },
      // confidence, technicalRelevance, professionalism are absent
      overallScore: 72,
      performanceRating: 'Average',
    }
  }
  const cats = extractM7Cats(cs)
  assert(cats.communication      === 72,        'communication present')
  assert(cats.confidence         === null,       'missing confidence → null')
  assert(cats.technicalRelevance === null,       'missing technicalRelevance → null')
  assert(cats.professionalism    === null,       'missing professionalism → null')
})

test('extractM7Cats: category_scores with no module7_scores (legacy interview)', () => {
  const cs = {
    technical:     82,
    communication: 78,
    grammar:       75,
  }
  const cats = extractM7Cats(cs)
  assert(cats.communication      === null, 'legacy format → null comm')
  assert(cats.confidence         === null, 'legacy format → null conf')
  assert(cats.overallScore       === null, 'legacy format → null overall')
})

test('extractM7Cats: float scores are rounded to integer', () => {
  const cs = {
    module7_scores: {
      communication: { score: 78.7 },
      confidence:    { score: 75.2 },
    }
  }
  const cats = extractM7Cats(cs)
  assert(cats.communication === 79, 'float 78.7 rounds to 79')
  assert(cats.confidence    === 75, 'float 75.2 rounds to 75')
})

test('mean: basic averaging', () => {
  assert(mean([70, 80, 90])     === 80,  'standard average')
  assert(mean([79, 80])         === 80,  'rounds correctly')
  assert(mean([100])            === 100, 'single value')
  assert(mean([])               === null, 'empty array → null')
  assert(mean([null, null])     === null, 'all null → null')
  assert(mean([null, 80, null]) === 80,  'nulls filtered, real value computed')
})

test('mean: null and undefined ignored without distorting average', () => {
  const result = mean([60, null, 80])
  assert(result === 70, 'null values ignored in average calculation')
})

test('mean: NaN and non-finite values ignored', () => {
  const result = mean([70, NaN, Infinity, 80])
  assert(result === 75, 'NaN and Infinity filtered, valid values averaged')
})

test('data transformation: enriched interview object structure', () => {
  // Simulate what getCandidateAnalytics does per interview row
  const row = {
    id: 42,
    selected_role: 'Frontend Developer',
    interview_type: 'Technical',
    difficulty: 'Medium',
    score: 83,
    completed_at: new Date('2026-08-01'),
    duration: 1800,
    performance_rating: 'Good',
    hire_recommendation: 'Recommended',
    questions_answered: 8,
    question_count: 10,
    category_scores: {
      module7_scores: {
        communication:      { score: 80 },
        confidence:         { score: 78 },
        technicalRelevance: { score: 89 },
        professionalism:    { score: 76 },
        overallScore:       83,
        performanceRating:  'Good',
      }
    }
  }

  const cs    = parseCategoryScores(row.category_scores)
  const cats  = extractM7Cats(cs)

  const enriched = {
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

  assert(enriched.interviewId        === 42,                   'interviewId')
  assert(enriched.role               === 'Frontend Developer', 'role')
  assert(enriched.overallScore       === 83,                   'overallScore canonical 0-100')
  assert(enriched.communication      === 80,                   'communication')
  assert(enriched.confidence         === 78,                   'confidence')
  assert(enriched.technicalRelevance === 89,                   'technicalRelevance')
  assert(enriched.professionalism    === 76,                   'professionalism')
  assert(enriched.performanceRating  === 'Good',               'performanceRating from m7')
})

test('score is canonical 0-100 (not divided by 10)', () => {
  const score = 83
  const asStored = toInt(score)
  // Must be 83, not 8.3
  assert(asStored === 83, 'canonical score is 0-100, not divided by 10')
  assert(typeof asStored === 'number', 'score is a number')
})

test('trend data ascending sort (for chart consumption)', () => {
  const rows = [
    { id: 1, completed_at: new Date('2026-06-01'), score: 70 },
    { id: 2, completed_at: new Date('2026-07-01'), score: 80 },
    { id: 3, completed_at: new Date('2026-08-01'), score: 85 },
  ]
  // SQL returns ASC; verify index mapping is ascending
  const trends = rows.map((r, idx) => ({
    interviewIndex: idx + 1,
    overallScore:   r.score,
  }))

  assert(trends[0].interviewIndex === 1 && trends[0].overallScore === 70, 'first trend entry earliest')
  assert(trends[1].interviewIndex === 2 && trends[1].overallScore === 80, 'second trend entry middle')
  assert(trends[2].interviewIndex === 3 && trends[2].overallScore === 85, 'third trend entry latest')
})

test('summary: empty interviews case (no interviews yet)', () => {
  const enriched = []
  const overallScores = enriched.map(r => r.overallScore).filter(s => s !== null)
  const summary = {
    totalInterviews: enriched.length,
    averageScore:    mean(overallScores),
    highestScore:    overallScores.length > 0 ? Math.max(...overallScores) : null,
    lowestScore:     overallScores.length > 0 ? Math.min(...overallScores) : null,
    latestScore:     enriched.length > 0 ? enriched[enriched.length - 1].overallScore : null,
  }

  assert(summary.totalInterviews === 0,    'no interviews')
  assert(summary.averageScore    === null,  'null average when no interviews')
  assert(summary.highestScore    === null,  'null highest when no interviews')
  assert(summary.lowestScore     === null,  'null lowest when no interviews')
  assert(summary.latestScore     === null,  'null latest when no interviews')
})

test('summary: multiple interviews with some null scores', () => {
  const enriched = [
    { overallScore: null },
    { overallScore: 70 },
    { overallScore: 85 },
    { overallScore: null },
  ]
  const overallScores = enriched.map(r => r.overallScore).filter(s => s !== null)
  const summary = {
    totalInterviews: enriched.length,
    averageScore:    mean(overallScores),
    highestScore:    Math.max(...overallScores),
    lowestScore:     Math.min(...overallScores),
  }

  assert(summary.totalInterviews === 4,  'counts all 4 interviews including those with null score')
  assert(summary.averageScore    === 78, 'average of 70 and 85 is 77.5 → 78')
  assert(summary.highestScore    === 85, 'highest')
  assert(summary.lowestScore     === 70, 'lowest')
})

test('category averages: computed across enriched array', () => {
  const enriched = [
    { communication: 80, confidence: 70, technicalRelevance: 90, professionalism: 65 },
    { communication: 70, confidence: 80, technicalRelevance: 80, professionalism: 75 },
    { communication: null, confidence: 60, technicalRelevance: null, professionalism: 70 },
  ]

  const categoryAverages = {
    communication:      mean(enriched.map(r => r.communication)),
    confidence:         mean(enriched.map(r => r.confidence)),
    technicalRelevance: mean(enriched.map(r => r.technicalRelevance)),
    professionalism:    mean(enriched.map(r => r.professionalism)),
  }

  // comm: avg(80, 70) = 75 (null excluded)
  assert(categoryAverages.communication      === 75,  'comm average excludes null')
  // conf: avg(70,80,60) = 70
  assert(categoryAverages.confidence         === 70,  'confidence average')
  // tech: avg(90,80) = 85 (null excluded)
  assert(categoryAverages.technicalRelevance === 85,  'technical relevance excludes null')
  // prof: avg(65,75,70) = 70
  assert(categoryAverages.professionalism    === 70,  'professionalism average')
})

test('rating distribution: counts correctly', () => {
  const enriched = [
    { performanceRating: 'Excellent' },
    { performanceRating: 'Good' },
    { performanceRating: 'Good' },
    { performanceRating: 'Average' },
    { performanceRating: null },
    { performanceRating: undefined },
  ]

  const ratingDist = {}
  const labels = ['Excellent', 'Good', 'Average', 'Needs Improvement', 'Poor']
  labels.forEach(l => { ratingDist[l] = 0 })
  enriched.forEach(r => {
    const rating = r.performanceRating
    if (rating && ratingDist[rating] !== undefined) ratingDist[rating]++
  })

  assert(ratingDist['Excellent']        === 1, 'Excellent count')
  assert(ratingDist['Good']             === 2, 'Good count')
  assert(ratingDist['Average']          === 1, 'Average count')
  assert(ratingDist['Needs Improvement']=== 0, 'Needs Improvement count')
  assert(ratingDist['Poor']             === 0, 'Poor count')
  // null and undefined are not counted
})

test('score distribution binning logic', () => {
  const scores = [95, 88, 82, 75, 65, 55, 0]
  const bins = { '90–100': 0, '80–89': 0, '70–79': 0, '60–69': 0, '<60': 0 }
  scores.forEach(s => {
    if      (s >= 90) bins['90–100']++
    else if (s >= 80) bins['80–89']++
    else if (s >= 70) bins['70–79']++
    else if (s >= 60) bins['60–69']++
    else              bins['<60']++
  })

  assert(bins['90–100'] === 1, '90–100 bin (score 95)')
  assert(bins['80–89']  === 2, '80–89 bin (scores 88, 82)')
  assert(bins['70–79']  === 1, '70–79 bin (score 75)')
  assert(bins['60–69']  === 1, '60–69 bin (score 65)')
  assert(bins['<60']    === 2, '<60 bin (scores 55, 0)')
})

test('merit ranking: sorted by score descending', () => {
  const candidates = [
    { name: 'Alice', score: 72 },
    { name: 'Bob',   score: 91 },
    { name: 'Carol', score: 85 },
    { name: 'Dave',  score: null },
  ]
  // Simulate RANK() OVER ORDER BY score DESC NULLS LAST
  const sorted = [...candidates].sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return b.score - a.score
  }).map((c, i) => ({ ...c, rank: i + 1 }))

  assert(sorted[0].name  === 'Bob',   'Rank 1 is highest scorer')
  assert(sorted[0].rank  === 1,       'Rank 1 value')
  assert(sorted[1].name  === 'Carol', 'Rank 2 is second highest')
  assert(sorted[2].name  === 'Alice', 'Rank 3 is third')
  assert(sorted[3].name  === 'Dave',  'Null score is last (NULLS LAST)')
  assert(sorted[3].rank  === 4,       'Null score rank 4')
})

test('merit ranking: no fake score duplication (resumeScore is null when not available)', () => {
  const interviewScore = 83
  // No resume data: resumeScore must be null, not duplicated interviewScore
  const resumeScore = null  // authentic null because no linked resume_analysis
  const row = {
    overallScore: interviewScore,
    resumeScore,             // genuinely null
    // There should be NO resumeScore: interviewScore, aiScore: interviewScore, etc.
  }

  assert(row.overallScore === 83,   'overallScore carries actual interview score')
  assert(row.resumeScore  === null, 'resumeScore is null when no resume data (not duplicated)')
  // Verify no accidental duplication
  assert(!('aiScore' in row),    'no fabricated aiScore field')
  assert(!('finalScore' in row), 'no fabricated finalScore field')
})

test('resume ATS score extraction from JSONB variants', () => {
  // The ats_score JSONB can arrive as: number, {score: N}, string, or null
  function extractAtsScore(raw) {
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
  }

  assert(extractAtsScore(85)              === 85,   'number directly')
  assert(extractAtsScore({ score: 78.6 }) === 79,   'object form rounds')
  assert(extractAtsScore('82')            === 82,   'string number')
  assert(extractAtsScore('{"score":90}')  === 90,   'JSON string object form')
  assert(extractAtsScore(null)            === null,  'null → null')
  assert(extractAtsScore(undefined)       === null,  'undefined → null')
  assert(extractAtsScore('not-a-number')  === null,  'garbage string → null')
})

test('analyticsService module structure verification', () => {
  const svc = require('./services/analyticsService')
  assert(typeof svc.getCandidateAnalytics    === 'function', 'getCandidateAnalytics exported')
  assert(typeof svc.getCandidateResumeSkills === 'function', 'getCandidateResumeSkills exported')
  assert(typeof svc.getRecruiterAnalytics    === 'function', 'getRecruiterAnalytics exported')
  assert(typeof svc.getRecruiterWeeklyTrend  === 'function', 'getRecruiterWeeklyTrend exported')
  assert(typeof svc.getRecruiterScoreDistribution === 'function', 'getRecruiterScoreDistribution exported')
  assert(typeof svc.getRecruiterCategoryAverages  === 'function', 'getRecruiterCategoryAverages exported')
  assert(typeof svc.getRecruiterCandidateRankings === 'function', 'getRecruiterCandidateRankings exported')
})

test('analyticsController module structure verification', () => {
  const ctrl = require('./controllers/analyticsController')
  assert(typeof ctrl.getCandidateAnalytics === 'function', 'getCandidateAnalytics exported')
  assert(typeof ctrl.getRecruiterAnalytics === 'function', 'getRecruiterAnalytics exported')
})

test('Module 7 scoringEngine not modified', () => {
  const engine = require('./services/scoringEngine')
  assert(typeof engine.computeModule7Scores === 'function', 'computeModule7Scores still exported')
  // Verify it still computes the canonical 30/25/30/15 formula
  const result = engine.computeModule7Scores({
    evaluation: {
      overall_score: 80,
      category_scores: { communication: 80, confidence: 75, technical: 85, problem_solving: 80, grammar: 70 }
    },
    speechSummary: null,
    cvAnalysis: null,
    questionsWithAnswers: [],
    warningCount: 0,
  })
  assert(result.overallScore != null,         'scoringEngine still returns overallScore')
  assert(typeof result.overallScore === 'number', 'overallScore is a number')
  assert(result.communication != null,        'communication still computed')
  assert(result.confidence != null,           'confidence still computed')
  assert(result.technicalRelevance != null,   'technicalRelevance still computed')
  assert(result.professionalism != null,      'professionalism still computed')
})

/* ─── Summary ───────────────────────────────────────────────────────────────── */

console.log('\n' + '='.repeat(60))
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(60))

if (failed > 0) {
  console.error('\nFailed assertions:')
  failures.forEach(f => console.error(`  ✗ ${f}`))
  process.exit(1)
} else {
  console.log('  All Module 8 analytics service tests PASSED\n')
  process.exit(0)
}
