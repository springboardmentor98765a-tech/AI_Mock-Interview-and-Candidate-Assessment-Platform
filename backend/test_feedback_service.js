'use strict'

/**
 * test_feedback_service.js — Module 7 AI Feedback Generation tests
 *
 * All LLM calls are mocked. Uses async main() to allow await inside CJS.
 */

const {
  generateFeedback,
  _internal: {
    buildEvidenceBlock,
    buildFeedbackPrompt,
    parseFeedbackJson,
    normaliseParsed,
    SAFE_STRING_ARRAY,
    SAFE_RESOURCE_ARRAY,
  },
} = require('./services/feedbackService')

const scoringEngine = require('./services/scoringEngine')

let passed = 0; let failed = 0
function assert(cond, msg) {
  if (cond) { passed++ } else { failed++; console.error('  FAIL:', msg) }
}
function test(name, fn) {
  console.log('\n>', name)
  try { fn() } catch(e) { failed++; console.error('  FAIL: threw', e.message) }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_LLM_RESPONSE = JSON.stringify({
  strengths: [
    "Strong technical relevance score of 82/100 demonstrating solid domain knowledge",
    "Good grammar and speech clarity with measured grammar score of 79/100"
  ],
  weaknesses: [
    "Confidence score of 62/100 is below the target threshold",
    "Filler word rate of 5% is elevated and impacts professional communication"
  ],
  improvementSuggestions: [
    "Pause briefly before answering to collect thoughts instead of using filler words",
    "Practice maintaining eye contact with the camera to convey greater confidence"
  ],
  practiceRecommendations: [
    "Record mock interview responses and review for filler words",
    "Practice timed 60-second responses to common technical questions"
  ],
  learningResources: [
    {
      topic: "Confidence building in technical interviews",
      resourceType: "Online course",
      reason: "Confidence indicator from behavioural analysis was below 70%"
    },
    {
      topic: "Reducing filler word usage",
      resourceType: "Practice exercises",
      reason: "Measured filler rate of 5% exceeds the professional target of under 2%"
    }
  ]
})

const MARKDOWN_FENCED_RESPONSE = '```json\n' + VALID_LLM_RESPONSE + '\n```'

const PARTIAL_RESPONSE = JSON.stringify({
  strengths: ["Strong technical relevance"],
  weaknesses: ["Low confidence score"]
})

const RESPONSE_WITH_TRAILING_COMMA = `{
  "strengths": ["Strong technical score",],
  "weaknesses": ["Low confidence",],
  "improvementSuggestions": ["Practice eye contact",],
  "practiceRecommendations": ["Record mock interviews",],
  "learningResources": []
}`

const RESPONSE_WITH_URL_IN_RESOURCES = JSON.stringify({
  strengths: ["Good technical score"],
  weaknesses: ["Low confidence"],
  improvementSuggestions: ["Practice eye contact"],
  practiceRecommendations: ["Record interviews"],
  learningResources: [
    { topic: "https://coursera.org/course/123", resourceType: "Online course", reason: "Low confidence" },
    { topic: "Interview prep", resourceType: "Practice", reason: "Low confidence" }
  ]
})

const MODULE7_FIXTURE = {
  communication:      { score: 76, weight: 0.30, sources: ['evaluation_communication_blended'] },
  confidence:         { score: 68, weight: 0.25, cvWeightPct: 50, sources: ['cv_behavioral_composite', 'llm_confidence'] },
  technicalRelevance: { score: 75, weight: 0.30, sources: ['llm_technical', 'llm_problem_solving'] },
  professionalism:    { score: 81, weight: 0.15, sources: ['speech_grammar', 'time_management', 'live_compliance_etiquette'] },
  overallScore:       74,
  performanceRating:  'Average',
  scoringMeta:        { hasCvData: true, hasSpeechData: true },
}

const EVALUATION_FIXTURE = {
  overall_score: 74,
  category_scores: { technical: 82, communication: 76, problem_solving: 68, confidence: 62, grammar: 79 },
}

const SPEECH_FIXTURE = {
  avg_communication_score: 74, avg_grammar_score: 77,
  avg_words_per_minute: 135, avg_filler_rate: 5,
  dominant_pace: 'Normal', answers_analysed: 5, total_answers: 5,
}

const CV_FIXTURE = {
  engagement_estimate: 0.73, confidence_indicator: 0.69,
  attention_score: 0.76, eye_contact_pct: 67.0,
  warning_count: 0, face_detection_rate: 0.93,
}

// ── Tests ────────────────────────────────────────────────────────────────────

async function main() {

test('TEST 1: Valid structured JSON parses correctly', function() {
  const result = parseFeedbackJson(VALID_LLM_RESPONSE)
  assert(result !== null, 'Should parse valid JSON')
  assert(Array.isArray(result.strengths), 'strengths should be array')
  assert(Array.isArray(result.weaknesses), 'weaknesses should be array')
  assert(Array.isArray(result.improvementSuggestions), 'improvementSuggestions should be array')
  assert(Array.isArray(result.practiceRecommendations), 'practiceRecommendations should be array')
  assert(Array.isArray(result.learningResources), 'learningResources should be array')
})

test('TEST 2: Markdown-fenced JSON is unwrapped and parsed', function() {
  const result = parseFeedbackJson(MARKDOWN_FENCED_RESPONSE)
  assert(result !== null, 'Should parse markdown-fenced JSON')
  assert(result.strengths.length >= 1, 'Should have strengths')
})

test('TEST 3: Trailing comma in JSON is fixed and parsed', function() {
  const result = parseFeedbackJson(RESPONSE_WITH_TRAILING_COMMA)
  assert(result !== null, 'Should parse trailing-comma JSON')
  assert(Array.isArray(result.strengths), 'strengths should be array')
})

test('TEST 4: Partial response (missing optional fields) handled safely', function() {
  const parsed     = parseFeedbackJson(PARTIAL_RESPONSE)
  const normalised = normaliseParsed(parsed)
  assert(normalised !== null, 'Should return object despite missing fields')
  assert(Array.isArray(normalised.improvementSuggestions), 'improvementSuggestions defaults to []')
  assert(normalised.improvementSuggestions.length === 0, 'improvementSuggestions should be empty')
  assert(Array.isArray(normalised.practiceRecommendations), 'practiceRecommendations defaults to []')
})

test('TEST 5: Malformed JSON returns null, does not throw', function() {
  const result = parseFeedbackJson('{ strengths: [broken json }}}')
  assert(result === null, 'Malformed JSON should return null')
})

test('TEST 6: Empty/null/undefined response returns null', function() {
  assert(parseFeedbackJson('') === null, 'Empty string -> null')
  assert(parseFeedbackJson(null) === null, 'null -> null')
  assert(parseFeedbackJson(undefined) === null, 'undefined -> null')
})

test('TEST 7: All-empty-arrays response returns null from normaliseParsed', function() {
  const parsed = { strengths: [], weaknesses: [], improvementSuggestions: [], practiceRecommendations: [], learningResources: [] }
  const result = normaliseParsed(parsed)
  assert(result === null, 'All empty arrays -> null')
})

test('TEST 8: LLM failure returns null, does not alter numerical scores', function() {
  const result = normaliseParsed(parseFeedbackJson(null))
  assert(result === null, 'Failed LLM -> null feedback')
  const m7 = scoringEngine.computeModule7Scores({
    evaluation: EVALUATION_FIXTURE, speechSummary: SPEECH_FIXTURE,
    cvAnalysis: null, questionsWithAnswers: [],
  })
  assert(typeof m7.overallScore === 'number', 'Score still computed after simulated feedback failure')
})

test('TEST 9: normaliseParsed never throws on bad input', function() {
  var threw = false
  try { normaliseParsed(null) } catch(e) { threw = true }
  try { normaliseParsed(undefined) } catch(e) { threw = true }
  try { normaliseParsed([]) } catch(e) { threw = true }
  try { normaliseParsed('string') } catch(e) { threw = true }
  assert(!threw, 'normaliseParsed should never throw')
})

test('TEST 10: normaliseParsed removes empty strings from arrays', function() {
  const parsed = {
    strengths: ['Good score', '', '  ', 'Valid point'],
    weaknesses: ['Valid weakness'],
    improvementSuggestions: [''],
    practiceRecommendations: [],
    learningResources: [],
  }
  const result = normaliseParsed(parsed)
  assert(result !== null, 'Should return result')
  assert(result.strengths.length === 2, 'Should strip empty strings: got ' + result.strengths.length)
  assert(result.improvementSuggestions.length === 0, 'Empty string suggestions removed')
})

test('TEST 11: SAFE_RESOURCE_ARRAY filters out URL-containing entries', function() {
  const parsed = parseFeedbackJson(RESPONSE_WITH_URL_IN_RESOURCES)
  const result = normaliseParsed(parsed)
  assert(result !== null, 'Should return result')
  assert(result.learningResources.length === 1, 'URL resource should be filtered: ' + result.learningResources.length)
  assert(!result.learningResources.some(r => /https?:\/\//.test(r.topic + r.resourceType + r.reason)),
    'No resources should contain URLs')
})

test('TEST 12: Strengths array items are non-empty strings', function() {
  const normalised = normaliseParsed(parseFeedbackJson(VALID_LLM_RESPONSE))
  assert(normalised.strengths.every(s => typeof s === 'string' && s.length > 0),
    'All strengths must be non-empty strings')
})

test('TEST 13: Weaknesses array items are non-empty strings', function() {
  const normalised = normaliseParsed(parseFeedbackJson(VALID_LLM_RESPONSE))
  assert(normalised.weaknesses.every(s => typeof s === 'string' && s.length > 0),
    'All weaknesses must be non-empty strings')
})

test('TEST 14: improvementSuggestions match weaknesses count in fixture', function() {
  const normalised = normaliseParsed(parseFeedbackJson(VALID_LLM_RESPONSE))
  assert(normalised.improvementSuggestions.length === normalised.weaknesses.length,
    `improvementSuggestions (${normalised.improvementSuggestions.length}) should match weaknesses (${normalised.weaknesses.length})`)
})

test('TEST 15: Learning resources have topic + resourceType + reason', function() {
  const normalised = normaliseParsed(parseFeedbackJson(VALID_LLM_RESPONSE))
  normalised.learningResources.forEach(function(r, i) {
    assert(typeof r.topic        === 'string' && r.topic.length > 0,        'Resource ' + i + ' missing topic')
    assert(typeof r.resourceType === 'string' && r.resourceType.length > 0, 'Resource ' + i + ' missing resourceType')
    assert(typeof r.reason       === 'string' && r.reason.length > 0,       'Resource ' + i + ' missing reason')
  })
})

test('TEST 16: SAFE_RESOURCE_ARRAY strips all URL forms', function() {
  const result = SAFE_RESOURCE_ARRAY([
    { topic: 'Safe topic', resourceType: 'Book', reason: 'Low score' },
    { topic: 'https://example.com', resourceType: 'Online', reason: 'Low score' },
    { topic: 'Practice', resourceType: 'http://site.com', reason: 'Reason' },
    { topic: 'Valid', resourceType: 'Video', reason: 'No URL here' },
  ])
  assert(result.length === 2, 'Only 2 safe resources should survive: got ' + result.length)
})

test('TEST 17: buildEvidenceBlock includes Module 7 score values', function() {
  const block = buildEvidenceBlock({
    module7: MODULE7_FIXTURE, evaluation: EVALUATION_FIXTURE,
    speechSummary: null, cvAnalysis: null,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  assert(block.includes('76/100'), 'Should include communication score')
  assert(block.includes('68/100'), 'Should include confidence score')
  assert(block.includes('75/100'), 'Should include technical score')
  assert(block.includes('Average'), 'Should include performance rating')
  assert(block.includes('Backend Developer'), 'Should include role')
})

test('TEST 18: buildEvidenceBlock includes speech analysis when available', function() {
  const block = buildEvidenceBlock({
    module7: MODULE7_FIXTURE, evaluation: EVALUATION_FIXTURE,
    speechSummary: SPEECH_FIXTURE, cvAnalysis: null,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  assert(block.includes('135'), 'Should include WPM')
  assert(block.includes('5%'),  'Should include filler rate')
  assert(block.includes('Normal'), 'Should include pace label')
})

test('TEST 19: buildEvidenceBlock includes CV data when available', function() {
  const block = buildEvidenceBlock({
    module7: MODULE7_FIXTURE, evaluation: EVALUATION_FIXTURE,
    speechSummary: null, cvAnalysis: CV_FIXTURE,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  assert(block.includes('73%'), 'Should include engagement %')
  assert(block.includes('69%'), 'Should include confidence indicator %')
  assert(block.includes('67.0%'), 'Should include eye contact %')
})

test('TEST 20: buildEvidenceBlock omits CV section when cvAnalysis is null', function() {
  const block = buildEvidenceBlock({
    module7: MODULE7_FIXTURE, evaluation: EVALUATION_FIXTURE,
    speechSummary: null, cvAnalysis: null,
    role: 'Backend Developer', interviewType: 'Technical',
  })
  assert(!block.includes('Behavioural / CV Analysis'), 'CV section should be absent')
})

test('TEST 21: scoringEngine still functional after feedbackService load', function() {
  const m7 = scoringEngine.computeModule7Scores({
    evaluation: EVALUATION_FIXTURE, speechSummary: SPEECH_FIXTURE,
    cvAnalysis: null, questionsWithAnswers: [],
  })
  assert(typeof m7.overallScore === 'number', 'scoringEngine still computes correctly')
  assert(m7.communication.weight === 0.30, 'Comm weight unchanged')
  assert(m7.confidence.weight    === 0.25, 'Conf weight unchanged')
})

test('TEST 22: feedbackService exports all required functions', function() {
  assert(typeof generateFeedback    === 'function', 'generateFeedback exported')
  assert(typeof buildEvidenceBlock  === 'function', 'buildEvidenceBlock exported')
  assert(typeof parseFeedbackJson   === 'function', 'parseFeedbackJson exported')
  assert(typeof normaliseParsed     === 'function', 'normaliseParsed exported')
  assert(typeof SAFE_STRING_ARRAY   === 'function', 'SAFE_STRING_ARRAY exported')
  assert(typeof SAFE_RESOURCE_ARRAY === 'function', 'SAFE_RESOURCE_ARRAY exported')
})

test('TEST 23: Module 7 scores appear verbatim in prompt (no fabrication)', function() {
  const block  = buildEvidenceBlock({
    module7: MODULE7_FIXTURE, evaluation: EVALUATION_FIXTURE,
    speechSummary: SPEECH_FIXTURE, cvAnalysis: CV_FIXTURE,
    role: 'Frontend Developer', interviewType: 'Mixed',
  })
  const prompt = buildFeedbackPrompt(block)
  assert(prompt.includes('76/100'), 'Prompt contains comm score')
  assert(prompt.includes('68/100'), 'Prompt contains confidence score')
  assert(prompt.includes('evidence-based'), 'Prompt requires evidence-based output')
  assert(prompt.includes('Do NOT recalculate'), 'Prompt forbids score recalculation')
  assert(prompt.includes('NEVER a URL'), 'Prompt explicitly bans URL fabrication')
})

test('TEST 24: buildEvidenceBlock with all-null inputs returns string without throwing', function() {
  var threw = false
  var block
  try {
    block = buildEvidenceBlock({ module7: null, evaluation: null, speechSummary: null, cvAnalysis: null, role: null, interviewType: null })
  } catch(e) { threw = true }
  assert(!threw, 'buildEvidenceBlock should not throw with null inputs')
  assert(typeof block === 'string', 'Should return a string')
})

test('TEST 25: normaliseParsed accepts object with only strengths (no weaknesses)', function() {
  const parsed = { strengths: ['Strong score'], weaknesses: [] }
  const result = normaliseParsed(parsed)
  assert(result !== null, 'Should accept object with only strengths')
  assert(result.strengths.length === 1, 'Should preserve strengths')
  assert(result.weaknesses.length === 0, 'Weaknesses empty')
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60))
console.log('  RESULTS: ' + passed + ' passed, ' + failed + ' failed')
console.log('='.repeat(60))
if (failed > 0) { process.exit(1) }
else { console.log('  All Module 7 feedback service tests PASSED'); process.exit(0) }
}

main().catch(function(e) { console.error('Fatal test error:', e); process.exit(1) })
