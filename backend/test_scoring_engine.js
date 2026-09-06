'use strict'

const {
  computeModule7Scores,
  computePerformanceRating,
  _internal: {
    computeCommunicationScore,
    computeConfidenceScore,
    computeTechnicalRelevanceScore,
    computeProfessionalismScore,
    weightedAvailable,
    clamp100,
  },
} = require('./services/scoringEngine')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error('  FAIL:', msg)
  }
}

function test(name, fn) {
  console.log('\n>', name)
  fn()
}

const EVALUATION_FULL = {
  overall_score: 72,
  category_scores: {
    technical:       80,
    communication:   75,
    problem_solving: 70,
    confidence:      65,
    grammar:         78,
  },
  question_feedback: [],
  strengths: ['Strong technical answers'],
  weaknesses: ['Some filler words'],
  recommendations: ['Practice pacing'],
  overall_feedback: 'Solid performance.',
  hire_recommendation: 'Consider',
}

const SPEECH_SUMMARY_FULL = {
  avg_communication_score: 73,
  avg_grammar_score:       76,
  avg_words_per_minute:    140,
  avg_filler_rate:         4,
  dominant_pace:           'Normal',
  answers_analysed:        5,
  total_answers:           5,
}

const CV_ANALYSIS_FULL = {
  engagement_estimate:   0.72,
  confidence_indicator:  0.68,
  attention_score:       0.75,
  eye_contact_pct:       65.0,
  warning_count:         1,
  avg_face_visibility:   78.5,
  face_detection_rate:   0.91,
}

const QUESTIONS_WITH_ANSWERS = [
  { id: 1, answer: 'I would approach this by...', timeTaken: 75,  question: 'Q1', expected_points: [] },
  { id: 2, answer: 'The key difference is...',   timeTaken: 90,  question: 'Q2', expected_points: [] },
  { id: 3, answer: 'In my experience...',         timeTaken: 45,  question: 'Q3', expected_points: [] },
  { id: 4, answer: 'This can be done via...',     timeTaken: 120, question: 'Q4', expected_points: [] },
  { id: 5, answer: 'The trade-off is...',         timeTaken: 60,  question: 'Q5', expected_points: [] },
]

// TEST 1
test('TEST 1: Communication score from blended evaluation', function() {
  var result = computeCommunicationScore(EVALUATION_FULL, SPEECH_SUMMARY_FULL)
  assert(result.score === 75, 'Should use evaluation_communication (75), got ' + result.score)
  assert(result.sources.includes('evaluation_communication_blended'), 'Wrong source')
})

// TEST 2
test('TEST 2: Communication score fallback to speech when LLM comm is 0', function() {
  var evalNoComm = Object.assign({}, EVALUATION_FULL, {
    category_scores: Object.assign({}, EVALUATION_FULL.category_scores, { communication: 0 }),
  })
  var result = computeCommunicationScore(evalNoComm, SPEECH_SUMMARY_FULL)
  assert(result.score === 73, 'Expected 73 got ' + result.score)
  assert(result.sources.includes('speech_analysis_avg_communication'), 'Wrong source')
})

// TEST 3
test('TEST 3: Communication score null when all sources missing', function() {
  var result = computeCommunicationScore({ category_scores: { communication: 0 } }, null)
  assert(result.score === null, 'Should be null, got ' + result.score)
})

// TEST 4
test('TEST 4: Confidence score 50% CV + 50% LLM blend', function() {
  var result = computeConfidenceScore(EVALUATION_FULL, CV_ANALYSIS_FULL)
  // cvComposite = 72*0.35 + 68*0.35 + 75*0.20 + 65*0.10
  //             = 25.2 + 23.8 + 15.0 + 6.5 = 70.5
  // final = 70.5*0.50 + 65*0.50 = 67.75 -> 68
  var expected = Math.round(70.5 * 0.50 + 65 * 0.50)
  assert(result.score === expected, 'Expected ' + expected + ' got ' + result.score)
  assert(result.cvWeightPct === 50, 'CV weight should be 50')
  assert(result.sources.includes('cv_behavioral_composite'), 'Should include CV source')
  assert(result.sources.includes('llm_confidence'), 'Should include LLM source')
})

// TEST 5
test('TEST 5: Confidence score LLM only when cvAnalysis is null', function() {
  var result = computeConfidenceScore(EVALUATION_FULL, null)
  assert(result.score === 65, 'Should equal LLM confidence (65), got ' + result.score)
  assert(result.cvWeightPct === 0, 'CV weight should be 0')
})

// TEST 6
test('TEST 6: Technical relevance blend of technical+problem_solving', function() {
  var result = computeTechnicalRelevanceScore(EVALUATION_FULL)
  assert(result.score === 75, 'Expected 75 got ' + result.score)
  assert(result.sources.includes('llm_technical'), 'Missing technical source')
  assert(result.sources.includes('llm_problem_solving'), 'Missing problem_solving source')
})

// TEST 7
test('TEST 7: Technical relevance — technical only when problem_solving=0', function() {
  var evalNoPsol = Object.assign({}, EVALUATION_FULL, {
    category_scores: Object.assign({}, EVALUATION_FULL.category_scores, { problem_solving: 0 }),
  })
  var result = computeTechnicalRelevanceScore(evalNoPsol)
  assert(result.score === 80, 'Expected 80 got ' + result.score)
  assert(!result.sources.includes('llm_problem_solving'), 'Should NOT include problem_solving')
})

// TEST 8
test('TEST 8: Professionalism all four components (no fabrication)', function() {
  var result = computeProfessionalismScore(EVALUATION_FULL, SPEECH_SUMMARY_FULL, CV_ANALYSIS_FULL, QUESTIONS_WITH_ANSWERS)
  assert(result.score !== null, 'Score should not be null')
  assert(result.score >= 0 && result.score <= 100, 'Must be 0-100: ' + result.score)
  assert(result.sources.includes('speech_grammar'), 'Should use speech grammar')
  assert(result.sources.includes('time_management'), 'Should use time management')
  assert(result.sources.includes('live_compliance_etiquette'), 'Should use etiquette')
  // grammar=76(w=0.40), organisation=75(w=0.30), time=100(w=0.20), etiquette=80(w=0.10)
  // = 30.4 + 22.5 + 20 + 8 = 80.9 -> 81
  assert(result.score === 81, 'Expected 81 got ' + result.score)
})

// TEST 9
test('TEST 9: Overall score exact 30/25/30/15 weighted formula', function() {
  var m7 = computeModule7Scores({
    evaluation: EVALUATION_FULL,
    speechSummary: SPEECH_SUMMARY_FULL,
    cvAnalysis: CV_ANALYSIS_FULL,
    questionsWithAnswers: QUESTIONS_WITH_ANSWERS,
  })
  var expectedOverall = Math.round(
    m7.communication.score     * 0.30 +
    m7.confidence.score        * 0.25 +
    m7.technicalRelevance.score * 0.30 +
    m7.professionalism.score   * 0.15
  )
  assert(m7.overallScore === expectedOverall, 'Formula mismatch: expected ' + expectedOverall + ' got ' + m7.overallScore)
  assert(m7.communication.weight      === 0.30, 'Comm weight wrong')
  assert(m7.confidence.weight         === 0.25, 'Conf weight wrong')
  assert(m7.technicalRelevance.weight === 0.30, 'Tech weight wrong')
  assert(m7.professionalism.weight    === 0.15, 'Prof weight wrong')
})

// TEST 10
test('TEST 10: Performance rating boundary values', function() {
  assert(computePerformanceRating(100) === 'Excellent',         '100 -> Excellent')
  assert(computePerformanceRating(90)  === 'Excellent',         '90 -> Excellent')
  assert(computePerformanceRating(89)  === 'Good',              '89 -> Good')
  assert(computePerformanceRating(75)  === 'Good',              '75 -> Good')
  assert(computePerformanceRating(74)  === 'Average',           '74 -> Average')
  assert(computePerformanceRating(60)  === 'Average',           '60 -> Average')
  assert(computePerformanceRating(59)  === 'Needs Improvement', '59 -> Needs Improvement')
  assert(computePerformanceRating(40)  === 'Needs Improvement', '40 -> Needs Improvement')
  assert(computePerformanceRating(39)  === 'Poor',              '39 -> Poor')
  assert(computePerformanceRating(0)   === 'Poor',              '0 -> Poor')
  assert(computePerformanceRating(-5)  === 'Poor',              'negative -> Poor')
})

// TEST 11
test('TEST 11: Missing upstream data graceful handling', function() {
  var m7 = computeModule7Scores({
    evaluation:           null,
    speechSummary:        null,
    cvAnalysis:           null,
    questionsWithAnswers: [],
  })
  assert(m7.communication.score      === null, 'Comm should be null')
  assert(m7.confidence.score         === null, 'Conf should be null')
  assert(m7.technicalRelevance.score === null, 'Tech should be null')
  assert(m7.professionalism.score    === null, 'Prof should be null')
  assert(m7.overallScore             === null, 'Overall should be null')
  assert(m7.performanceRating        === 'Poor', 'Rating should be Poor')
  assert(m7.scoringMeta.hasCvData    === false, 'hasCvData should be false')
  assert(m7.scoringMeta.hasSpeechData === false, 'hasSpeechData should be false')
})

// TEST 12
test('TEST 12: Deterministic (no Math.random())', function() {
  var r1 = computeModule7Scores({ evaluation: EVALUATION_FULL, speechSummary: SPEECH_SUMMARY_FULL, cvAnalysis: null, questionsWithAnswers: QUESTIONS_WITH_ANSWERS })
  var r2 = computeModule7Scores({ evaluation: EVALUATION_FULL, speechSummary: SPEECH_SUMMARY_FULL, cvAnalysis: null, questionsWithAnswers: QUESTIONS_WITH_ANSWERS })
  assert(r1.overallScore            === r2.overallScore, 'Overall must be deterministic')
  assert(r1.communication.score     === r2.communication.score, 'Comm must be deterministic')
  assert(r1.confidence.score        === r2.confidence.score, 'Conf must be deterministic')
  assert(r1.technicalRelevance.score === r2.technicalRelevance.score, 'Tech must be deterministic')
  assert(r1.professionalism.score   === r2.professionalism.score, 'Prof must be deterministic')
})

// TEST 13
test('TEST 13: Partial CV data (only engagement)', function() {
  var partialCv = { engagement_estimate: 0.80 }
  var result = computeConfidenceScore(EVALUATION_FULL, partialCv)
  // cvComposite = 80/0.35 re-normalised = 80
  // final = 80*0.50 + 65*0.50 = 72.5 -> 73
  var expected = Math.round(80 * 0.50 + 65 * 0.50)
  assert(result.score === expected, 'Expected ' + expected + ' got ' + result.score)
  assert(result.cvWeightPct === 50, 'Should blend 50% CV')
})

// TEST 14
test('TEST 14: clamp100 boundary cases', function() {
  assert(clamp100(105)       === 100,  'clamp above 100')
  assert(clamp100(-10)       === 0,    'clamp below 0')
  assert(clamp100(75.6)      === 76,   'round up')
  assert(clamp100(75.4)      === 75,   'round down')
  assert(clamp100(null)      === null, 'null input')
  assert(clamp100(undefined) === null, 'undefined input')
  assert(clamp100(NaN)       === null, 'NaN input')
  assert(clamp100(Infinity)  === null, 'Infinity input')
})

// TEST 15
test('TEST 15: weightedAvailable re-normalises over available pairs', function() {
  var result = weightedAvailable([
    { value: 80,   weight: 0.50 },
    { value: null, weight: 0.25 },
    { value: 60,   weight: 0.25 },
    { value: null, weight: 0.00 },
  ])
  // totalWeight=0.75, totalScore=40+15=55, avg=55/0.75=73.33
  var expected = 55 / 0.75
  assert(Math.abs(result - expected) < 0.01, 'Re-normalised avg wrong: got ' + result)
})

console.log('\n' + '='.repeat(60))
console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed')
console.log('='.repeat(60))
if (failed > 0) { process.exit(1) } else { console.log('  All Module 7 scoring engine tests PASSED'); process.exit(0) }
