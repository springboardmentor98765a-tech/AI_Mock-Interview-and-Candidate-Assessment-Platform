'use strict'

/**
 * backend/controllers/cvController.js
 *
 * REST handlers for CV analysis results.
 * All routes are RECRUITER/ADMIN only — candidates do not see behavioral analysis.
 *
 * Routes (mounted at /api/cv in server.js):
 *   GET  /api/cv/:interviewId          → getResult    (full analysis result)
 *   GET  /api/cv/:interviewId/status   → getStatus    (lightweight poll)
 *   POST /api/cv/:interviewId/trigger  → trigger      (manual re-trigger)
 */

const { pool }      = require('../config/database')
const cvService     = require('../services/cvService')
const scoringEngine = require('../services/scoringEngine')
const feedbackService = require('../services/feedbackService')

/* ─── GET /api/cv/:interviewId ───────────────────────────────────────────── */
/**
 * Return the full CV analysis result for an interview.
 * RECRUITER/ADMIN only (enforced in route).
 *
 * Response 200: { success, analysis: { ...all columns } }
 * Response 404: analysis row not yet created (not triggered or still pending)
 * Response 403: interview not found
 */
async function getResult(req, res) {
  try {
    const { interviewId } = req.params

    // Verify the interview exists
    const ivCheck = await pool.query(
      `SELECT id FROM interviews WHERE id = $1`,
      [interviewId]
    )
    if (!ivCheck.rows[0]) {
      return res.status(404).json({ success: false, message: 'Interview not found' })
    }

    const result = await pool.query(
      `SELECT
         id, interview_id, recording_id, status, analyzed_at, error_message,
         face_detection_rate, eye_contact_pct, facing_camera_rate,
         head_movement_deg, attention_score,
         engagement_estimate, confidence_indicator,
         disquietment_level, fear_level, doubt_confusion_level, disconnection_level,
         facial_activity, frames_total, frames_with_face,
         cnn_mean_probs, per_frame_raw,
         warning_count, warning_events, avg_face_visibility, created_at
       FROM interview_cv_analysis
       WHERE interview_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [interviewId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'CV analysis not yet available for this interview. ' +
                 'It may still be processing or has not been triggered.',
      })
    }

    return res.status(200).json({ success: true, analysis: result.rows[0] })
  } catch (err) {
    console.error('[cvController.getResult]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── GET /api/cv/:interviewId/status ───────────────────────────────────── */
/**
 * Lightweight status poll — returns just the processing status and timestamp.
 * RECRUITER/ADMIN only.
 *
 * Response 200: { success, status, analyzed_at, error_message }
 * Response 404: no analysis row exists yet
 */
async function getStatus(req, res) {
  try {
    const { interviewId } = req.params

    const result = await pool.query(
      `SELECT status, analyzed_at, error_message
       FROM interview_cv_analysis
       WHERE interview_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [interviewId]
    )

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        status:  'not_found',
        message: 'No CV analysis record found for this interview.',
      })
    }

    const row = result.rows[0]
    return res.status(200).json({
      success:       true,
      status:        row.status,
      analyzed_at:   row.analyzed_at,
      error_message: row.error_message,
    })
  } catch (err) {
    console.error('[cvController.getStatus]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/cv/:interviewId/trigger ─────────────────────────────────── */
/**
 * Manually trigger (or re-trigger) CV analysis for an interview.
 * RECRUITER/ADMIN only (enforced in route).
 *
 * Returns 202 immediately — actual analysis runs asynchronously in background.
 * Useful for re-running analysis or for interviews uploaded before auto-trigger
 * was deployed.
 *
 * Response 202: { success, message, interviewId }
 * Response 404: interview or video recording not found
 */
async function trigger(req, res) {
  try {
    const { interviewId } = req.params

    // Find the video recording for this interview
    const recResult = await pool.query(
      `SELECT r.id AS recording_id, r.file_path
       FROM interview_recordings r
       WHERE r.interview_id = $1 AND r.recording_type = 'video'
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [interviewId]
    )

    if (!recResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'No video recording found for this interview.',
      })
    }

    const { recording_id, file_path } = recResult.rows[0]

    // Upsert a 'pending' row (idempotent — same interview can be re-triggered)
    await pool.query(
      `INSERT INTO interview_cv_analysis (interview_id, recording_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (interview_id)
       DO UPDATE SET status = 'pending', error_message = NULL, analyzed_at = NULL`,
      [interviewId, recording_id]
    )

    // Return 202 immediately — analysis runs in background
    res.status(202).json({
      success:     true,
      message:     'CV analysis triggered. Check /status for progress.',
      interviewId: parseInt(interviewId, 10),
    })

    // Fire-and-forget: do not await, do not block the response
    setImmediate(() => {
      _runAndPersist(interviewId, recording_id, file_path)
        .catch(err => console.error(
          `[CV] Trigger background error interview=${interviewId}:`, err.message
        ))
    })
  } catch (err) {
    console.error('[cvController.trigger]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── Internal: recompute Module 7 scores after CV analysis completes ──────── */
/**
 * Called fire-and-forget from _runAndPersist after a successful CV analysis.
 * Re-runs the existing canonical scoring engine with the newly available CV
 * behavioural data so that the persisted Module 7 result is CV-augmented.
 *
 * Safety guarantees:
 *  - Does NOT re-call the LLM; reconstructs evaluation from already-persisted
 *    category_scores JSONB (written by interviewController.complete()).
 *  - Does NOT modify any LLM scores, question feedback, or unrelated fields.
 *  - Does NOT run when the interview record is missing or has no category_scores
 *    (i.e. complete() was never called — the record will still be scored when
 *    complete() does run because complete() already reads CV from DB when present,
 *    but in practice CV almost always arrives after complete()).
 *  - All errors are non-fatal; the existing score is preserved on failure.
 *
 * @param {number|string} interviewId
 * @param {object}        cvScores      The `result.scores` object from cv_service.py
 */
async function _recomputeModule7WithCv(interviewId, cvScores) {
  // ── 1. Load the existing interview record ─────────────────────────────────
  const ivRow = await pool.query(
    `SELECT score, performance_rating, category_scores
       FROM interviews
      WHERE id = $1`,
    [interviewId]
  )

  if (!ivRow.rows[0]) {
    console.warn(`[CV→M7] Interview ${interviewId} not found — skipping post-CV rescore`)
    return
  }

  const row = ivRow.rows[0]
  const existingCategoryScores = row.category_scores || {}

  // ── 2. Guard: only rescore if complete() has already run ──────────────────
  // complete() stores module7_scores inside category_scores.
  // If it hasn't run yet, there is nothing to augment; complete() will run
  // scoringEngine with cvAnalysis=null and produce the initial score.
  // (The DB still has the interview record in 'in_progress' status, not 'completed'.)
  if (!existingCategoryScores.module7_scores) {
    console.warn(
      `[CV→M7] interview=${interviewId} has no module7_scores yet — ` +
      `complete() may not have run; skipping post-CV rescore`
    )
    return
  }

  // ── 3. Reconstruct evaluation from persisted category_scores ──────────────
  // category_scores holds the raw LLM category scores merged in by complete().
  // Keys: technical, communication, problem_solving, confidence, grammar
  // (plus speech_analysis_summary and module7_scores added by Module 7)
  const evaluation = {
    overall_score:    row.score,
    category_scores:  {
      technical:       existingCategoryScores.technical,
      communication:   existingCategoryScores.communication,
      problem_solving: existingCategoryScores.problem_solving,
      confidence:      existingCategoryScores.confidence,
      grammar:         existingCategoryScores.grammar,
    },
    // Narrative fields are not needed by scoringEngine; leave empty.
    question_feedback: [],
    strengths:         [],
    weaknesses:        [],
    recommendations:   [],
  }

  // ── 4. Reconstruct speechSummary from persisted speech_analysis_summary ──
  const speechSummary = existingCategoryScores.speech_analysis_summary || null

  // ── 5. Build cvAnalysis object from the freshly-persisted cv_service result ─
  // These fields mirror the interview_cv_analysis table columns.
  const cvAnalysis = {
    engagement_estimate:   cvScores.engagement_estimate,
    confidence_indicator:  cvScores.confidence_indicator,
    attention_score:       cvScores.attention_score,
    eye_contact_pct:       cvScores.eye_contact_pct,
    warning_count:         cvScores.warning_count != null ? cvScores.warning_count : null,
    avg_face_visibility:   cvScores.avg_face_visibility,
    face_detection_rate:   cvScores.face_detection_rate,
  }

  // ── 6. Fetch per-question timing data for Professionalism time-management ─
  // Mirrors the questionsWithAnswers shape used by interviewController.complete().
  // Only time_taken is needed here; answer text and speech_analysis are not
  // required by the scoring engine at this call site.
  let questionsWithAnswers = []
  try {
    const qaRows = await pool.query(
      `SELECT iq.id, ia.answer, ia.time_taken
         FROM interview_questions iq
         LEFT JOIN interview_answers ia ON ia.question_id = iq.id
        WHERE iq.interview_id = $1
        ORDER BY iq.sequence`,
      [interviewId]
    )
    questionsWithAnswers = qaRows.rows.map(function(r) {
      return {
        id:        r.id,
        answer:    r.answer    || '',
        timeTaken: typeof r.time_taken === 'number' ? r.time_taken
                   : (r.time_taken != null ? parseInt(r.time_taken, 10) || 0 : 0),
      }
    })
  } catch (qaErr) {
    console.warn(`[CV→M7] Non-fatal: could not fetch answer timing for interview=${interviewId}:`, qaErr.message)
    // questionsWithAnswers stays []; scoringEngine will skip time-management
  }

  // ── 7. Recompute Module 7 using the canonical scoring engine ─────────────
  const module7 = scoringEngine.computeModule7Scores({
    evaluation,
    speechSummary,
    cvAnalysis,
    questionsWithAnswers,
  })

  if (typeof module7.overallScore !== 'number' || module7.overallScore <= 0) {
    console.warn(
      `[CV→M7] interview=${interviewId} — scoringEngine returned no valid score; ` +
      `preserving existing score=${row.score}`
    )
    return
  }

  // ── 8. Regenerate Module 7 narrative feedback with FINAL CV-augmented evidence ─
  // The initial feedback (generated by complete()) may reflect pre-CV scores.
  // Now that we have the FINAL numerical Module 7 result we regenerate it so
  // the narrative is consistent with the final confidence / etiquette values.
  //
  // Failure handling (critical):
  //   - If the LLM feedback call fails, fall back to the PREVIOUS valid
  //     feedback already stored in category_scores.module7_feedback.
  //   - Numerical scores (module7_scores, overall_score) are ALWAYS persisted
  //     regardless of feedback success/failure.
  //   - Never fabricate feedback; never roll back the numerical score.
  const previousFeedback = existingCategoryScores.module7_feedback || null
  let refreshedFeedback  = previousFeedback   // safe default: keep old feedback
  try {
    // Reconstruct interview role/type from already-loaded row (no extra DB query).
    // The interviews table row was fetched above; re-read it for role/type fields.
    const roleRow = await pool.query(
      `SELECT selected_role, interview_type FROM interviews WHERE id = $1`,
      [interviewId]
    )
    const role          = roleRow.rows[0]?.selected_role  || null
    const interviewType = roleRow.rows[0]?.interview_type || null

    const generated = await feedbackService.generateFeedback({
      module7:       module7,        // FINAL CV-augmented Module 7 scores
      evaluation,                    // reconstructed from persisted category_scores
      speechSummary,                 // from persisted speech_analysis_summary
      cvAnalysis,                    // the freshly-persisted CV scores
      role,
      interviewType,
    })

    if (generated !== null) {
      refreshedFeedback = generated
      console.log(`[CV→M7] Feedback refreshed for interview=${interviewId} with final CV evidence`)
    } else {
      console.warn(
        `[CV→M7] interview=${interviewId} — feedback generation returned null; ` +
        `preserving previous feedback (score update continues)`
      )
    }
  } catch (fbErr) {
    // Belt-and-suspenders: feedbackService.generateFeedback never throws, but just in case
    console.error(`[CV→M7] Non-fatal: feedback refresh threw for interview=${interviewId}:`, fbErr.message)
    // refreshedFeedback stays as previousFeedback
  }

  // ── 9. Merge updated module7_scores + refreshed feedback into category_scores ─
  // Preserve all existing fields (LLM scores, speech summary, etc.).
  // Only module7_scores, module7_feedback, and top-level score/rating are updated.
  const updatedCategoryScores = {
    ...existingCategoryScores,
    module7_scores: {
      communication:      module7.communication,
      confidence:         module7.confidence,
      technicalRelevance: module7.technicalRelevance,
      professionalism:    module7.professionalism,
      overallScore:       module7.overallScore,
      performanceRating:  module7.performanceRating,
      scoringMeta:        module7.scoringMeta,
    },
    module7_feedback: refreshedFeedback,
  }

  // ── 10. Persist atomically (score + feedback in one write) ─────────────────
  await pool.query(
    `UPDATE interviews
        SET score              = $1,
            performance_rating = $2,
            category_scores    = $3
      WHERE id = $4`,
    [
      module7.overallScore,
      module7.performanceRating,
      JSON.stringify(updatedCategoryScores),
      interviewId,
    ]
  )

  console.log(
    `[CV→M7] interview=${interviewId} rescored with CV data \u2014 ` +
    `comm=${module7.communication.score} conf=${module7.confidence.score} ` +
    `(cvWt=${module7.confidence.cvWeightPct}%) ` +
    `tech=${module7.technicalRelevance.score} prof=${module7.professionalism.score} ` +
    `overall=${module7.overallScore} rating=${module7.performanceRating}`
  )
}

/* ─── Internal: run analysis and persist result to DB ───────────────────── */
/**
 * Called fire-and-forget from both:
 *   - The manual trigger endpoint above
 *   - recordingController.js after a successful upload (auto-trigger)
 *
 * @param {number|string} interviewId
 * @param {number|string} recordingId
 * @param {string}        filePath     Absolute path to the WebM file
 */
async function _runAndPersist(interviewId, recordingId, filePath) {
  console.log(`[CV] Starting background analysis interview=${interviewId}`)
  const t0 = Date.now()

  // Mark as 'processing' so status polls show progress
  await pool.query(
    `INSERT INTO interview_cv_analysis
       (interview_id, recording_id, status)
     VALUES ($1, $2, 'processing')
     ON CONFLICT (interview_id)
     DO UPDATE SET status = 'processing', analyzed_at = NULL, error_message = NULL`,
    [interviewId, recordingId]
  ).catch(e => console.error('[CV] Failed to mark processing:', e.message))

  let result
  try {
    result = await cvService.triggerAnalysis(interviewId, filePath)
  } catch (err) {
    console.error(`[CV] Analysis failed interview=${interviewId}:`, err.message)
    await pool.query(
      `UPDATE interview_cv_analysis
          SET status = 'error', error_message = $1, analyzed_at = NOW()
        WHERE interview_id = $2`,
      [err.message.slice(0, 500), interviewId]
    ).catch(() => {})
    return
  }

  if (result.status !== 'ok') {
    await pool.query(
      `UPDATE interview_cv_analysis
          SET status = 'error', error_message = $1, analyzed_at = NOW()
        WHERE interview_id = $2`,
      [(result.error || 'Unknown error').slice(0, 500), interviewId]
    ).catch(() => {})
    return
  }

  const s = result.scores

  // Persist aggregated scores + raw frame data
  await pool.query(
    `UPDATE interview_cv_analysis
        SET status                 = 'completed',
            analyzed_at            = NOW(),
            error_message          = NULL,
            face_detection_rate    = $1,
            eye_contact_pct        = $2,
            facing_camera_rate     = $3,
            head_movement_deg      = $4,
            attention_score        = $5,
            engagement_estimate    = $6,
            confidence_indicator   = $7,
            disquietment_level     = $8,
            fear_level             = $9,
            doubt_confusion_level  = $10,
            disconnection_level    = $11,
            facial_activity        = $12,
            frames_total           = $13,
            frames_with_face       = $14,
            cnn_mean_probs         = $15,
            per_frame_raw          = $16
      WHERE interview_id = $17`,
    [
      s.face_detection_rate,
      s.eye_contact_pct,
      s.facing_camera_rate,
      s.head_movement_deg,
      s.attention_score,
      s.engagement_estimate,
      s.confidence_indicator,
      s.disquietment_level,
      s.fear_level,
      s.doubt_confusion_level,
      s.disconnection_level,
      s.facial_activity,
      s.frames_total,
      s.frames_with_face,
      JSON.stringify(s.cnn_mean_probs),
      JSON.stringify(result.per_frame_raw),
      interviewId,
    ]
  )

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(
    `[CV] Persisted interview=${interviewId} in ${elapsed}s — ` +
    `engagement=${s.engagement_estimate} eye_contact=${s.eye_contact_pct}%`
  )

  // ── Module 7: Post-CV scoring update ────────────────────────────────────
  // Now that real CV behavioural data is available, recompute the Module 7
  // scores using the existing scoring engine.
  // This is non-blocking and non-fatal — failure preserves the existing score.
  _recomputeModule7WithCv(interviewId, s).catch(err =>
    console.error(`[CV] Post-CV Module7 recompute failed interview=${interviewId}:`, err.message)
  )
  // ─────────────────────────────────────────────────────────────────────────
}

/* ─── POST /api/cv/frame (Live analysis for candidate interview) ───────── */
/**
 * Analyzes a single live webcam frame (base64 image) in real time.
 * Returns face detection, normalized bbox, CNN 6 emotions, confidence, and face visibility %.
 */
async function analyzeLiveFrame(req, res) {
  try {
    const { image } = req.body
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image base64 data is required' })
    }

    const analysis = await cvService.analyzeFrame(image)
    return res.status(200).json({ success: true, ...analysis })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

/* ─── POST /api/cv/:interviewId/live-summary ───────────────────────────── */
/**
 * Persists live compliance / telemetry data (e.g. warning count, warning events log, avg visibility).
 */
async function saveLiveSummary(req, res) {
  try {
    const { interviewId } = req.params
    const { warning_count, warning_events, avg_face_visibility } = req.body

    await pool.query(
      `INSERT INTO interview_cv_analysis
         (interview_id, warning_count, warning_events, avg_face_visibility)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (interview_id)
       DO UPDATE SET
         warning_count       = COALESCE(EXCLUDED.warning_count, interview_cv_analysis.warning_count),
         warning_events      = COALESCE(EXCLUDED.warning_events, interview_cv_analysis.warning_events),
         avg_face_visibility = COALESCE(EXCLUDED.avg_face_visibility, interview_cv_analysis.avg_face_visibility)`,
      [
        interviewId,
        warning_count != null ? parseInt(warning_count, 10) : 0,
        JSON.stringify(warning_events || []),
        avg_face_visibility != null ? parseFloat(avg_face_visibility) : null,
      ]
    )

    return res.status(200).json({ success: true, message: 'Live summary saved' })
  } catch (err) {
    console.error('[cvController.saveLiveSummary]', err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}

// Export all handlers
module.exports = {
  getResult,
  getStatus,
  trigger,
  analyzeLiveFrame,
  saveLiveSummary,
  _runAndPersist,
}
