'use strict'

/**
 * test_improvement_progress.js
 *
 * Tests the pure deterministic computeImprovementProgress function.
 * Runs with: node backend/test_improvement_progress.js
 */

const { computeImprovementProgress } = require('./services/analyticsService')

/* ─── Test runner ─────────────────────────────────────────────────────────── */
let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { console.log(`  ✓ ${label}`); passed++ }
  else { console.error(`  ✗ FAIL: ${label}`); failed++ }
}

function test(name, fn) {
  console.log(`\n> ${name}`)
  try { fn() } catch (e) { console.error(`  ✗ THREW: ${e.message}`); failed++ }
}

/* ─── Helper: build enriched row ─────────────────────────────────────────── */
function row(overall, comm, conf, tech, prof) {
  return {
    overallScore:       overall !== undefined ? overall : null,
    communication:      comm    !== undefined ? comm    : null,
    confidence:         conf    !== undefined ? conf    : null,
    technicalRelevance: tech    !== undefined ? tech    : null,
    professionalism:    prof    !== undefined ? prof    : null,
  }
}

/* ─── Edge case: zero interviews ────────────────────────────────────────────── */
test('Zero interviews → no_data', () => {
  const r = computeImprovementProgress([])
  assert(r.status === 'no_data', 'status is no_data')
  assert(r.interviewsAnalysed === 0, 'interviewsAnalysed is 0')
  assert(typeof r.message === 'string' && r.message.length > 0, 'message present')
})

/* ─── Edge case: null input ─────────────────────────────────────────────────── */
test('Null/undefined input → no_data', () => {
  const r1 = computeImprovementProgress(null)
  const r2 = computeImprovementProgress(undefined)
  assert(r1.status === 'no_data', 'null → no_data')
  assert(r2.status === 'no_data', 'undefined → no_data')
})

/* ─── Edge case: one interview → insufficient_history ───────────────────────── */
test('One interview → insufficient_history', () => {
  const r = computeImprovementProgress([row(75, 70, 72, 78, 74)])
  assert(r.status === 'insufficient_history', 'status is insufficient_history')
  assert(r.interviewsAnalysed === 1, 'interviewsAnalysed is 1')
  assert(typeof r.message === 'string', 'message is a string')
  assert(r.overall?.status === 'insufficient_history', 'overall is insufficient_history')
  assert(r.overall?.earlierAverage === 75, 'earlierAverage is single score')
  assert(r.overall?.laterAverage === null, 'laterAverage is null')
  assert(r.overall?.delta === null, 'delta is null')
})

/* ─── Two interviews (minimum for tracking) ─────────────────────────────────── */
test('Two interviews → status tracked', () => {
  const r = computeImprovementProgress([
    row(60, 58, 60, 62, 60),
    row(80, 78, 79, 82, 78),
  ])
  assert(r.status === 'tracked', 'status is tracked')
  assert(r.interviewsAnalysed === 2, 'interviewsAnalysed is 2')
  assert(r.overall?.status === 'tracked', 'overall tracked')
  assert(r.overall?.earlierAverage === 60, 'earlier average = 60')
  assert(r.overall?.laterAverage === 80, 'later average = 80')
  assert(r.overall?.delta === 20, 'delta = 20')
  assert(r.overall?.direction === 'improving', 'direction is improving')
})

/* ─── Improving overall score ───────────────────────────────────────────────── */
test('Improving overall scores (delta > 5)', () => {
  const r = computeImprovementProgress([
    row(60), row(65), row(70), row(80), row(85),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.direction === 'improving', 'direction improving')
  assert(r.overall.delta > 5, 'delta > 5')
  assert(r.overall.earlierAverage < r.overall.laterAverage, 'later > earlier')
  assert(typeof r.summary === 'string' && r.summary.includes('improved'), 'summary mentions improved')
})

/* ─── Declining overall score ───────────────────────────────────────────────── */
test('Declining overall scores (delta < -5)', () => {
  const r = computeImprovementProgress([
    row(85), row(80), row(70), row(60), row(55),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.direction === 'declining', 'direction declining')
  assert(r.overall.delta < -5, 'delta < -5')
  assert(typeof r.summary === 'string' && r.summary.includes('declined'), 'summary mentions declined')
})

/* ─── Stable overall scores (|delta| ≤ 5) ──────────────────────────────────── */
test('Stable overall scores (|delta| ≤ 5)', () => {
  const r = computeImprovementProgress([
    row(70), row(72), row(71), row(73), row(72),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.direction === 'stable', 'direction stable')
  assert(Math.abs(r.overall.delta) <= 5, '|delta| ≤ 5')
  assert(typeof r.summary === 'string' && r.summary.includes('stable'), 'summary mentions stable')
})

/* ─── Category-specific improvement ────────────────────────────────────────── */
test('Communication improving, technical declining', () => {
  const r = computeImprovementProgress([
    row(70, 50, 70, 80, 70),
    row(75, 60, 70, 75, 70),
    row(80, 80, 70, 70, 70),
    row(85, 90, 70, 65, 70),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.categories.communication.direction === 'improving', 'communication improving')
  assert(r.categories.technicalRelevance.direction === 'declining', 'technical declining')
  assert(r.categories.confidence.direction === 'stable', 'confidence stable')
})

/* ─── Category-specific decline ─────────────────────────────────────────────── */
test('Professionalism declining', () => {
  const r = computeImprovementProgress([
    row(75, 75, 75, 75, 80),
    row(73, 73, 73, 73, 72),
    row(71, 71, 71, 71, 60),
    row(69, 69, 69, 69, 50),
  ])
  assert(r.categories.professionalism.direction === 'declining', 'professionalism declining')
})

/* ─── Legacy interviews excluded: only overall scores, null categories ──────── */
test('Legacy interviews (null M7 categories) — overall tracked, categories insufficient', () => {
  // All interviews have overall score but no M7 category data
  const r = computeImprovementProgress([
    row(60, null, null, null, null),
    row(70, null, null, null, null),
    row(80, null, null, null, null),
  ])
  assert(r.status === 'tracked', 'overall tracked from legacy interviews')
  assert(r.overall.direction === 'improving', 'overall improving')
  // Categories should all be insufficient since null
  assert(r.categories.communication.status === 'insufficient_history', 'comm insufficient')
  assert(r.categories.confidence.status === 'insufficient_history', 'conf insufficient')
  assert(r.categories.technicalRelevance.status === 'insufficient_history', 'tech insufficient')
  assert(r.categories.professionalism.status === 'insufficient_history', 'prof insufficient')
})

/* ─── Mix of legacy + M7 interviews ────────────────────────────────────────── */
test('1 valid M7 + 2 legacy — M7 category insufficient, overall tracked', () => {
  const r = computeImprovementProgress([
    row(65, null, null, null, null),  // legacy: no M7
    row(70, null, null, null, null),  // legacy: no M7
    row(80, 78, 79, 82, 77),          // valid M7
  ])
  assert(r.status === 'tracked', 'overall tracked (3 valid overall scores)')
  assert(r.overall.validCount === 3, 'validCount = 3')
  // M7 categories: only 1 valid value each → insufficient
  assert(r.categories.communication.status === 'insufficient_history', 'comm insufficient (only 1 M7)')
})

/* ─── Score 0 is valid (not excluded) ──────────────────────────────────────── */
test('Score = 0 is a valid data point', () => {
  const r = computeImprovementProgress([
    row(0, 0, 0, 0, 0),
    row(50, 50, 50, 50, 50),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.earlierAverage === 0, 'earlierAverage is 0, not excluded')
  assert(r.overall.laterAverage === 50, 'laterAverage is 50')
  assert(r.overall.delta === 50, 'delta = 50')
  assert(r.overall.direction === 'improving', 'improving')
})

/* ─── Score 100 is valid ────────────────────────────────────────────────────── */
test('Score = 100 is a valid data point', () => {
  const r = computeImprovementProgress([
    row(100, 100, 100, 100, 100),
    row(90, 88, 90, 92, 89),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.earlierAverage === 100, 'earlierAverage = 100')
  assert(r.overall.direction === 'declining', 'declining from 100 → 90')
})

/* ─── Missing category in some interviews (partial M7) ─────────────────────── */
test('Partial M7 — communication tracked, others insufficient', () => {
  const r = computeImprovementProgress([
    row(70, 65, null, null, null),
    row(80, 75, null, null, null),
    row(85, 85, null, null, null),
  ])
  assert(r.categories.communication.status === 'tracked', 'comm tracked')
  assert(r.categories.communication.direction === 'improving', 'comm improving')
  assert(r.categories.confidence.status === 'insufficient_history', 'conf insufficient')
  assert(r.categories.technicalRelevance.status === 'insufficient_history', 'tech insufficient')
})

/* ─── Determinism ───────────────────────────────────────────────────────────── */
test('Determinism — identical inputs always produce identical output', () => {
  const input = [
    row(68, 65, 70, 72, 66),
    row(73, 70, 74, 76, 71),
    row(79, 77, 80, 82, 78),
    row(84, 82, 85, 86, 80),
  ]
  const r1 = computeImprovementProgress(input)
  const r2 = computeImprovementProgress(input)
  const r3 = computeImprovementProgress(input)
  assert(r1.status === r2.status && r2.status === r3.status, 'status identical')
  assert(r1.overall.delta === r2.overall.delta && r2.overall.delta === r3.overall.delta, 'delta identical')
  assert(r1.overall.direction === r3.overall.direction, 'direction identical')
  assert(JSON.stringify(r1.categories) === JSON.stringify(r2.categories), 'categories identical')
})

/* ─── Large interview history (many interviews) ─────────────────────────────── */
test('Many interviews (8) — correctly splits into halves', () => {
  // Earlier half: first 4 (avg 60), later half: last 4 (avg 80) → delta = 20 → improving
  const r = computeImprovementProgress([
    row(58), row(60), row(61), row(61),
    row(78), row(80), row(81), row(81),
  ])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.direction === 'improving', 'improving')
  assert(r.overall.validCount === 8, 'validCount = 8')
  assert(r.overall.earlierAverage === 60, 'earlier avg = 60')
  assert(r.overall.laterAverage === 80, 'later avg = 80')
})

/* ─── No .toFixed() or crash on nullish scores ──────────────────────────────── */
test('No crash on nullish / malformed score values', () => {
  const inputs = [
    [row(null), row(null)],
    [row(undefined), row(undefined)],
    [row('not-a-number'), row('bad')],
    [row(NaN), row(NaN)],
  ]
  for (const input of inputs) {
    let threw = false
    try { computeImprovementProgress(input) } catch { threw = true }
    assert(!threw, `no throw for: ${JSON.stringify(input[0]?.overallScore)}`)
  }
})

/* ─── interviewsAnalysed reflects total rows, not just valid scored ─────────── */
test('interviewsAnalysed = total row count including nulls', () => {
  const r = computeImprovementProgress([
    row(null), row(null), row(70), row(80),
  ])
  // overall has 2 valid scores → tracked; interviewsAnalysed = 4
  assert(r.interviewsAnalysed === 4, 'interviewsAnalysed = 4 (all rows)')
  assert(r.overall.validCount === 2, 'validCount = 2 (non-null only)')
})

/* ─── Half-split boundary: 3 interviews splits 2+1 (ceil(3/2)=2) ───────────── */
test('3 interviews: earlier=2, later=1 (ceil-split)', () => {
  const r = computeImprovementProgress([row(60), row(70), row(90)])
  // mid = ceil(3/2) = 2; earlier=[60,70] avg=65; later=[90] avg=90; delta=25
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.earlierAverage === 65, 'earlier avg = 65')
  assert(r.overall.laterAverage === 90, 'later avg = 90')
  assert(r.overall.delta === 25, 'delta = 25')
  assert(r.overall.direction === 'improving', 'improving')
})

/* ─── Exactly at threshold boundary (delta = 5 = TREND_MIN_DELTA) ─────────── */
test('Delta exactly 5 → stable (not improving, boundary)', () => {
  // earlier=[70], later=[75], delta=5 — NOT strictly greater than 5 → stable
  const r = computeImprovementProgress([row(70), row(75)])
  assert(r.status === 'tracked', 'tracked')
  assert(r.overall.delta === 5, 'delta = 5')
  assert(r.overall.direction === 'stable', 'direction stable (≤5 threshold)')
})

/* ─── Delta just above threshold (delta = 5.1 → improving) ─────────────────── */
test('Delta 5.1 → improving', () => {
  // earlier=[70], later=[75.1→rounds to 75] → may be stable; use safe values
  // earlier=[60], later=[66] → delta=6 → improving
  const r = computeImprovementProgress([row(60), row(66)])
  assert(r.overall.direction === 'improving', 'delta 6 → improving')
})

/* ─── Print results ─────────────────────────────────────────────────────────── */
console.log('\n============================================================')
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('============================================================')
if (failed > 0) {
  console.error('  ✗ Some improvement progress tests FAILED')
  process.exit(1)
} else {
  console.log('  All improvement progress tests PASSED')
}
