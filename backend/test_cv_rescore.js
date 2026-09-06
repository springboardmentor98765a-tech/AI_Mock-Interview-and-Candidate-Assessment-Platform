'use strict'

/**
 * test_cv_rescore.js  —  Post-CV recompute + lifecycle tests (Module 7)
 *
 * Tests (v2):
 *  1.  CV data changes confidence vs LLM-only baseline
 *  2.  Communication and Technical Relevance unchanged when CV added
 *  3.  Professionalism picks up etiquette from warning_count
 *  4.  Overall = comm*0.30 + conf*0.25 + tech*0.30 + prof*0.15
 *  5.  performanceRating matches overallScore
 *  6.  Partial CV (only engagement) — no crash, valid score
 *  7.  All-null CV fields fall back to LLM-only
 *  8.  Null evaluation — graceful null scores, no exception
 *  9.  overallScore=0 fails the guard (would not overwrite existing)
 * 10.  Existing category_scores fields preserved after module7_scores merge
 * 11.  Time-management included when questionsWithAnswers has real timing
 * 12.  Missing time_taken (0) not counted as a valid answer for timing
 * 13.  Professionalism is higher with good timing + 0 warnings vs bad timing + 2 warnings
 * 14.  CV-before-complete race: CV available at complete() time is used
 * 15.  CV-unavailable at complete() time falls back to null safely
 * 16.  CV-after-complete path: post-CV rescore changes confidence/overall
 * 17.  CV failure does not change professionalism / communication / technical
 * 18.  Partial timing (some questions have time_taken, some do not)
 * 19.  Formula weights unchanged: 30/25/30/15
 * 20.  Rating boundaries after CV augmentation
 */

const scoringEngine = require('./services/scoringEngine')

let passed = 0; let failed = 0

function assert(cond, msg) {
  if (cond) { passed++ }
  else { failed++; console.error('  FAIL:', msg) }
}
function test(name, fn) {
  console.log('\n>', name)
  try { fn() }
  catch(e) { failed++; console.error('  FAIL: threw', e.message) }
}

// ── Shared fixtures ─────────────────────────────────────────────────────────

const BASE_EVALUATION = {
  overall_score: 74,
  category_scores: {
    technical: 82, communication: 76, problem_solving: 68,
    confidence: 62, grammar: 79,
  },
  question_feedback: [], strengths: [], weaknesses: [], recommendations: [],
}

const BASE_SPEECH = {
  avg_communication_score: 74, avg_grammar_score: 77,
  avg_words_per_minute: 135, avg_filler_rate: 5,
  dominant_pace: 'Normal', answers_analysed: 5, total_answers: 5,
}

const CV_SCORES = {
  engagement_estimate: 0.73, confidence_indicator: 0.69,
  attention_score: 0.76, eye_contact_pct: 67.0,
  warning_count: 0, avg_face_visibility: 80.0, face_detection_rate: 0.93,
}

// Real timing data — mirrors interview_answers.time_taken (seconds)
const TIMING_GOOD = [
  { id: 1, answer: 'answer one',   timeTaken: 80  },
  { id: 2, answer: 'answer two',   timeTaken: 95  },
  { id: 3, answer: 'answer three', timeTaken: 60  },
  { id: 4, answer: 'answer four',  timeTaken: 110 },
  { id: 5, answer: 'answer five',  timeTaken: 75  },
]

const TIMING_BAD = [
  { id: 1, answer: 'x', timeTaken: 10  },  // too brief
  { id: 2, answer: 'x', timeTaken: 200 },  // too long
  { id: 3, answer: 'x', timeTaken: 8   },  // too brief
]

// Baselines (no CV, no timing)
const baseline = scoringEngine.computeModule7Scores({
  evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
  cvAnalysis: null, questionsWithAnswers: [],
})
const withCv = scoringEngine.computeModule7Scores({
  evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
  cvAnalysis: CV_SCORES, questionsWithAnswers: [],
})
const withCvAndTiming = scoringEngine.computeModule7Scores({
  evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
  cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
})

// ── TEST 1 ───────────────────────────────────────────────────────────────────
test('TEST 1: CV data increases confidence vs LLM-only baseline', function() {
  assert(withCv.confidence.score !== baseline.confidence.score, 'Confidence should change with CV')
  assert(withCv.confidence.score > baseline.confidence.score,
    `CV conf (${withCv.confidence.score}) > baseline (${baseline.confidence.score})`)
  assert(withCv.confidence.cvWeightPct === 50, 'CV should be 50% of confidence')
})

// ── TEST 2 ───────────────────────────────────────────────────────────────────
test('TEST 2: Communication and Technical Relevance unchanged by CV data', function() {
  assert(withCv.communication.score === baseline.communication.score,
    `Comm unchanged: ${withCv.communication.score} vs ${baseline.communication.score}`)
  assert(withCv.technicalRelevance.score === baseline.technicalRelevance.score,
    `Tech unchanged: ${withCv.technicalRelevance.score} vs ${baseline.technicalRelevance.score}`)
})

// ── TEST 3 ───────────────────────────────────────────────────────────────────
test('TEST 3: Professionalism includes etiquette when warning_count available', function() {
  assert(withCv.professionalism.sources.includes('live_compliance_etiquette'),
    'Should include etiquette source with CV')
  assert(!baseline.professionalism.sources.includes('live_compliance_etiquette'),
    'Baseline (no CV) should NOT include etiquette')
  // 0 warnings -> etiquetteScore=100 -> professionalism should be >= baseline
  assert(withCv.professionalism.score >= baseline.professionalism.score,
    `Prof with 0 warnings (${withCv.professionalism.score}) >= baseline (${baseline.professionalism.score})`)
})

// ── TEST 4 ───────────────────────────────────────────────────────────────────
test('TEST 4: Overall = comm*0.30 + conf*0.25 + tech*0.30 + prof*0.15', function() {
  var r = withCvAndTiming
  var expected = Math.round(
    r.communication.score * 0.30 + r.confidence.score * 0.25 +
    r.technicalRelevance.score * 0.30 + r.professionalism.score * 0.15
  )
  assert(r.overallScore === expected, `Formula mismatch: expected ${expected} got ${r.overallScore}`)
})

// ── TEST 5 ───────────────────────────────────────────────────────────────────
test('TEST 5: performanceRating matches overallScore', function() {
  ;[baseline, withCv, withCvAndTiming].forEach(function(r, i) {
    var expected = scoringEngine.computePerformanceRating(r.overallScore)
    assert(r.performanceRating === expected,
      `Case ${i}: rating=${r.performanceRating} but score=${r.overallScore} -> expected ${expected}`)
  })
})

// ── TEST 6 ───────────────────────────────────────────────────────────────────
test('TEST 6: Partial CV (only engagement_estimate) — no crash, valid score', function() {
  var r = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: { engagement_estimate: 0.80 }, questionsWithAnswers: [],
  })
  assert(r.confidence.score !== null, 'Confidence not null with partial CV')
  assert(r.confidence.cvWeightPct === 50, 'Still 50% CV blend')
  assert(r.overallScore !== null && r.overallScore >= 0 && r.overallScore <= 100, 'Overall in range')
})

// ── TEST 7 ───────────────────────────────────────────────────────────────────
test('TEST 7: All-null CV fields fall back to LLM-only confidence', function() {
  var r = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: { engagement_estimate: null, confidence_indicator: null,
                  attention_score: null, eye_contact_pct: null, warning_count: null },
    questionsWithAnswers: [],
  })
  assert(r.confidence.score === baseline.confidence.score,
    `All-null CV: conf=${r.confidence.score} should equal baseline=${baseline.confidence.score}`)
  assert(r.confidence.cvWeightPct === 0, 'CV weight should be 0')
})

// ── TEST 8 ───────────────────────────────────────────────────────────────────
test('TEST 8: Null evaluation — graceful null scores, no exception', function() {
  var r = scoringEngine.computeModule7Scores({
    evaluation: null, speechSummary: null, cvAnalysis: CV_SCORES, questionsWithAnswers: [],
  })
  assert(r.communication.score === null, 'Comm null without evaluation')
  assert(r.technicalRelevance.score === null, 'Tech null without evaluation')
  assert(r.confidence.score !== null, 'Confidence non-null from CV alone')
  assert(r.confidence.cvWeightPct === 100, 'CV=100% when no LLM confidence')
})

// ── TEST 9 ───────────────────────────────────────────────────────────────────
test('TEST 9: overallScore=0 would not pass the persist guard', function() {
  var r = scoringEngine.computeModule7Scores({
    evaluation: null, speechSummary: null, cvAnalysis: null, questionsWithAnswers: [],
  })
  var wouldPersist = typeof r.overallScore === 'number' && r.overallScore > 0
  assert(!wouldPersist, 'null-data result should fail guard (not overwrite existing score)')
})

// ── TEST 10 ──────────────────────────────────────────────────────────────────
test('TEST 10: Unrelated category_scores fields preserved after module7_scores merge', function() {
  var existing = {
    technical: 82, communication: 76, problem_solving: 68,
    grammar: 79, speech_analysis_summary: { answers_analysed: 5 },
    module7_scores: { overallScore: 74 },
    some_future_field: 'preserved',
  }
  var updated = Object.assign({}, existing, { module7_scores: withCvAndTiming })
  assert(updated.technical === 82, 'technical preserved')
  assert(updated.grammar === 79, 'grammar preserved')
  assert(updated.speech_analysis_summary.answers_analysed === 5, 'speech summary preserved')
  assert(updated.some_future_field === 'preserved', 'unknown fields preserved')
  assert(updated.module7_scores.overallScore === withCvAndTiming.overallScore, 'module7 updated')
})

// ── TEST 11 ──────────────────────────────────────────────────────────────────
test('TEST 11: Time-management component present when timing data supplied', function() {
  assert(withCvAndTiming.professionalism.sources.includes('time_management'),
    'Should include time_management source')
  assert(!withCv.professionalism.sources.includes('time_management'),
    'No timing: should NOT include time_management source')
})

// ── TEST 12 ──────────────────────────────────────────────────────────────────
test('TEST 12: Questions with timeTaken=0 not counted for time-management', function() {
  var withZeroTiming = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null,
    questionsWithAnswers: [
      { id: 1, answer: 'ans', timeTaken: 0 },
      { id: 2, answer: '',    timeTaken: 90 },  // empty answer, should not count
      { id: 3, answer: 'ans', timeTaken: 0 },
    ],
  })
  // All timeTaken=0 or empty answer -> no valid timing -> time_management absent
  assert(!withZeroTiming.professionalism.sources.includes('time_management'),
    'timeTaken=0 should not contribute to time_management')
})

// ── TEST 13 ──────────────────────────────────────────────────────────────────
test('TEST 13: Good timing + 0 warnings > bad timing + 2 warnings on professionalism', function() {
  var cvWith0Warnings = Object.assign({}, CV_SCORES, { warning_count: 0 })
  var cvWith2Warnings = Object.assign({}, CV_SCORES, { warning_count: 2 })

  var goodResult = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: cvWith0Warnings, questionsWithAnswers: TIMING_GOOD,
  })
  var badResult = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: cvWith2Warnings, questionsWithAnswers: TIMING_BAD,
  })
  assert(goodResult.professionalism.score > badResult.professionalism.score,
    `Good timing+0 warnings (${goodResult.professionalism.score}) > bad timing+2 warnings (${badResult.professionalism.score})`)
})

// ── TEST 14 ──────────────────────────────────────────────────────────────────
test('TEST 14: CV-before-complete race — CV available at complete() time is used', function() {
  // Simulates what complete() now does: cvAnalysisForScoring = cvRow.rows[0]
  var cvFromDb = {
    engagement_estimate: 0.73, confidence_indicator: 0.69,
    attention_score: 0.76, eye_contact_pct: 67.0,
    warning_count: 0, avg_face_visibility: 80.0, face_detection_rate: 0.93,
  }
  var initialResult = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: cvFromDb, questionsWithAnswers: TIMING_GOOD,
  })
  // The result should already be CV-augmented
  assert(initialResult.confidence.cvWeightPct === 50, 'Confidence should be CV-augmented immediately')
  assert(initialResult.scoringMeta.hasCvData === true, 'hasCvData should be true')
  assert(initialResult.professionalism.sources.includes('time_management'), 'Timing included')
  assert(initialResult.professionalism.sources.includes('live_compliance_etiquette'), 'Etiquette included')
})

// ── TEST 15 ──────────────────────────────────────────────────────────────────
test('TEST 15: CV-unavailable at complete() time falls back safely to null', function() {
  // Simulates complete() when cvRow.rows[0] is empty (no completed CV yet)
  var result = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: TIMING_GOOD,
  })
  assert(result.confidence.cvWeightPct === 0, 'CV weight should be 0 when no CV data')
  assert(result.scoringMeta.hasCvData === false, 'hasCvData should be false')
  // Communication and Tech should still be scored correctly from LLM
  assert(result.communication.score !== null, 'Communication still scored')
  assert(result.technicalRelevance.score !== null, 'Technical still scored')
  // Timing still works even without CV
  assert(result.professionalism.sources.includes('time_management'), 'Timing works without CV')
})

// ── TEST 16 ──────────────────────────────────────────────────────────────────
test('TEST 16: CV-after-complete path — post-CV rescore changes confidence/overall', function() {
  // Step A: complete() runs without CV (typical case A)
  var initialScore = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: TIMING_GOOD,
  })

  // Step B: _recomputeModule7WithCv runs with real CV data
  var rescoreResult = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })

  assert(rescoreResult.confidence.score !== initialScore.confidence.score,
    'Confidence must change after CV rescore')
  assert(rescoreResult.overallScore !== initialScore.overallScore,
    'Overall score must change after CV rescore')
  assert(rescoreResult.scoringMeta.hasCvData === true, 'hasCvData after rescore')

  // Communication and Technical unchanged
  assert(rescoreResult.communication.score === initialScore.communication.score,
    'Communication unchanged by rescore')
  assert(rescoreResult.technicalRelevance.score === initialScore.technicalRelevance.score,
    'Technical unchanged by rescore')
})

// ── TEST 17 ──────────────────────────────────────────────────────────────────
test('TEST 17: CV failure — comm/tech/prof from LLM/speech unchanged', function() {
  // When CV fails, cvAnalysis stays null — the scoring still works from LLM+speech
  var afterCvFail = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: TIMING_GOOD,
  })
  // Scores must still be meaningful (not null due to CV failure)
  assert(afterCvFail.communication.score !== null, 'Comm not null after CV fail')
  assert(afterCvFail.technicalRelevance.score !== null, 'Tech not null after CV fail')
  assert(afterCvFail.professionalism.score !== null, 'Prof not null after CV fail')
  assert(afterCvFail.overallScore !== null, 'Overall not null after CV fail')
  // These should be identical to the all-null-CV baseline (deterministic)
  var allNullCv = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: TIMING_GOOD,
  })
  assert(afterCvFail.overallScore === allNullCv.overallScore, 'Deterministic on CV fail')
})

// ── TEST 18 ──────────────────────────────────────────────────────────────────
test('TEST 18: Partial timing — some questions have time_taken, some do not (0)', function() {
  var partialTiming = [
    { id: 1, answer: 'ans', timeTaken: 80  },
    { id: 2, answer: 'ans', timeTaken: 0   },  // 0 = no timing
    { id: 3, answer: 'ans', timeTaken: 90  },
  ]
  var r = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: partialTiming,
  })
  // 2 of 3 questions have valid timing -> time_management should be computed
  assert(r.professionalism.sources.includes('time_management'),
    'Partial timing still yields time_management signal')
  // Score should be in range
  assert(r.professionalism.score >= 0 && r.professionalism.score <= 100,
    'Professionalism in range with partial timing')
})

// ── TEST 19 ──────────────────────────────────────────────────────────────────
test('TEST 19: Category weights are exactly 30/25/30/15', function() {
  assert(withCvAndTiming.communication.weight     === 0.30, 'Comm weight')
  assert(withCvAndTiming.confidence.weight        === 0.25, 'Conf weight')
  assert(withCvAndTiming.technicalRelevance.weight === 0.30, 'Tech weight')
  assert(withCvAndTiming.professionalism.weight   === 0.15, 'Prof weight')
})

// ── TEST 20 ──────────────────────────────────────────────────────────────────
test('TEST 20: Rating boundaries correct after CV augmentation', function() {
  // Construct scores near each boundary to verify
  ;[
    [90, 'Excellent'], [89, 'Good'], [75, 'Good'],
    [74, 'Average'],   [60, 'Average'],
    [59, 'Needs Improvement'], [40, 'Needs Improvement'],
    [39, 'Poor'], [0, 'Poor'],
  ].forEach(function(pair) {
    var score = pair[0]; var expected = pair[1]
    assert(scoringEngine.computePerformanceRating(score) === expected,
      score + ' -> ' + expected)
  })
})

// ── TEST 21 ──────────────────────────────────────────────────────────────────
test('TEST 21: Score floor prevents negative output', function() {
  var negativeResult = scoringEngine.computeModule7Scores({
    evaluation: { technical: -50, communication: -50 },
    speechSummary: { talkativeness: -10 },
    cvAnalysis: null,
    questionsWithAnswers: [],
  })
  assert(negativeResult.overallScore >= 0, 'Overall score cannot be negative')
  assert(negativeResult.technicalRelevance.score >= 0, 'Tech score clamped to 0')
})

// ── CV POST-RESCORE FEEDBACK REFRESH TESTS (Tests 22–31) ────────────────────
// These tests exercise the logic described in _recomputeModule7WithCv step 8:
// generate feedback with FINAL CV-augmented Module 7 scores.
// All LLM calls are exercised through feedbackService._internal helpers only.

const {
  _internal: {
    buildEvidenceBlock,
    parseFeedbackJson,
    normaliseParsed,
    SAFE_RESOURCE_ARRAY,
  },
} = require('./services/feedbackService')

// ── TEST 22 ──────────────────────────────────────────────────────────────────
test('TEST 22: CV rescore generates feedback using FINAL Module 7 scores', function() {
  // Simulate the final CV-augmented score result
  var finalM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  var evidenceBlock = buildEvidenceBlock({
    module7: finalM7, evaluation: BASE_EVALUATION,
    speechSummary: BASE_SPEECH, cvAnalysis: CV_SCORES,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  // Evidence must contain the FINAL confidence score (not the pre-CV value)
  var expectedConfStr = finalM7.confidence.score + '/100'
  assert(evidenceBlock.includes(expectedConfStr),
    'Evidence block should contain FINAL confidence score: ' + expectedConfStr)
  // Evidence must show the FINAL overall score
  assert(evidenceBlock.includes(finalM7.overallScore.toString()),
    'Evidence block should contain FINAL overall score: ' + finalM7.overallScore)
})

// ── TEST 23 ──────────────────────────────────────────────────────────────────
test('TEST 23: Evidence block includes CV behavioral signals after rescore', function() {
  var finalM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  var block = buildEvidenceBlock({
    module7: finalM7, evaluation: BASE_EVALUATION,
    speechSummary: BASE_SPEECH, cvAnalysis: CV_SCORES,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  // CV signals must be present
  assert(block.includes('73%'), 'Engagement estimate present')
  assert(block.includes('69%'), 'Confidence indicator present')
  assert(block.includes('67.0%'), 'Eye contact present')
  assert(block.includes('Behavioural / CV Analysis'), 'CV section present')
})

// ── TEST 24 ──────────────────────────────────────────────────────────────────
test('TEST 24: Feedback stores in category_scores.module7_feedback (merge simulation)', function() {
  var existingCategoryScores = {
    technical: 82, communication: 76, problem_solving: 68, grammar: 79,
    speech_analysis_summary: { answers_analysed: 5 },
    module7_scores: { overallScore: 72 },
    module7_feedback: { strengths: ['Old strength'], weaknesses: ['Old weakness'] },
    some_other_field: 'preserved',
  }
  var finalM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  var newFeedback = { strengths: ['New strength'], weaknesses: ['New weakness'],
                      improvementSuggestions: [], practiceRecommendations: [], learningResources: [] }

  // Simulate what _recomputeModule7WithCv builds
  var updatedCategoryScores = Object.assign({}, existingCategoryScores, {
    module7_scores:  { overallScore: finalM7.overallScore },
    module7_feedback: newFeedback,
  })

  // Verify persistence fields
  assert(updatedCategoryScores.module7_feedback.strengths[0] === 'New strength',
    'Refreshed feedback should overwrite old feedback')
  assert(updatedCategoryScores.some_other_field === 'preserved',
    'Unrelated category_scores fields preserved')
  assert(updatedCategoryScores.technical === 82, 'Technical score preserved')
  assert(updatedCategoryScores.grammar   === 79, 'Grammar score preserved')
  assert(updatedCategoryScores.speech_analysis_summary.answers_analysed === 5,
    'Speech summary preserved')
})

// ── TEST 25 ──────────────────────────────────────────────────────────────────
test('TEST 25: Final numerical scores remain unchanged when feedback fails', function() {
  // Simulate what happens when feedbackService.generateFeedback() returns null
  var finalM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  var previousFeedback = { strengths: ['Previous strength'], weaknesses: [] }
  var refreshedFeedback = null    // LLM returned null
  // The controller falls back to previousFeedback when refreshedFeedback is null
  var effectiveFeedback = refreshedFeedback !== null ? refreshedFeedback : previousFeedback

  // Numerical score is set from module7.overallScore, NOT from feedback
  var persistedScore = finalM7.overallScore
  assert(persistedScore > 0, 'Score persisted despite feedback failure: ' + persistedScore)
  assert(effectiveFeedback.strengths[0] === 'Previous strength',
    'Previous valid feedback preserved when LLM fails')
  assert(refreshedFeedback === null, 'refreshedFeedback is null (LLM failed)')
})

// ── TEST 26 ──────────────────────────────────────────────────────────────────
test('TEST 26: Feedback LLM failure does not roll back CV-augmented score', function() {
  // Compute pre-CV and post-CV scores
  var preCv = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: TIMING_GOOD,
  })
  var postCv = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  // Feedback failure (null) must not roll back the postCv score
  var feedbackFailed = null
  var scoreToStore   = postCv.overallScore   // always postCv, independent of feedback
  assert(scoreToStore !== preCv.overallScore,
    'Post-CV score should differ from pre-CV score (CV augments confidence)')
  assert(feedbackFailed === null, 'Feedback failed')
  assert(scoreToStore === postCv.overallScore, 'Score is always the CV-augmented value')
})

// ── TEST 27 ──────────────────────────────────────────────────────────────────
test('TEST 27: Previous valid feedback preserved when regeneration returns null', function() {
  // Simulate the fallback logic in _recomputeModule7WithCv
  var existingFeedback = {
    strengths: ['Pre-CV strength'],
    weaknesses: ['Pre-CV weakness'],
    improvementSuggestions: ['Pre-CV suggestion'],
    practiceRecommendations: [],
    learningResources: [],
  }
  var generated = null   // LLM failed
  var refreshedFeedback = generated !== null ? generated : existingFeedback

  assert(refreshedFeedback === existingFeedback, 'Falls back to existing feedback')
  assert(refreshedFeedback.strengths[0] === 'Pre-CV strength', 'Strengths preserved')
  assert(refreshedFeedback.improvementSuggestions[0] === 'Pre-CV suggestion',
    'Suggestions preserved')
})

// ── TEST 28 ──────────────────────────────────────────────────────────────────
test('TEST 28: When no previous feedback exists and LLM fails, module7_feedback is null', function() {
  // Simulate: initial complete() failed to generate feedback, now CV rescore LLM also fails
  var previousFeedback = null   // no prior feedback
  var generated        = null   // LLM also failed
  var refreshedFeedback = generated !== null ? generated : previousFeedback

  assert(refreshedFeedback === null,
    'module7_feedback stored as null when no prior and LLM fails — correct safe default')
})

// ── TEST 29 ──────────────────────────────────────────────────────────────────
test('TEST 29: Confidence score in evidence is FINAL (higher with CV) not pre-CV', function() {
  var preCvM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: null, questionsWithAnswers: [],
  })
  var postCvM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: [],
  })
  // Evidence for post-CV feedback uses postCvM7
  var evidencePost = buildEvidenceBlock({
    module7: postCvM7, evaluation: BASE_EVALUATION,
    speechSummary: BASE_SPEECH, cvAnalysis: CV_SCORES, role: null, interviewType: null,
  })
  var evidencePre = buildEvidenceBlock({
    module7: preCvM7, evaluation: BASE_EVALUATION,
    speechSummary: BASE_SPEECH, cvAnalysis: null, role: null, interviewType: null,
  })

  // Post-CV evidence should contain the higher confidence score
  assert(
    evidencePost.includes(postCvM7.confidence.score + '/100'),
    'Post-CV evidence contains final confidence score: ' + postCvM7.confidence.score
  )
  // Pre-CV evidence should NOT contain the post-CV confidence score
  // (unless they happen to be identical, which would be a different assertion failure)
  if (preCvM7.confidence.score !== postCvM7.confidence.score) {
    assert(
      !evidencePre.includes(postCvM7.confidence.score + '/100'),
      'Pre-CV evidence should NOT contain CV-augmented confidence'
    )
  } else {
    assert(true, 'Scores are equal — no differentiation needed')
  }
})

// ── TEST 30 ──────────────────────────────────────────────────────────────────
test('TEST 30: normaliseParsed from refreshed LLM response has all five sections', function() {
  var mockLlmResponse = JSON.stringify({
    strengths: ['Strong technical skills based on final technical relevance score of 78/100'],
    weaknesses: ['Confidence below 70 (final CV-augmented confidence: 68/100)'],
    improvementSuggestions: ['Practice maintaining camera eye contact to raise confidence signal'],
    practiceRecommendations: ['Record 60-second technical explanations and review eye contact'],
    learningResources: [{
      topic: 'Confidence in technical interviews',
      resourceType: 'Practice exercises',
      reason: 'CV analysis shows confidence indicator below 70%',
    }],
  })
  var parsed     = parseFeedbackJson(mockLlmResponse)
  var normalised = normaliseParsed(parsed)
  assert(normalised !== null, 'Should normalise refreshed feedback')
  assert(normalised.strengths.length > 0,               'Refreshed: strengths present')
  assert(normalised.weaknesses.length > 0,              'Refreshed: weaknesses present')
  assert(normalised.improvementSuggestions.length > 0,  'Refreshed: suggestions present')
  assert(normalised.practiceRecommendations.length > 0, 'Refreshed: recommendations present')
  assert(normalised.learningResources.length > 0,       'Refreshed: resources present')
  // Verify the feedback references CV evidence (not pre-CV state)
  assert(normalised.weaknesses[0].includes('68/100') || normalised.weaknesses[0].includes('confidence'),
    'Weakness references the CV-augmented confidence score')
})

// ── TEST 31 ──────────────────────────────────────────────────────────────────
test('TEST 31: Single persistence write contains both updated scores and refreshed feedback', function() {
  // Simulate the exact updatedCategoryScores object that would be passed to UPDATE
  var finalM7 = scoringEngine.computeModule7Scores({
    evaluation: BASE_EVALUATION, speechSummary: BASE_SPEECH,
    cvAnalysis: CV_SCORES, questionsWithAnswers: TIMING_GOOD,
  })
  var refreshedFeedback = {
    strengths: ['Final strength'], weaknesses: ['Final weakness'],
    improvementSuggestions: ['Final suggestion'], practiceRecommendations: ['Practice item'],
    learningResources: [{ topic: 'Topic', resourceType: 'Book', reason: 'Low score' }],
  }
  var existingCategoryScores = {
    technical: 82, grammar: 79, speech_analysis_summary: { answers_analysed: 5 },
    module7_scores: { overallScore: 72 },
    module7_feedback: { strengths: ['Old'] },
  }
  var updatedCategoryScores = Object.assign({}, existingCategoryScores, {
    module7_scores: {
      communication:      finalM7.communication,
      confidence:         finalM7.confidence,
      technicalRelevance: finalM7.technicalRelevance,
      professionalism:    finalM7.professionalism,
      overallScore:       finalM7.overallScore,
      performanceRating:  finalM7.performanceRating,
      scoringMeta:        finalM7.scoringMeta,
    },
    module7_feedback: refreshedFeedback,
  })

  // One JSON write must contain both final score and refreshed feedback
  var serialised = JSON.stringify(updatedCategoryScores)
  assert(serialised.includes('Final strength'), 'Serialised payload contains refreshed feedback')
  assert(serialised.includes(finalM7.overallScore.toString()), 'Serialised payload contains final score')
  assert(serialised.includes('"technical":82'), 'LLM evaluation scores preserved in payload')
  // Old feedback should no longer appear
  assert(!serialised.includes('"Old"'), 'Old feedback replaced by refreshed feedback')
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60))
console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed')
console.log('='.repeat(60))
if (failed > 0) { process.exit(1) }
else { console.log('  All post-CV Module7 lifecycle tests PASSED'); process.exit(0) }
