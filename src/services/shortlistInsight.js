/**
 * shortlistInsight.js
 *
 * Pure deterministic function to compute a recruiter shortlisting insight
 * for a candidate from the data already available in `realCandidates`.
 *
 * Requirements:
 *  - Deterministic (same input → same output, no Math.random())
 *  - Uses only real data from the candidate object
 *  - Does NOT fabricate scores, reasons, or text
 *  - Aligned with existing hire_recommendation thresholds in RecruiterDashboard
 *  - Safe against null/undefined for all fields
 *
 * @param {object} c — a candidate entry from `realCandidates`
 * @returns {{ status, title, summary, reasons, strengths, concerns }}
 */
export function computeShortlistInsight(c) {
  if (!c) {
    return {
      status: 'unknown',
      title: 'No data',
      summary: 'Candidate data is not available.',
      reasons: [],
      strengths: [],
      concerns: [],
    }
  }

  // Canonical interview/AI score — the Module 7 overall score
  const score = c.interviewScore != null ? Number(c.interviewScore) : null

  // Module 7 category scores (each may be null for legacy interviews)
  const comm  = c.communication      != null ? Number(c.communication)      : null
  const conf  = c.confidence         != null ? Number(c.confidence)         : null
  const tech  = c.technicalRelevance != null ? Number(c.technicalRelevance) : null
  const prof  = c.professionalism    != null ? Number(c.professionalism)    : null

  // Resume ATS score
  const resumeScore = c.resumeScore != null ? Number(c.resumeScore) : null

  // Existing DB hire recommendation (ground truth, do not contradict)
  const rec = c.rec || c.hireRecommendation || null

  // Performance rating from Module 7
  const rating = c.performanceRating || null

  // Determine status from score, aligned with existing threshold logic:
  // ≥85 → strong, ≥70 → consider, ≥50 → review, <50 → weak
  // When score is null (no interview completed), status is 'unknown'
  let status, title, summary
  if (score === null) {
    status  = 'unknown'
    title   = 'Insufficient data'
    summary = 'No completed interview score is available for this candidate.'
  } else if (score >= 85) {
    status  = 'strong'
    title   = 'Strong shortlist candidate'
    summary = 'This candidate performed strongly across the AI interview evaluation.'
  } else if (score >= 70) {
    status  = 'consider'
    title   = 'Consider for shortlist'
    summary = 'This candidate performed well and merits shortlist consideration.'
  } else if (score >= 50) {
    status  = 'review'
    title   = 'Needs further review'
    summary = 'This candidate\'s performance is moderate. Additional evaluation is recommended.'
  } else {
    status  = 'weak'
    title   = 'Below current shortlist benchmark'
    summary = 'This candidate\'s performance is below the shortlist threshold based on the AI evaluation.'
  }

  // Build factual reasons list — only from real data, no fabrication
  const reasons = []
  const strengths = []
  const concerns  = []

  // Overall score
  if (score !== null) {
    reasons.push(`Overall interview score: ${score}/100.`)
  }

  // Performance rating (from existing DB value)
  if (rating) {
    reasons.push(`AI performance rating: ${rating}.`)
    if (rating === 'Excellent' || rating === 'Good') {
      strengths.push(`Performance rated as "${rating}"`)
    } else if (rating === 'Below Average' || rating === 'Poor') {
      concerns.push(`Performance rated as "${rating}"`)
    }
  }

  // Hire recommendation from DB
  if (rec && rec !== 'Consider') {
    reasons.push(`Hire recommendation: ${rec}.`)
  }

  // Category scores — only report when available
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

      if (value >= 80) {
        strengths.push(`${label}: ${value}/100 — above benchmark`)
      } else if (value < 60) {
        concerns.push(`${label}: ${value}/100 — below threshold`)
      }
    })

    // Highlight any category that is notably below the overall score (gap > 12)
    if (score !== null) {
      availableCats.forEach(({ label, value }) => {
        const gap = score - value
        if (gap > 12 && value < 70) {
          const existing = concerns.find(c => c.startsWith(label))
          if (!existing) {
            concerns.push(`${label} (${value}/100) is notably below the overall score (${score}/100)`)
          }
        }
      })
    }
  } else {
    // Legacy interview: no M7 category data
    reasons.push('Module 7 category breakdown is not available for this interview.')
    concerns.push('Category scores unavailable (legacy interview data)')
  }

  // Resume / ATS score
  if (resumeScore !== null) {
    reasons.push(`Resume / ATS score: ${resumeScore}/100.`)
    if (resumeScore >= 80) {
      strengths.push(`Strong resume (ATS score: ${resumeScore}/100)`)
    } else if (resumeScore < 60) {
      concerns.push(`Resume score is below average (ATS: ${resumeScore}/100)`)
    }
  } else {
    reasons.push('Resume / ATS score: not available.')
    concerns.push('Resume or ATS score was not submitted or not yet analyzed')
  }

  // Interview count signal (rank is a proxy — rank 1 means only 1 interview in the dataset isn't reliable)
  // We don't have interview count directly in realCandidates, so skip if unavailable.
  // If questionsAnswered is available, use it as a data quality signal.
  if (c.questionsAnswered != null && c.questionCount != null && c.questionCount > 0) {
    const completionPct = Math.round((c.questionsAnswered / c.questionCount) * 100)
    if (completionPct < 60) {
      concerns.push(`Only ${c.questionsAnswered}/${c.questionCount} questions were answered (${completionPct}% completion rate)`)
    } else if (completionPct === 100) {
      strengths.push(`Completed all ${c.questionCount} interview questions`)
    }
  }

  // Rank signal (only useful context, not a fabrication)
  if (c.rank === 1) {
    strengths.push('Ranked #1 by merit score across all evaluated candidates')
  } else if (c.rank != null && c.rank <= 3) {
    strengths.push(`Ranked #${c.rank} by merit score`)
  }

  return {
    status,
    title,
    summary,
    reasons,
    strengths,
    concerns,
  }
}

/**
 * getStatusColor(status) — returns a CSS color string for a given insight status.
 * Safe against unknown values.
 */
export function getInsightStatusColor(status) {
  switch (status) {
    case 'strong':  return '#10b981'   // green
    case 'consider': return '#6366f1'  // indigo
    case 'review':  return '#f59e0b'   // amber
    case 'weak':    return '#ef4444'   // red
    default:        return '#94a3b8'   // muted
  }
}

/**
 * getStatusBadgeClass(status) — returns an existing badge CSS class name.
 */
export function getInsightBadgeClass(status) {
  switch (status) {
    case 'strong':   return 'green'
    case 'consider': return 'blue'
    case 'review':   return 'orange'
    case 'weak':     return 'red'
    default:         return 'gray'
  }
}
