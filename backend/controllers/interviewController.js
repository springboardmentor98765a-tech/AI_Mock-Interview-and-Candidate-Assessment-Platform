'use strict'

const { pool }             = require('../config/database')
const interviewSvc        = require('../services/interviewService')
const brain               = require('../services/interviewBrain')
const strategy            = require('../services/interviewStrategy')
const backgroundReasoner = require('../services/backgroundReasoner')
const conversationEngine = require('../services/conversationEngine')
const interviewGenerator = require('../services/interviewGenerator')
const speechAnalysis     = require('../services/speechAnalysisService')


/* ─── POST /api/interviews/recommend-roles ─────────────────────────────── */
async function recommendRoles(req, res) {
  try {
    const userId = req.user.id
    const { resumeAnalysisId } = req.body

    if (!resumeAnalysisId) {
      return res.status(400).json({ success: false, message: 'resumeAnalysisId is required' })
    }

    const result = await pool.query(
      `SELECT a.contact_info, a.skills, a.technologies, a.experience, a.education, a.summary
         FROM resume_analyses a
         JOIN resumes r ON r.id = a.resume_id
        WHERE a.id = $1 AND r.user_id = $2`,
      [resumeAnalysisId, userId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Resume analysis not found' })
    }

    const row = result.rows[0]
    const analysisData = {
      contact:      row.contact_info,
      skills:       row.skills,
      technologies: row.technologies,
      experience:   row.experience,
      education:    row.education,
      summary:      row.summary,
    }

    const roles = await interviewSvc.recommendRoles(analysisData)
    return res.status(200).json({ success: true, roles })
  } catch (err) {
    console.error('[recommendRoles]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/generate ──────────────────────────────────────── */
async function generate(req, res) {
  try {
    const userId = req.user.id
    const { resumeAnalysisId, selectedRole, interviewType, difficulty, questionCount } = req.body

    if (!selectedRole) {
      return res.status(400).json({ success: false, message: 'selectedRole is required' })
    }

    const rawCount = parseInt(questionCount, 10)
    if (isNaN(rawCount) || rawCount < 1) {
      return res.status(400).json({ success: false, message: 'Please provide a valid number of questions (at least 1)' })
    }
    const count = Math.min(rawCount, 50)
    const type  = interviewType || 'Mixed'
    const diff  = difficulty    || 'Medium'

    let resumeContext = {}
    if (resumeAnalysisId) {
      const r = await pool.query(
        `SELECT a.skills, a.technologies, a.experience, a.education
           FROM resume_analyses a
           JOIN resumes rv ON rv.id = a.resume_id
          WHERE a.id = $1 AND rv.user_id = $2`,
        [resumeAnalysisId, userId]
      )
      if (r.rows[0]) {
        resumeContext = {
          skills:       r.rows[0].skills,
          technologies: r.rows[0].technologies,
          experience:   r.rows[0].experience,
          education:    r.rows[0].education,
        }
      }
    }

    const questions = await interviewSvc.generateQuestions({
      role:          selectedRole,
      interviewType: type,
      difficulty:    diff,
      questionCount: count,
      resumeContext,
    })

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const ivResult = await client.query(
        `INSERT INTO interviews
           (user_id, resume_analysis_id, selected_role, interview_type, difficulty, question_count, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING *`,
        [userId, resumeAnalysisId || null, selectedRole, type, diff, count]
      )
      const interview = ivResult.rows[0]

      for (const q of questions) {
        await client.query(
          `INSERT INTO interview_questions (interview_id, question, category, question_type, expected_language, difficulty, expected_points, sequence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [interview.id, q.question, q.category, q.questionType, q.expectedLanguage, q.difficulty, q.expected_points, q.sequence]
        )
      }

      await client.query('COMMIT')

      const qRows = await pool.query(
        `SELECT * FROM interview_questions WHERE interview_id = $1 ORDER BY sequence`,
        [interview.id]
      )

      // ── Interview Brain & Strategy hookpoint: create state + record Question 1
      try {
        brain.createInterviewState({
          interviewId:    interview.id,
          role:           selectedRole,
          interviewType:  type,
          difficulty:     diff,
          totalQuestions: count,
        })
        strategy.initializeStrategy(interview.id, {
          interviewType:  type,
          difficulty:     diff,
          totalQuestions: count,
        })
        if (questions.length > 0) {
          brain.recordQuestion(interview.id, questions[0])
        }
        console.log('[FLOW] Question generated & Brain/Strategy initialised with Question 1')
      } catch (brainErr) {
        console.warn('[InterviewBrain] generate hook failed (non-fatal):', brainErr.message)
      }
      // ────────────────────────────────────────────────────────────────────────

      return res.status(201).json({
        success:   true,
        interview: {
          id:            interview.id,
          selectedRole:  interview.selected_role,
          interviewType: interview.interview_type,
          difficulty:    interview.difficulty,
          questionCount: interview.question_count,
          status:        interview.status,
        },
        questions: qRows.rows.map(q => ({
          id:               q.id,
          question:         q.question,
          category:         q.category,
          questionType:     q.question_type || 'technical',
          expectedLanguage: q.expected_language || null,
          difficulty:       q.difficulty,
          expectedPoints:   q.expected_points,
          sequence:         q.sequence,
        })),
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('[generate]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/start ─────────────────────────────────────────── */
async function start(req, res) {
  try {
    const userId      = req.user.id
    const { interviewId } = req.body

    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'interviewId is required' })
    }

    const result = await pool.query(
      `UPDATE interviews
          SET status = 'in_progress', started_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [interviewId, userId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }

    // ── Interview Brain hookpoint: mark interview as started ─────────────────
    try {
      brain.updateInterviewState(interviewId, {
        interviewStartedAt: result.rows[0].started_at
          ? new Date(result.rows[0].started_at).toISOString()
          : new Date().toISOString(),
      })
    } catch (brainErr) {
      console.warn('[InterviewBrain] start hook failed (non-fatal):', brainErr.message)
    }
    // ────────────────────────────────────────────────────────────────────────

    return res.status(200).json({ success: true, interview: result.rows[0] })
  } catch (err) {
    console.error('[start]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/submit ────────────────────────────────────────── */
async function submitAnswer(req, res) {
  try {
    const userId     = req.user.id
    const { interviewId, questionId, answer, timeTaken, audioDurationS, segmentsMeta } = req.body

    if (!interviewId || !questionId) {
      return res.status(400).json({ success: false, message: 'interviewId and questionId are required' })
    }

    const check = await pool.query(
      `SELECT iq.id, iq.sequence, iq.question, iq.expected_points FROM interview_questions iq
         JOIN interviews iv ON iv.id = iq.interview_id
        WHERE iq.id = $1 AND iv.id = $2 AND iv.user_id = $3`,
      [questionId, interviewId, userId]
    )

    if (!check.rows[0]) {
      return res.status(404).json({ success: false, message: 'Question not found for this interview' })
    }

    const currentSeq     = check.rows[0].sequence
    const questionText   = check.rows[0].question || ''
    const expectedPoints = check.rows[0].expected_points || []

    await pool.query(
      `INSERT INTO interview_answers (question_id, answer, time_taken)
       VALUES ($1, $2, $3)
       ON CONFLICT (question_id) DO UPDATE SET answer = EXCLUDED.answer, time_taken = EXCLUDED.time_taken`,
      [questionId, answer || '', timeTaken || 0]
    )

    console.log('[FLOW] Transcript finalized & answer saved to DB')

    // ── Speech analysis (non-blocking — fire and forget from candidate's view) ─
    // Runs after the answer is saved; does not block question progression.
    // Persists results to speech_analysis column for use in final evaluation.
    setImmediate(async () => {
      try {
        const saResult = await speechAnalysis.analyzeAnswer({
          transcript:     answer || '',
          audioDurationS: typeof audioDurationS === 'number' ? audioDurationS : null,
          segmentsMeta:   Array.isArray(segmentsMeta) ? segmentsMeta : [],
          questionText,
          expectedPoints: Array.isArray(expectedPoints) ? expectedPoints : [],
        })
        await pool.query(
          `UPDATE interview_answers SET speech_analysis = $1 WHERE question_id = $2`,
          [JSON.stringify(saResult), questionId]
        )
        console.log(`[SpeechAnalysis] Persisted for questionId=${questionId} wpm=${saResult.words_per_minute} comm=${saResult.communication_score}`)
      } catch (saErr) {
        console.warn('[SpeechAnalysis] Non-fatal analysis error:', saErr.message)
      }
    })
    // ─────────────────────────────────────────────────────────────────────────

    let responseObj = null
    try {
      brain.finishSpeaking(interviewId, answer || '')
      console.log('[FLOW] Interview Brain updated')

      strategy.updateStrategy(interviewId)
      console.log('[FLOW] Interview Strategy updated')

      // Use pre-computed background reasoning when available (saves one full Qwen call).
      // makeLocalDecision is rule-based and returns in <1ms.
      // Falls back to makeDecision (Qwen) when no reasoning result exists yet.
      let decision = conversationEngine.makeLocalDecision(interviewId)
      if (decision) {
        console.log('[FLOW] Using pre-computed local decision (0 Qwen calls):', decision.action)
      } else {
        decision = await conversationEngine.makeDecision(interviewId)
        console.log('[FLOW] Conversation decision via Qwen:', decision.action)
      }

      const nextQRes = await pool.query(
        `SELECT id, question, category, question_type, expected_language, difficulty, sequence
           FROM interview_questions
          WHERE interview_id = $1 AND sequence = $2`,
        [interviewId, currentSeq + 1]
      )
      const nextQRow = nextQRes.rows[0]
      const fallbackText = nextQRow?.question || 'Thank you. Let us move forward.'

      responseObj = await interviewGenerator.generateResponse(decision, interviewId, fallbackText)
      console.log('[FLOW] Adaptive response generated:', responseObj?.text?.slice(0, 60))

      // Persist adaptive question text to database (INT-02)
      if (nextQRow && responseObj?.text && responseObj.text !== fallbackText) {
        await pool.query(
          `UPDATE interview_questions
              SET question = $1
            WHERE interview_id = $2 AND sequence = $3`,
          [responseObj.text, interviewId, currentSeq + 1]
        )
        console.log(`[FLOW] Adaptive question persisted to DB for sequence ${currentSeq + 1}`)
      }

      // Advance InterviewBrain state to the next question (INT-03)
      if (nextQRow) {
        const nextQuestionText = (responseObj?.text && responseObj.text !== fallbackText)
          ? responseObj.text
          : nextQRow.question
        brain.recordQuestion(interviewId, {
          question:         nextQuestionText,
          questionType:     nextQRow.question_type || 'technical',
          expectedLanguage: nextQRow.expected_language || null,
          category:         nextQRow.category || '',
          difficulty:       nextQRow.difficulty || '',
          sequence:         nextQRow.sequence || (currentSeq + 1),
        })
        console.log(`[FLOW] Interview Brain advanced to question sequence ${currentSeq + 1}`)
      }
    } catch (flowErr) {
      console.warn('[AdaptiveFlow] Non-fatal error during adaptive pipeline execution:', flowErr.message)
    }

    return res.status(200).json({ success: true, message: 'Answer saved', response: responseObj })
  } catch (err) {
    console.error('[submitAnswer]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}


/* ─── POST /api/interviews/transcript-update ─────────────────────────────── */
async function updateTranscript(req, res) {
  try {
    const { interviewId, transcript } = req.body
    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'interviewId is required' })
    }

    try {
      brain.startSpeaking(interviewId)
      const state = brain.updatePartialTranscript(interviewId, transcript || '')
      console.log('[FLOW] Partial transcript updated in Brain')
      console.log('[FLOW] Background Context Builder updated liveContext')

      if (state) {
        backgroundReasoner.maybeSchedule(state)
      }
    } catch (bErr) {
      console.warn('[TranscriptUpdate] Non-fatal error updating partial transcript:', bErr.message)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[updateTranscript]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/complete ─────────────────────────────────────── */
async function complete(req, res) {
  try {
    const userId      = req.user.id
    const { interviewId, answers, duration } = req.body

    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'interviewId is required' })
    }

    const ivCheck = await pool.query(
      `SELECT * FROM interviews WHERE id = $1 AND user_id = $2`,
      [interviewId, userId]
    )
    if (!ivCheck.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }

    const interview = ivCheck.rows[0]

    // Guard: if already completed, return existing result without re-running evaluation
    if (interview.status === 'completed' && interview.score !== null) {
      const qRows2 = await pool.query(
        `SELECT iq.*, ia.answer, ia.time_taken, ia.score, ia.feedback
           FROM interview_questions iq
           LEFT JOIN interview_answers ia ON ia.question_id = iq.id
          WHERE iq.interview_id = $1 ORDER BY iq.sequence`,
        [interviewId]
      )
      console.log(`[complete] Interview ${interviewId} already completed — returning cached result`)
      return res.status(200).json({
        success: true,
        result: {
          interviewId,
          selectedRole:      interview.selected_role,
          interviewType:     interview.interview_type,
          difficulty:        interview.difficulty,
          duration:          interview.duration || 0,
          questionsAnswered: interview.questions_answered || 0,
          totalQuestions:    qRows2.rows.length,
          evaluation: {
            overall_score:      interview.score,
            question_feedback:  qRows2.rows.map((q, i) => ({
              question_index: i,
              score:        q.score,
              feedback:     q.feedback,
              strengths:    '',
              improvements: '',
            })).filter(f => f.score !== null),
          },
        },
      })
    }

    const qRows = await pool.query(
      `SELECT iq.*, ia.answer, ia.time_taken, ia.speech_analysis
         FROM interview_questions iq
         LEFT JOIN interview_answers ia ON ia.question_id = iq.id
        WHERE iq.interview_id = $1 ORDER BY iq.sequence`,
      [interviewId]
    )

    // Build questionsWithAnswers, pulling saved speech_analysis per question
    const questionsWithAnswers = qRows.rows.map(q => {
      const submitted = (answers || []).find(a => a.questionId === q.id)
      return {
        id:              q.id,
        question:        q.question,
        category:        q.category,
        expected_points: q.expected_points,
        answer:          submitted?.answer || q.answer || '',
        timeTaken:       submitted?.timeTaken || q.time_taken || 0,
        speechAnalysis:  q.speech_analysis || null,
      }
    })

    // ── AUD-02 / NF-01 FIX: guarantee last-question speech analysis without duplicate LLM call ─
    // submitAnswer fires speech analysis via setImmediate (non-blocking), so the
    // final question's analysis may not be persisted yet when complete() runs.
    // For each answered question that the in-memory snapshot shows as unanalysed,
    // re-read from DB first:
    //   • If the setImmediate already wrote the data → use it (no duplicate LLM call).
    //   • If still null (race condition: complete() beat setImmediate) → run synchronously.
    // This ensures exactly-once analysis in all execution orderings.
    for (const qa of questionsWithAnswers) {
      if (!qa.speechAnalysis && qa.answer && qa.answer.trim().length > 0) {
        try {
          // Re-read from DB to avoid duplicating a setImmediate that already completed
          const freshRow = await pool.query(
            `SELECT speech_analysis FROM interview_answers WHERE question_id = $1`,
            [qa.id]
          )
          const alreadyPersisted = freshRow.rows[0]?.speech_analysis
          if (alreadyPersisted) {
            qa.speechAnalysis = alreadyPersisted
            console.log(`[complete] Speech analysis already persisted for questionId=${qa.id} — skipping duplicate`)
            continue
          }

          // Still null — run synchronously to close the race window before aggregation
          console.log(`[complete] Filling missing speech analysis for questionId=${qa.id}`)
          const saResult = await speechAnalysis.analyzeAnswer({
            transcript:     qa.answer,
            audioDurationS: null,   // audio metadata not available at complete() time
            segmentsMeta:   [],
            questionText:   qa.question   || '',
            expectedPoints: Array.isArray(qa.expected_points) ? qa.expected_points : [],
          })
          qa.speechAnalysis = saResult
          await pool.query(
            `UPDATE interview_answers SET speech_analysis = $1 WHERE question_id = $2`,
            [JSON.stringify(saResult), qa.id]
          )
          console.log(`[complete] Speech analysis filled for questionId=${qa.id} comm=${saResult.communication_score}`)
        } catch (fillErr) {
          console.warn(`[complete] Non-fatal: could not fill speech analysis for questionId=${qa.id}:`, fillErr.message)
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Aggregate speech analysis for the full interview ─────────────────────
    // Compute mean speech communication score from all answers that have analysis.
    // Used to anchor the LLM's communication score to real measurable signals.
    const answersWithSpeech = questionsWithAnswers.filter(q => q.speechAnalysis && q.speechAnalysis.communication_score !== null)
    const avgCommScore = answersWithSpeech.length > 0
      ? Math.round(answersWithSpeech.reduce((s, q) => s + (q.speechAnalysis.communication_score || 0), 0) / answersWithSpeech.length)
      : null

    const avgGrammarScore = answersWithSpeech.length > 0
      ? Math.round(answersWithSpeech.reduce((s, q) => s + (q.speechAnalysis.grammar_score || 0), 0) / answersWithSpeech.length)
      : null

    const avgWpm = answersWithSpeech.length > 0
      ? Math.round(answersWithSpeech.filter(q => q.speechAnalysis.words_per_minute).reduce((s, q) => s + (q.speechAnalysis.words_per_minute || 0), 0) /
          Math.max(1, answersWithSpeech.filter(q => q.speechAnalysis.words_per_minute).length))
      : null

    const avgFillerRate = answersWithSpeech.length > 0
      ? Math.round(answersWithSpeech.reduce((s, q) => s + (q.speechAnalysis.filler_rate || 0), 0) / answersWithSpeech.length)
      : null

    // Collect all pace labels to summarise dominant pace
    const paceLabels  = answersWithSpeech.map(q => q.speechAnalysis.pace_label).filter(Boolean)
    const dominantPace = paceLabels.length > 0
      ? paceLabels.sort((a, b) =>
          paceLabels.filter(v => v === b).length - paceLabels.filter(v => v === a).length
        )[0]
      : null

    // Build aggregated speech summary for DB storage alongside category_scores
    const speechSummary = {
      avg_communication_score: avgCommScore,
      avg_grammar_score:       avgGrammarScore,
      avg_words_per_minute:    avgWpm,
      avg_filler_rate:         avgFillerRate,
      dominant_pace:           dominantPace,
      answers_analysed:        answersWithSpeech.length,
      total_answers:           questionsWithAnswers.length,
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Run LLM evaluation — pass speech analysis context per answer so the LLM
    // uses real signals rather than guessing communication quality from text alone
    const evaluation = await interviewSvc.evaluateAnswers(
      questionsWithAnswers,
      interview.selected_role,
      interview.interview_type,
      speechSummary        // passed through to the LLM prompt
    )

    // ── Blend speech-based communication score with LLM score ─────────────
    // If we have a measured communication score from speech analysis,
    // blend it: 60% real speech signals + 40% LLM estimate.
    // This prevents the LLM from fabricating communication quality.
    if (typeof avgCommScore === 'number' && evaluation.category_scores) {
      const llmComm = evaluation.category_scores.communication || 0
      evaluation.category_scores.communication = Math.round(avgCommScore * 0.6 + llmComm * 0.4)
      console.log(`[SpeechAnalysis] Communication score blended: speech=${avgCommScore} llm=${llmComm} final=${evaluation.category_scores.communication}`)
    }

    // Recalculate overall_score with updated category_scores
    // Weights: technical=30%, communication=30%, confidence=25%, professionalism=15%
    if (evaluation.category_scores) {
      const cs = evaluation.category_scores
      // AUD-03 FIX: only blend problem_solving into techScore when it is a
      // genuinely positive value from the LLM.  interviewService.js defaults any
      // missing key to 0 via `Number(...) || 0`, so typeof check alone is not
      // sufficient — we must also verify > 0 to avoid halving technical score.
      // Verification:
      //   technical=80, problem_solving=0|missing → techScore = 80  ✓
      //   technical=80, problem_solving=80        → techScore = 80  ✓
      //   technical=90, problem_solving=70        → techScore = 80  ✓ (intended blend)
      const techScore = (typeof cs.problem_solving === 'number' && cs.problem_solving > 0)
        ? Math.round((cs.technical + cs.problem_solving) / 2)
        : (cs.technical || 0)
      const recomputed = Math.round(
        techScore           * 0.30 +
        (cs.communication   || 0) * 0.30 +
        (cs.confidence      || 0) * 0.25 +
        (cs.professionalism || cs.grammar || 0) * 0.15
      )
      // Only override if the recomputed score is within a reasonable range
      if (recomputed > 0) {
        evaluation.overall_score = Math.min(100, Math.max(0, recomputed))
        console.log(`[complete] Overall score recomputed from category_scores: ${evaluation.overall_score}`)
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      for (const qa of questionsWithAnswers) {
        const fb = (evaluation.question_feedback || []).find(f => f.question_index === questionsWithAnswers.indexOf(qa))
        await client.query(
          `INSERT INTO interview_answers (question_id, answer, time_taken, score, feedback)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (question_id) DO UPDATE
             SET answer = EXCLUDED.answer,
                 time_taken = EXCLUDED.time_taken,
                 score = EXCLUDED.score,
                 feedback = EXCLUDED.feedback`,
          [
            qa.id,
            qa.answer,
            qa.timeTaken,
            fb?.score || null,
            fb ? `${fb.feedback || ''}\nStrengths: ${fb.strengths || ''}\nImprovements: ${fb.improvements || ''}` : null,
          ]
        )
      }

      // Merge speech summary into category_scores for persistence
      const finalCategoryScores = {
        ...(evaluation.category_scores || {}),
        speech_analysis_summary: speechSummary,
      }

      await client.query(
        `UPDATE interviews
            SET status = 'completed',
                completed_at = NOW(),
                score = $1,
                duration = $2,
                questions_answered = $3,
                overall_feedback = $4,
                strengths = $5,
                weaknesses = $6,
                recommendations = $7,
                category_scores = $8,
                hire_recommendation = $9,
                paused_at = NULL
          WHERE id = $10`,
        [
          evaluation.overall_score,
          duration || 0,
          questionsWithAnswers.filter(q => q.answer && q.answer.trim()).length,
          evaluation.overall_feedback || null,
          JSON.stringify(evaluation.strengths || []),
          JSON.stringify(evaluation.weaknesses || []),
          JSON.stringify(evaluation.recommendations || []),
          JSON.stringify(finalCategoryScores),
          evaluation.hire_recommendation || 'Consider',
          interviewId,
        ]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    // ── Interview Brain hookpoint: clear state after completion ─────────────
    try {
      brain.clearInterview(interviewId)
    } catch (brainErr) {
      console.warn('[InterviewBrain] complete hook failed (non-fatal):', brainErr.message)
    }

    // ────────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      result: {
        interviewId,
        selectedRole:      interview.selected_role,
        interviewType:     interview.interview_type,
        difficulty:        interview.difficulty,
        duration:          duration || 0,
        questionsAnswered: questionsWithAnswers.filter(q => q.answer).length,
        totalQuestions:    questionsWithAnswers.length,
        evaluation,
      },
    })
  } catch (err) {
    console.error('[complete]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/interviews ────────────────────────────────────────────────── */
async function getAll(req, res) {
  try {
    const userId = req.user.id
    const result = await pool.query(
      `SELECT id, selected_role, interview_type, difficulty, question_count,
              status, score, started_at, completed_at, duration, created_at,
              questions_answered, overall_feedback, hire_recommendation
         FROM interviews
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    )
    return res.status(200).json({ success: true, interviews: result.rows })
  } catch (err) {
    console.error('[getAll]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/interviews/history ───────────────────────────────────────── */
async function getHistory(req, res) {
  try {
    const userId = req.user.id
    const result = await pool.query(
      `SELECT iv.id, iv.selected_role, iv.interview_type, iv.difficulty, iv.question_count,
              iv.status, iv.score, iv.started_at, iv.completed_at, iv.duration, iv.created_at,
              iv.questions_answered, iv.overall_feedback, iv.hire_recommendation,
              iv.category_scores, iv.strengths, iv.weaknesses,
              (SELECT COUNT(*) FROM interview_recordings r WHERE r.interview_id = iv.id) AS recording_count,
              (SELECT r.id FROM interview_recordings r WHERE r.interview_id = iv.id ORDER BY r.created_at DESC LIMIT 1) AS recording_id
         FROM interviews iv
        WHERE iv.user_id = $1 AND iv.status = 'completed'
        ORDER BY iv.completed_at DESC
        LIMIT 50`,
      [userId]
    )
    return res.status(200).json({ success: true, history: result.rows })
  } catch (err) {
    console.error('[getHistory]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/interviews/:id ────────────────────────────────────────────── */
async function getById(req, res) {
  try {
    const userId = req.user.id
    const role   = req.user.role
    const { id } = req.params

    const isPrivileged = role === 'RECRUITER' || role === 'ADMIN'
    const ivQuery = isPrivileged
      ? `SELECT iv.*, u.name AS candidate_name, u.email AS candidate_email FROM interviews iv JOIN users u ON u.id = iv.user_id WHERE iv.id = $1`
      : `SELECT iv.*, u.name AS candidate_name, u.email AS candidate_email FROM interviews iv JOIN users u ON u.id = iv.user_id WHERE iv.id = $1 AND iv.user_id = $2`
    const ivParams = isPrivileged ? [id] : [id, userId]

    const ivResult = await pool.query(ivQuery, ivParams)
    if (!ivResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }

    const interview = ivResult.rows[0]

    const qResult = await pool.query(
      `SELECT iq.*, ia.answer, ia.time_taken, ia.score, ia.feedback, ia.speech_analysis
         FROM interview_questions iq
         LEFT JOIN interview_answers ia ON ia.question_id = iq.id
        WHERE iq.interview_id = $1
        ORDER BY iq.sequence`,
      [id]
    )

    const rResult = await pool.query(
      `SELECT id, recording_type, mime_type, file_size, duration_seconds, created_at
         FROM interview_recordings
        WHERE interview_id = $1
        ORDER BY created_at ASC`,
      [id]
    )

    return res.status(200).json({
      success:   true,
      interview: {
        id:                 interview.id,
        candidateName:      interview.candidate_name,
        candidateEmail:     interview.candidate_email,
        selectedRole:       interview.selected_role,
        interviewType:      interview.interview_type,
        difficulty:         interview.difficulty,
        questionCount:      interview.question_count,
        questionsAnswered:  interview.questions_answered || 0,
        status:             interview.status,
        score:              interview.score,
        duration:           interview.duration,
        startedAt:          interview.started_at,
        completedAt:        interview.completed_at,
        createdAt:          interview.created_at,
        overallFeedback:    interview.overall_feedback,
        strengths:          interview.strengths,
        weaknesses:         interview.weaknesses,
        recommendations:    interview.recommendations,
        categoryScores:     interview.category_scores,
        hireRecommendation: interview.hire_recommendation,
      },
      questions: qResult.rows.map(q => ({
        id:             q.id,
        question:       q.question,
        category:       q.category,
        difficulty:     q.difficulty,
        expectedPoints: q.expected_points,
        sequence:       q.sequence,
        answer:         q.answer,
        timeTaken:      q.time_taken,
        score:          q.score,
        feedback:       q.feedback,
        speechAnalysis: q.speech_analysis || null,
      })),
      recordings: rResult.rows,
    })
  } catch (err) {
    console.error('[getById]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── DELETE /api/interviews/:id ────────────────────────────────────────── */
async function deleteInterview(req, res) {
  try {
    const userId = req.user.id
    const { id } = req.params

    const result = await pool.query(
      `DELETE FROM interviews WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }
    return res.status(200).json({ success: true, message: 'Interview deleted' })
  } catch (err) {
    console.error('[deleteInterview]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/interviews/stats ──────────────────────────────────────────── */
async function getStats(req, res) {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `SELECT
         COUNT(*)                                             AS total_interviews,
         COUNT(*) FILTER (WHERE status = 'completed')        AS completed_interviews,
         ROUND(AVG(score) FILTER (WHERE score IS NOT NULL))  AS avg_score,
         MAX(score)                                           AS highest_score,
         MIN(score)                                           AS lowest_score
       FROM interviews
       WHERE user_id = $1`,
      [userId]
    )

    const recent = await pool.query(
      `SELECT id, selected_role, interview_type, difficulty, score, completed_at, duration
         FROM interviews
        WHERE user_id = $1 AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 5`,
      [userId]
    )

    const stats = result.rows[0]
    return res.status(200).json({
      success: true,
      stats: {
        totalInterviews:     parseInt(stats.total_interviews)     || 0,
        completedInterviews: parseInt(stats.completed_interviews) || 0,
        avgScore:            parseInt(stats.avg_score)            || 0,
        highestScore:        parseInt(stats.highest_score)        || 0,
        lowestScore:         parseInt(stats.lowest_score)         || 0,
      },
      recentInterviews: recent.rows,
    })
  } catch (err) {
    console.error('[getStats]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/pause ────────────────────────────────────────── */
async function pauseInterview(req, res) {
  try {
    const userId = req.user.id
    const { interviewId } = req.body
    if (!interviewId) return res.status(400).json({ success: false, message: 'interviewId required' })

    const result = await pool.query(
      `UPDATE interviews
          SET status = 'paused', paused_at = NOW()
        WHERE id = $1 AND user_id = $2 AND status = 'in_progress'
        RETURNING *`,
      [interviewId, userId]
    )
    if (!result.rows[0]) {
      return res.status(200).json({ success: true, message: 'Already paused or not in progress' })
    }
    console.log(`[SESSION] Interview ${interviewId} paused`)
    return res.status(200).json({ success: true, interview: result.rows[0] })
  } catch (err) {
    console.error('[pauseInterview]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/interviews/resume ───────────────────────────────────────── */
async function resumeInterview(req, res) {
  try {
    const userId = req.user.id
    const { interviewId } = req.body
    if (!interviewId) return res.status(400).json({ success: false, message: 'interviewId required' })

    const result = await pool.query(
      `UPDATE interviews
          SET status = 'in_progress',
              paused_duration = COALESCE(paused_duration, 0)
                + GREATEST(0, EXTRACT(EPOCH FROM (NOW() - paused_at))::INTEGER),
              paused_at = NULL
        WHERE id = $1 AND user_id = $2 AND status = 'paused'
        RETURNING *`,
      [interviewId, userId]
    )
    if (!result.rows[0]) {
      return res.status(200).json({ success: true, message: 'Not paused' })
    }
    console.log(`[SESSION] Interview ${interviewId} resumed`)
    return res.status(200).json({ success: true, interview: result.rows[0] })
  } catch (err) {
    console.error('[resumeInterview]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  recommendRoles,
  generate,
  start,
  pauseInterview,
  resumeInterview,
  submitAnswer,
  updateTranscript,
  complete,
  getAll,
  getHistory,
  getById,
  deleteInterview,
  getStats,
}
