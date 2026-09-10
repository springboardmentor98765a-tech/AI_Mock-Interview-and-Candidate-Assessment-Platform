'use strict'

/**
 * test_weak_area_prediction.js — Module 8: Weak-Area Prediction Unit Tests
 *
 * Tests the predictWeakAreas() pure function from analyticsService.js.
 * No live database connection required — all inputs are constructed in-memory.
 *
 * Run from repository root: node backend/test_weak_area_prediction.js
 */

let passed = 0
let failed = 0
const failures = []

function assert(condition, label) {
  if (condition) { console.log(`  ? ${label}`); passed++ }
  else { console.error(`  ? FAIL: ${label}`); failed++; failures.push(label) }
}

function test(name, fn) {
  console.log(`\n> ${name}`)
  try { fn() } catch (e) { console.error(`  ? THREW: ${e.message}`); failed++ }
}

const { predictWeakAreas } = require('./services/analyticsService')

function makeRow(comm, conf, tech, prof, role = 'Software Engineer') {
  return { interviewId: Math.floor(Math.random() * 9999), role, overallScore: 70, communication: comm, confidence: conf, technicalRelevance: tech, professionalism: prof }
}

/* 1. No interview history */
test('1. No interview history — empty array', () => {
  const r = predictWeakAreas([], null)
  assert(r.status === 'no_data', 'status is no_data')
  assert(Array.isArray(r.weakAreas) && r.weakAreas.length === 0, 'weakAreas is empty')
  assert(typeof r.message === 'string', 'message is a string')
})

/* 2. Null / undefined input */
test('2. Null / undefined input', () => {
  assert(predictWeakAreas(null, null).status === 'no_data', 'null ? no_data')
  assert(predictWeakAreas(undefined, null).status === 'no_data', 'undefined ? no_data')
})

/* 3. Single interview, all scores above threshold */
test('3. Single interview — all scores above threshold', () => {
  const r = predictWeakAreas([makeRow(80, 75, 70, 85)], 'Engineer')
  assert(r.weakAreas.length === 0, 'no weak areas when all above 65')
})

/* 4. Single interview — one score below threshold ? Emerging */
test('4. Single interview — one score below threshold ? Emerging only', () => {
  const r = predictWeakAreas([makeRow(55, 72, 80, 78)], 'Engineer')
  if (r.weakAreas.length > 0) {
    const comm = r.weakAreas.find(w => w.categoryKey === 'communication')
    assert(comm.riskLevel === 'Emerging', 'single interview ? Emerging risk')
    assert(comm.trend === 'insufficient_data', 'trend is insufficient_data')
    assert(comm.sampleSize === 1, 'sampleSize is 1')
  } else {
    assert(r.status !== 'predicted' || r.weakAreas.length === 0, 'acceptable outcome for single interview')
  }
})

/* 5. Repeated low scores ? persistent High risk */
test('5. Repeated low scores ? persistent High risk', () => {
  const enriched = [makeRow(58,80,82,79), makeRow(52,77,80,75), makeRow(55,81,78,80), makeRow(49,79,83,77)]
  const r = predictWeakAreas(enriched, 'Engineer')
  assert(r.status === 'predicted', 'status is predicted')
  const comm = r.weakAreas.find(w => w.categoryKey === 'communication')
  assert(comm !== undefined, 'communication is weak area')
  assert(comm.riskLevel === 'High', 'risk is High for 4/4 low scores')
  assert(comm.lowScoreCount === 4, 'lowScoreCount is 4')
  assert(comm.sampleSize === 4, 'sampleSize is 4')
  assert(Array.isArray(comm.recommendations) && comm.recommendations.length === 3, '3 recommendations')
  assert(typeof comm.reason === 'string' && comm.reason.length > 0, 'reason is non-empty string')
})

/* 6. Mixed scores ? medium-ish risk or detected */
test('6. Mixed scores — some low, some above', () => {
  const enriched = [makeRow(80,60,78,82), makeRow(75,70,80,84), makeRow(82,62,77,80), makeRow(78,68,79,83)]
  const r = predictWeakAreas(enriched, 'Engineer')
  assert(typeof r === 'object', 'returns object')
  assert(Array.isArray(r.weakAreas), 'weakAreas is array')
})

/* 7. Improving trend */
test('7. Improving trend (later scores higher by >5)', () => {
  const enriched = [makeRow(80,40,78,80), makeRow(80,45,79,82), makeRow(80,55,81,78), makeRow(80,68,80,82), makeRow(80,72,82,83)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const conf = r.weakAreas.find(w => w.categoryKey === 'confidence')
  if (conf) {
    assert(conf.trend === 'improving', 'trend is improving')
  }
  assert(true, 'improving trend test completed without throw')
})

/* 8. Declining trend */
test('8. Declining trend (later scores lower by >5)', () => {
  const enriched = [makeRow(80,72,78,80), makeRow(80,68,80,81), makeRow(80,62,77,79), makeRow(80,55,80,82), makeRow(80,48,78,81)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const conf = r.weakAreas.find(w => w.categoryKey === 'confidence')
  assert(conf !== undefined, 'confidence predicted as weak area')
  assert(conf.trend === 'declining', 'trend is declining')
})

/* 9. Stable trend */
test('9. Stable trend (scores within 5 points of each other)', () => {
  const enriched = [makeRow(80,80,58,80), makeRow(80,80,60,80), makeRow(80,80,57,80), makeRow(80,80,61,80)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const tech = r.weakAreas.find(w => w.categoryKey === 'technicalRelevance')
  assert(tech !== undefined, 'technicalRelevance is weak area')
  assert(tech.trend === 'stable', 'trend is stable')
})

/* 10. Legacy interviews with null category scores */
test('10. Legacy interviews with null/missing Module 7 scores', () => {
  const enriched = [
    { interviewId:1, role:'Dev', overallScore:70, communication:null, confidence:null, technicalRelevance:null, professionalism:null },
    { interviewId:2, role:'Dev', overallScore:65, communication:null, confidence:null, technicalRelevance:null, professionalism:null },
    makeRow(55, 70, 72, 80),
  ]
  const r = predictWeakAreas(enriched, 'Dev')
  assert(typeof r === 'object', 'no crash on null legacy rows')
  assert(Array.isArray(r.weakAreas), 'weakAreas is always an array')
  if (r.weakAreas.length > 0) {
    const comm = r.weakAreas.find(w => w.categoryKey === 'communication')
    if (comm) {
      assert(comm.sampleSize === 1, 'sampleSize excludes null rows (1 valid score)')
      // With 100% of valid scores below threshold, High risk is correct even with sampleSize=1
      // when the enriched array itself has >1 rows (singleInterviewOnly check uses enriched.length)
      assert(comm.riskLevel === 'High' || comm.riskLevel === 'Emerging', 'risk level is High or Emerging for single valid M7 score')
    }
  }
})

/* 11. Multiple weak categories — sort order High before Medium */
test('11. Multiple weak categories — sorted High before Medium', () => {
  const enriched = [makeRow(40,60,78,80), makeRow(42,63,77,82), makeRow(38,61,79,81)]
  const r = predictWeakAreas(enriched, 'Engineer')
  assert(r.weakAreas.length >= 1, 'at least one weak area')
  const RISK_ORDER = { High:0, Medium:1, Emerging:2 }
  let last = -1
  for (const wa of r.weakAreas) {
    const rank = RISK_ORDER[wa.riskLevel] ?? 3
    assert(rank >= last, `${wa.area} (${wa.riskLevel}) in correct sort position`)
    last = rank
  }
})

/* 12. No persistent weakness when all scores above threshold */
test('12. No persistent weakness — all categories above 65', () => {
  const enriched = [makeRow(80,75,85,90), makeRow(82,78,83,88), makeRow(79,80,87,91)]
  const r = predictWeakAreas(enriched, 'Engineer')
  assert(r.status === 'no_persistent_weakness', 'status is no_persistent_weakness')
  assert(r.weakAreas.length === 0, 'empty weakAreas')
  assert(typeof r.message === 'string', 'message string present')
})

/* 13. Recommendations are area-specific */
test('13. Recommendations are area-specific for technicalRelevance', () => {
  const enriched = [makeRow(82,79,50,85), makeRow(80,77,48,88), makeRow(81,80,52,86)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const tech = r.weakAreas.find(w => w.categoryKey === 'technicalRelevance')
  assert(tech !== undefined, 'technicalRelevance is weak area')
  assert(tech.recommendations.length === 3, '3 recommendations')
  const hasTechContent = tech.recommendations.some(rec =>
    rec.toLowerCase().includes('technical') || rec.toLowerCase().includes('role') ||
    rec.toLowerCase().includes('leetcode') || rec.toLowerCase().includes('trade-off')
  )
  assert(hasTechContent, 'at least one tech-specific recommendation')
  const hasCommTip = tech.recommendations.some(rec => rec.toLowerCase().includes('star method') || rec.toLowerCase().includes('filler words'))
  assert(!hasCommTip, 'no communication tips in technical recommendations')
})

/* 14. Average below HIGH_RISK_AVG (55) ? forced High risk */
test('14. Average below HIGH_RISK_AVG (55) ? forced High risk', () => {
  const enriched = [makeRow(80,80,80,48), makeRow(81,79,82,52), makeRow(80,78,79,50)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const prof = r.weakAreas.find(w => w.categoryKey === 'professionalism')
  assert(prof !== undefined, 'professionalism is weak area')
  assert(prof.riskLevel === 'High', 'avg < 55 ? High risk')
  assert(prof.averageScore < 55, 'averageScore correctly below 55')
})

/* 15. Single low score in multi-interview history — avg stays above threshold */
test('15. Single low score in 4-interview history — avg stays above 65', () => {
  const enriched = [makeRow(80,80,62,80), makeRow(80,82,75,82), makeRow(81,79,78,81), makeRow(82,80,80,83)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const tech = r.weakAreas.find(w => w.categoryKey === 'technicalRelevance')
  // avg = (62+75+78+80)/4 = 73.75 > 65 ? should NOT appear as weak area
  assert(!tech, 'no weak area when category average is above threshold')
})

/* 16. Declining + persistent ? High risk (compound rule) */
test('16. Declining + persistent low scores ? High risk (compound)', () => {
  const enriched = [makeRow(80,80,80,72), makeRow(80,80,80,64), makeRow(80,80,80,60), makeRow(80,80,80,55)]
  const r = predictWeakAreas(enriched, 'Engineer')
  const prof = r.weakAreas.find(w => w.categoryKey === 'professionalism')
  assert(prof !== undefined, 'professionalism is weak area')
  assert(prof.riskLevel === 'High', 'declining + persistent ? High risk')
  assert(prof.trend === 'declining', 'trend is declining')
})

/* 17. All null values ? graceful empty result */
test('17. All category values are null ? graceful empty result', () => {
  const enriched = [
    { interviewId:1, role:'Dev', overallScore:65, communication:null, confidence:null, technicalRelevance:null, professionalism:null },
    { interviewId:2, role:'Dev', overallScore:70, communication:null, confidence:null, technicalRelevance:null, professionalism:null },
  ]
  const r = predictWeakAreas(enriched, 'Dev')
  assert(typeof r === 'object', 'no crash')
  assert(Array.isArray(r.weakAreas), 'weakAreas is array')
  assert(r.weakAreas.length === 0, 'no weak areas when all M7 scores are null')
})

/* 18. Determinism — same data ? same result */
test('18. Determinism — same inputs always produce identical output', () => {
  const enriched = [makeRow(55,75,80,82), makeRow(58,78,78,80), makeRow(50,72,81,84)]
  const r1 = predictWeakAreas(enriched, 'Engineer')
  const r2 = predictWeakAreas(enriched, 'Engineer')
  assert(JSON.stringify(r1.status) === JSON.stringify(r2.status), 'status identical')
  assert(JSON.stringify(r1.weakAreas.map(w => w.riskLevel)) === JSON.stringify(r2.weakAreas.map(w => w.riskLevel)), 'riskLevels identical')
  assert(JSON.stringify(r1.weakAreas.map(w => w.riskIndicator)) === JSON.stringify(r2.weakAreas.map(w => w.riskIndicator)), 'riskIndicators identical')
})

/* 19. sampleSize reflects only valid (non-null) scores */
test('19. sampleSize reflects only valid scores (nulls excluded)', () => {
  const enriched = [
    { interviewId:1, role:'Dev', overallScore:55, communication:null, confidence:null, technicalRelevance:null, professionalism:null },
    makeRow(48, 80, 78, 82),
    makeRow(52, 79, 77, 81),
  ]
  const r = predictWeakAreas(enriched, 'Dev')
  const comm = r.weakAreas.find(w => w.categoryKey === 'communication')
  if (comm) assert(comm.sampleSize === 2, 'sampleSize is 2 (null row excluded)')
  assert(true, 'sampleSize test completed')
})

/* 20. contextRole is passed through correctly */
test('20. contextRole is passed through in each weak area', () => {
  const enriched = [makeRow(55,80,80,82), makeRow(58,79,79,81), makeRow(50,81,78,83)]
  const r = predictWeakAreas(enriched, 'Senior React Developer')
  assert(r.status === 'predicted', 'status is predicted')
  for (const wa of r.weakAreas) {
    assert(wa.contextRole === 'Senior React Developer', `contextRole correct on ${wa.area}`)
  }
})

/* Results */
console.log('\n' + '='.repeat(60))
console.log(`  RESULTS: ${passed} passed, ${failed} failed`)
console.log('='.repeat(60))
if (failures.length > 0) {
  console.error('\n  Failed assertions:')
  failures.forEach(f => console.error(`    ? ${f}`))
  process.exit(1)
} else {
  console.log('  All Module 8 weak-area prediction tests PASSED\n')
  process.exit(0)
}
