'use strict'

/**
 * backend/services/scoringEngine.js
 *
 * Module 7 — Core Interview Scoring Engine
 *
 * Category weights (immutable):
 *   Communication       30%
 *   Confidence          25%
 *   Technical Relevance 30%
 *   Professionalism     15%
 *
 * Overall = comm*0.30 + conf*0.25 + tech*0.30 + prof*0.15
 *
 * Performance rating:
 *   90-100  -> Excellent
 *   75-89   -> Good
 *   60-74   -> Average
 *   40-59   -> Needs Improvement
 *   0-39    -> Poor
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp100(v) {
  if (typeof v !== 'number' || !isFinite(v)) return null
  return Math.min(100, Math.max(0, Math.round(v)))
}

function weightedAvailable(pairs) {
  let totalWeight = 0
  let totalScore  = 0
  for (const { value, weight } of pairs) {
    if (typeof value === 'number' && isFinite(value)) {
      totalScore  += value * weight
      totalWeight += weight
    }
  }
  if (totalWeight === 0) return null
  return totalScore / totalWeight
}

// ---------------------------------------------------------------------------
// Performance Rating
// ---------------------------------------------------------------------------

function computePerformanceRating(score) {
  if (typeof score !== 'number' || !isFinite(score)) return 'Poor'
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Average'
  if (score >= 40) return 'Needs Improvement'
  return 'Poor'
}

// ---------------------------------------------------------------------------
// Category: Communication (30%)
// ---------------------------------------------------------------------------

function computeCommunicationScore(evaluation, speechSummary) {
  const sources = []
  const llmComm = evaluation && evaluation.category_scores && evaluation.category_scores.communication
  if (typeof llmComm === 'number' && llmComm > 0) {
    sources.push('evaluation_communication_blended')
    return { score: clamp100(llmComm), sources }
  }
  const speechComm = speechSummary && speechSummary.avg_communication_score
  if (typeof speechComm === 'number') {
    sources.push('speech_analysis_avg_communication')
    return { score: clamp100(speechComm), sources }
  }
  return { score: null, sources: ['unavailable'] }
}

// ---------------------------------------------------------------------------
// Category: Confidence (25%)
// ---------------------------------------------------------------------------

function computeConfidenceScore(evaluation, cvAnalysis) {
  const sources = []
  const llmConfidence = evaluation && evaluation.category_scores && evaluation.category_scores.confidence

  const engagement  = cvAnalysis && cvAnalysis.engagement_estimate
  const cnnConf     = cvAnalysis && cvAnalysis.confidence_indicator
  const attention   = cvAnalysis && cvAnalysis.attention_score
  const eyeContact  = cvAnalysis && cvAnalysis.eye_contact_pct

  const cvPairs = [
    { value: typeof engagement === 'number'  ? engagement * 100 : null, weight: 0.35 },
    { value: typeof cnnConf    === 'number'  ? cnnConf    * 100 : null, weight: 0.35 },
    { value: typeof attention  === 'number'  ? attention  * 100 : null, weight: 0.20 },
    { value: typeof eyeContact === 'number'  ? eyeContact       : null, weight: 0.10 },
  ]

  const cvComposite = weightedAvailable(cvPairs)
  const hasCvData   = cvComposite !== null
  if (hasCvData) sources.push('cv_behavioral_composite')

  const hasLlm = typeof llmConfidence === 'number' && llmConfidence > 0

  let finalScore
  let cvWeightPct = 0
  if (hasCvData && hasLlm) {
    finalScore  = cvComposite * 0.50 + llmConfidence * 0.50
    cvWeightPct = 50
    sources.push('llm_confidence')
  } else if (hasCvData) {
    finalScore  = cvComposite
    cvWeightPct = 100
  } else if (hasLlm) {
    finalScore  = llmConfidence
    sources.push('llm_confidence')
  } else {
    return { score: null, sources: ['unavailable'], cvWeightPct: 0 }
  }

  return { score: clamp100(finalScore), sources, cvWeightPct }
}

// ---------------------------------------------------------------------------
// Category: Technical Relevance (30%)
// ---------------------------------------------------------------------------

function computeTechnicalRelevanceScore(evaluation) {
  const sources = []
  const cs = (evaluation && evaluation.category_scores) || {}
  const technical       = typeof cs.technical       === 'number' ? cs.technical       : null
  const problem_solving = typeof cs.problem_solving === 'number' ? cs.problem_solving : null
  const useBlend        = problem_solving !== null && problem_solving > 0

  if (technical === null && !useBlend) {
    return { score: null, sources: ['unavailable'] }
  }

  let techScore
  if (useBlend && technical !== null) {
    techScore = (technical + problem_solving) / 2
    sources.push('llm_technical', 'llm_problem_solving')
  } else if (technical !== null) {
    techScore = technical
    sources.push('llm_technical')
  } else {
    techScore = problem_solving
    sources.push('llm_problem_solving')
  }

  return { score: clamp100(techScore), sources }
}

// ---------------------------------------------------------------------------
// Category: Professionalism (15%)
// ---------------------------------------------------------------------------

function computeProfessionalismScore(evaluation, speechSummary, cvAnalysis, questionsWithAnswers) {
  const sources = []

  // 1. Professional communication: grammar (40%)
  let grammarScore = null
  const avgGrammar = speechSummary && speechSummary.avg_grammar_score
  const llmGrammar = evaluation && evaluation.category_scores && evaluation.category_scores.grammar
  if (typeof avgGrammar === 'number') {
    grammarScore = avgGrammar
    sources.push('speech_grammar')
  } else if (typeof llmGrammar === 'number' && llmGrammar > 0) {
    grammarScore = llmGrammar
    sources.push('llm_grammar')
  }

  // 2. Response organisation: LLM communication (30%)
  let organisationScore = null
  const llmComm = evaluation && evaluation.category_scores && evaluation.category_scores.communication
  if (typeof llmComm === 'number' && llmComm > 0) {
    organisationScore = llmComm
    sources.push('llm_response_organisation')
  }

  // 3. Time management per-question timing (20%)
  // Ideal: 30-120s per answered question
  let timeManagementScore = null
  const answeredQs = Array.isArray(questionsWithAnswers)
    ? questionsWithAnswers.filter(function(q) {
        return q.answer && q.answer.trim() && typeof q.timeTaken === 'number' && q.timeTaken > 0
      })
    : []
  if (answeredQs.length > 0) {
    const perQScores = answeredQs.map(function(q) {
      var t = q.timeTaken
      if (t <= 15)  return 40
      if (t <= 29)  return 70
      if (t <= 120) return 100
      if (t <= 180) return 80
      return 60
    })
    timeManagementScore = perQScores.reduce(function(s, v) { return s + v }, 0) / perQScores.length
    sources.push('time_management')
  }

  // 4. Interview etiquette: live compliance warnings (10%)
  let etiquetteScore = null
  const warningCount = cvAnalysis && cvAnalysis.warning_count
  if (typeof warningCount === 'number') {
    if      (warningCount === 0) etiquetteScore = 100
    else if (warningCount === 1) etiquetteScore = 80
    else if (warningCount === 2) etiquetteScore = 60
    else if (warningCount === 3) etiquetteScore = 40
    else                          etiquetteScore = 20
    sources.push('live_compliance_etiquette')
  }

  const rawScore = weightedAvailable([
    { value: grammarScore,        weight: 0.40 },
    { value: organisationScore,   weight: 0.30 },
    { value: timeManagementScore, weight: 0.20 },
    { value: etiquetteScore,      weight: 0.10 },
  ])

  if (rawScore === null) {
    return { score: null, sources: ['unavailable'] }
  }

  return { score: clamp100(rawScore), sources }
}

// ---------------------------------------------------------------------------
// Main public function
// ---------------------------------------------------------------------------

function computeModule7Scores(params) {
  var evaluation           = params.evaluation
  var speechSummary        = params.speechSummary
  var cvAnalysis           = params.cvAnalysis
  var questionsWithAnswers = params.questionsWithAnswers

  var commResult = computeCommunicationScore(evaluation, speechSummary)
  var confResult = computeConfidenceScore(evaluation, cvAnalysis)
  var techResult = computeTechnicalRelevanceScore(evaluation)
  var profResult = computeProfessionalismScore(evaluation, speechSummary, cvAnalysis, questionsWithAnswers)

  var categoryPairs = [
    { value: commResult.score,  weight: 0.30 },
    { value: confResult.score,  weight: 0.25 },
    { value: techResult.score,  weight: 0.30 },
    { value: profResult.score,  weight: 0.15 },
  ]

  var overallRaw   = weightedAvailable(categoryPairs)
  var overallScore = overallRaw !== null ? clamp100(overallRaw) : null
  var performanceRating = overallScore !== null ? computePerformanceRating(overallScore) : 'Poor'

  return {
    communication: {
      score:   commResult.score,
      weight:  0.30,
      sources: commResult.sources,
    },
    confidence: {
      score:       confResult.score,
      weight:      0.25,
      sources:     confResult.sources,
      cvWeightPct: confResult.cvWeightPct || 0,
    },
    technicalRelevance: {
      score:   techResult.score,
      weight:  0.30,
      sources: techResult.sources,
    },
    professionalism: {
      score:   profResult.score,
      weight:  0.15,
      sources: profResult.sources,
    },
    overallScore:     overallScore,
    performanceRating: performanceRating,
    scoringMeta: {
      hasCvData:         !!(cvAnalysis),
      hasSpeechData:     ((speechSummary && speechSummary.answers_analysed) || 0) > 0,
      cvConfidenceWtPct: confResult.cvWeightPct || 0,
    },
  }
}

module.exports = {
  computeModule7Scores:       computeModule7Scores,
  computePerformanceRating:   computePerformanceRating,
  _internal: {
    computeCommunicationScore:      computeCommunicationScore,
    computeConfidenceScore:         computeConfidenceScore,
    computeTechnicalRelevanceScore: computeTechnicalRelevanceScore,
    computeProfessionalismScore:    computeProfessionalismScore,
    weightedAvailable:              weightedAvailable,
    clamp100:                       clamp100,
  },
}
