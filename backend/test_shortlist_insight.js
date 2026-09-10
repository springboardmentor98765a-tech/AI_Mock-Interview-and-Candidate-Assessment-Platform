'use strict'

/**
 * test_shortlist_insight.js
 *
 * Tests the pure deterministic computeShortlistInsight logic.
 * Runs with: node backend/test_shortlist_insight.js
 *
 * The function is implemented here as a CommonJS copy of the ESM version
 * in src/services/shortlistInsight.js so it can be tested with plain Node.
 */

/* ─── Inline CJS copy of computeShortlistInsight ─────────────────────────── */
function computeShortlistInsight(c) {
  if (!c) {
    return { status: 'unknown', title: 'No data', summary: 'Candidate data is not available.', reasons: [], strengths: [], concerns: [] }
  }

  const score       = c.interviewScore      != null ? Number(c.interviewScore)      : null
  const comm        = c.communication       != null ? Number(c.communication)       : null
  const conf        = c.confidence          != null ? Number(c.confidence)          : null
  const tech        = c.technicalRelevance  != null ? Number(c.technicalRelevance)  : null
  const prof        = c.professionalism     != null ? Number(c.professionalism)     : null
  const resumeScore = c.resumeScore         != null ? Number(c.resumeScore)         : null
  const rec         = c.rec || c.hireRecommendation || null
  const rating      = c.performanceRating || null

  let status, title, summary
  if (score === null) {
    status = 'unknown'; title = 'Insufficient data'; summary = 'No completed interview score is available for this candidate.'
  } else if (score >= 85) {
    status = 'strong';  title = 'Strong shortlist candidate'; summary = 'This candidate performed strongly across the AI interview evaluation.'
  } else if (score >= 70) {
    status = 'consider'; title = 'Consider for shortlist'; summary = 'This candidate performed well and merits shortlist consideration.'
  } else if (score >= 50) {
    status = 'review';  title = 'Needs further review'; summary = 'This candidate\'s performance is moderate. Additional evaluation is recommended.'
  } else {
    status = 'weak';    title = 'Below current shortlist benchmark'; summary = 'This candidate\'s performance is below the shortlist threshold based on the AI evaluation.'
  }

  const reasons = [], strengths = [], concerns = []

  if (score !== null) reasons.push(`Overall interview score: ${score}/100.`)
  if (rating) {
    reasons.push(`AI performance rating: ${rating}.`)
    if (rating === 'Excellent' || rating === 'Good') strengths.push(`Performance rated as "${rating}"`)
    else if (rating === 'Below Average' || rating === 'Poor') concerns.push(`Performance rated as "${rating}"`)
  }
  if (rec && rec !== 'Consider') reasons.push(`Hire recommendation: ${rec}.`)

  const catScores = [
    { label: 'Communication',       value: comm, weight: '30%' },
    { label: 'Confidence',          value: conf, weight: '25%' },
    { label: 'Technical Relevance', value: tech, weight: '30%' },
    { label: 'Professionalism',     value: prof, weight: '15%' },
  ]
  const availableCats = catScores.filter(cat => cat.value !== null)

  if (availableCats.length > 0) {
    availableCats.forEach(({ label, value, weight }) => {
      reasons.push(`${label} (${weight} weight): ${value}/100.`)
      if (value >= 80) strengths.push(`${label}: ${value}/100 — above benchmark`)
      else if (value < 60) concerns.push(`${label}: ${value}/100 — below threshold`)
    })
    if (score !== null) {
      availableCats.forEach(({ label, value }) => {
        const gap = score - value
        if (gap > 12 && value < 70) {
          const existing = concerns.find(cc => cc.startsWith(label))
          if (!existing) concerns.push(`${label} (${value}/100) is notably below the overall score (${score}/100)`)
        }
      })
    }
  } else {
    reasons.push('Module 7 category breakdown is not available for this interview.')
    concerns.push('Category scores unavailable (legacy interview data)')
  }

  if (resumeScore !== null) {
    reasons.push(`Resume / ATS score: ${resumeScore}/100.`)
    if (resumeScore >= 80) strengths.push(`Strong resume (ATS score: ${resumeScore}/100)`)
    else if (resumeScore < 60) concerns.push(`Resume score is below average (ATS: ${resumeScore}/100)`)
  } else {
    reasons.push('Resume / ATS score: not available.')
    concerns.push('Resume or ATS score was not submitted or not yet analyzed')
  }

  if (c.questionsAnswered != null && c.questionCount != null && c.questionCount > 0) {
    const completionPct = Math.round((c.questionsAnswered / c.questionCount) * 100)
    if (completionPct < 60) concerns.push(`Only ${c.questionsAnswered}/${c.questionCount} questions answered (${completionPct}% completion)`)
    else if (completionPct === 100) strengths.push(`Completed all ${c.questionCount} interview questions`)
  }

  if (c.rank === 1) strengths.push('Ranked #1 by merit score across all evaluated candidates')
  else if (c.rank != null && c.rank <= 3) strengths.push(`Ranked #${c.rank} by merit score`)

  return { status, title, summary, reasons, strengths, concerns }
}

/* ─── Test runner ─────────────────────────────────────────────────────────── */
let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}`)
    failed++
  }
}

function test(name, fn) {
  console.log(`\n> ${name}`)
  try { fn() } catch (e) { console.error(`  ✗ THREW: ${e.message}`); failed++ }
}

/* ─── Strong candidate ────────────────────────────────────────────────────── */
test('Strong candidate (score 90, all M7 high)', () => {
  const c = {
    interviewScore: 90, communication: 88, confidence: 91,
    technicalRelevance: 92, professionalism: 87,
    resumeScore: 84, rec: 'Highly Recommended', rank: 1,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'strong', 'status is strong')
  assert(r.title === 'Strong shortlist candidate', 'title correct')
  assert(Array.isArray(r.reasons) && r.reasons.length > 0, 'reasons non-empty')
  assert(r.strengths.some(s => s.includes('#1')), 'rank 1 in strengths')
  assert(r.strengths.some(s => s.includes('ATS')), 'resume strength noted')
  assert(!r.summary.includes('undefined'), 'no undefined in summary')
})

/* ─── Consider candidate ─────────────────────────────────────────────────── */
test('Consider candidate (score 75)', () => {
  const c = {
    interviewScore: 75, communication: 74, confidence: 77,
    technicalRelevance: 73, professionalism: 76,
    resumeScore: 70, rec: 'Recommended', rank: 4,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'consider', 'status is consider')
  assert(r.title === 'Consider for shortlist', 'title correct')
  assert(r.reasons.some(s => s.includes('75/100')), 'overall score in reasons')
})

/* ─── Review candidate ───────────────────────────────────────────────────── */
test('Review candidate (score 58)', () => {
  const c = {
    interviewScore: 58, communication: 55, confidence: 60,
    technicalRelevance: 57, professionalism: 60,
    resumeScore: 50, rec: 'Needs Review', rank: 7,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'review', 'status is review')
  assert(r.concerns.length > 0, 'concerns non-empty')
})

/* ─── Weak candidate ─────────────────────────────────────────────────────── */
test('Weak candidate (score 40)', () => {
  const c = {
    interviewScore: 40, communication: 38, confidence: 42,
    technicalRelevance: 39, professionalism: 41,
    resumeScore: null, rec: 'Not Recommended', rank: 10,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'weak', 'status is weak')
  assert(r.title === 'Below current shortlist benchmark', 'title correct')
  assert(r.concerns.some(s => s.includes('not available') || s.includes('not submitted')), 'missing resume in concerns')
})

/* ─── Missing resume score ───────────────────────────────────────────────── */
test('Missing resume score', () => {
  const c = {
    interviewScore: 82, communication: 80, confidence: 85,
    technicalRelevance: 83, professionalism: 80,
    resumeScore: null, rec: 'Recommended', rank: 2,
  }
  const r = computeShortlistInsight(c)
  assert(r.concerns.some(s => s.toLowerCase().includes('resume') || s.toLowerCase().includes('ats')), 'resume concern present')
  assert(!r.reasons.some(s => s.includes('null')), 'no null in reasons')
  assert(!r.reasons.some(s => s.includes('undefined')), 'no undefined in reasons')
})

/* ─── One interview / no category data (legacy) ─────────────────────────── */
test('Legacy interview — no M7 category data', () => {
  const c = {
    interviewScore: 72, communication: null, confidence: null,
    technicalRelevance: null, professionalism: null,
    resumeScore: null, rec: 'Recommended', rank: 3,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'consider', 'status correct despite null cats')
  assert(r.concerns.some(s => s.toLowerCase().includes('category') || s.toLowerCase().includes('unavailable')), 'legacy concern present')
  assert(!r.reasons.some(s => s.includes('null')), 'no null values in reasons')
  assert(Array.isArray(r.strengths), 'strengths is array')
})

/* ─── Score = 0 ──────────────────────────────────────────────────────────── */
test('Score = 0 (valid completed interview with zero score)', () => {
  const c = {
    interviewScore: 0, communication: 0, confidence: 0,
    technicalRelevance: 0, professionalism: 0,
    resumeScore: null, rec: 'Not Recommended', rank: 20,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'weak', 'score 0 → weak')
  assert(r.reasons.some(s => s.includes('0/100')), 'zero score in reasons')
  assert(!r.summary.includes('undefined'), 'no undefined in summary')
})

/* ─── Score = 100 ────────────────────────────────────────────────────────── */
test('Score = 100 (perfect score)', () => {
  const c = {
    interviewScore: 100, communication: 100, confidence: 100,
    technicalRelevance: 100, professionalism: 100,
    resumeScore: 95, rec: 'Highly Recommended', rank: 1,
    questionsAnswered: 10, questionCount: 10,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'strong', 'score 100 → strong')
  assert(r.strengths.some(s => s.includes('100')), '100 score in strengths')
  assert(r.strengths.some(s => s.includes('all 10')), 'full completion in strengths')
})

/* ─── Missing all data ───────────────────────────────────────────────────── */
test('Missing all data (null candidate)', () => {
  const r = computeShortlistInsight(null)
  assert(r.status === 'unknown', 'null → unknown')
  assert(Array.isArray(r.reasons), 'reasons is array')
  assert(Array.isArray(r.strengths), 'strengths is array')
  assert(Array.isArray(r.concerns), 'concerns is array')
})

/* ─── Missing interviewScore only ────────────────────────────────────────── */
test('Missing interview score (no score field)', () => {
  const c = {
    interviewScore: null, resumeScore: 75, rec: null, rank: null,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'unknown', 'null score → unknown')
  assert(r.title === 'Insufficient data', 'title is Insufficient data')
})

/* ─── Determinism — same input → same output ─────────────────────────────── */
test('Determinism — same input always produces identical output', () => {
  const c = {
    interviewScore: 77, communication: 75, confidence: 78,
    technicalRelevance: 80, professionalism: 74,
    resumeScore: 68, rec: 'Recommended', rank: 3,
    performanceRating: 'Good',
  }
  const r1 = computeShortlistInsight(c)
  const r2 = computeShortlistInsight(c)
  const r3 = computeShortlistInsight(c)
  assert(r1.status === r2.status && r2.status === r3.status, 'status identical')
  assert(r1.title  === r2.title  && r2.title  === r3.title,  'title identical')
  assert(JSON.stringify(r1.reasons) === JSON.stringify(r2.reasons), 'reasons array identical')
  assert(JSON.stringify(r1.strengths) === JSON.stringify(r3.strengths), 'strengths identical')
  assert(JSON.stringify(r1.concerns) === JSON.stringify(r3.concerns), 'concerns identical')
})

/* ─── Partial category data ──────────────────────────────────────────────── */
test('Only some category scores available (partial M7)', () => {
  const c = {
    interviewScore: 80, communication: 78, confidence: null,
    technicalRelevance: 82, professionalism: null,
    resumeScore: null, rec: 'Recommended', rank: 2,
  }
  const r = computeShortlistInsight(c)
  assert(r.status === 'strong' || r.status === 'consider', 'status based on score')
  assert(r.reasons.some(s => s.includes('Communication')), 'communication in reasons')
  assert(r.reasons.some(s => s.includes('Technical Relevance')), 'technical in reasons')
  assert(!r.reasons.some(s => s.includes('Confidence')), 'null confidence NOT in reasons')
  assert(!r.reasons.some(s => s.includes('Professionalism') && s.includes('null')), 'no null professionalism in reasons')
})

/* ─── No .toFixed() crash on score values ─────────────────────────────────── */
test('No crash on nullish score values (safety check)', () => {
  const inputs = [
    { interviewScore: null, resumeScore: null },
    { interviewScore: undefined, resumeScore: undefined },
    { interviewScore: 0, resumeScore: 0 },
    { interviewScore: 'not-a-number', resumeScore: 'bad' },
  ]
  for (const input of inputs) {
    let threw = false
    try { computeShortlistInsight(input) } catch { threw = true }
    assert(!threw, `no throw for input: ${JSON.stringify(input)}`)
  }
})

/* ─── Concern for low category below overall score ───────────────────────── */
test('Category notably below overall score triggers concern', () => {
  const c = {
    interviewScore: 85, communication: 60, confidence: 88,
    technicalRelevance: 90, professionalism: 87,
    resumeScore: 80, rec: 'Recommended', rank: 2,
  }
  const r = computeShortlistInsight(c)
  assert(r.concerns.some(s => s.toLowerCase().includes('communication')), 'communication gap → concern')
})

/* ─── Question completion signal ─────────────────────────────────────────── */
test('Low question completion adds concern', () => {
  const c = {
    interviewScore: 75, communication: 73, confidence: 76,
    technicalRelevance: 75, professionalism: 74,
    resumeScore: null, rec: 'Recommended', rank: 5,
    questionsAnswered: 3, questionCount: 8,
  }
  const r = computeShortlistInsight(c)
  assert(r.concerns.some(s => s.includes('3/8') || s.includes('37%')), 'low completion in concerns')
})

/* ─── Print results ──────────────────────────────────────────────────────── */
console.log('\n============================================================')
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('============================================================')
if (failed > 0) {
  console.error('  ✗ Some shortlist insight tests FAILED')
  process.exit(1)
} else {
  console.log('  All shortlist insight tests PASSED')
}
