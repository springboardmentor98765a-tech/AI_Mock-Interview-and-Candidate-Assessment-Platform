import React from 'react';

/**
 * The Module 5 + 6 report for one interview, in full.
 *
 * Shown at the end of a session and again from history, so a candidate sees
 * the same thing either way and there is one place to change it.
 *
 * The six spec features are labelled on screen rather than merged into a
 * general "feedback" blob: transcription, grammar, filler words, pace,
 * pronunciation and communication quality each get their own heading. That is
 * partly for the reader and partly so it is obvious which of them is missing
 * when a provider call fails — a section that could not be produced says why
 * instead of quietly rendering as clean.
 */

const SCORE_TONE = {
  Excellent: 'badge-ok',
  Good: 'badge-ok',
  Average: 'badge-warn',
  'Needs Improvement': 'badge-warn',
  Poor: 'badge-bad',
};

const fmt = (sec) =>
  sec === null || sec === undefined
    ? '—'
    : `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, '0')}s`;

function Tags({ counts, variant = 'badge-muted', empty = 'None.' }) {
  const entries = Object.entries(counts || {});
  if (entries.length === 0) return <p className="note">{empty}</p>;
  return (
    <div className="tags">
      {entries.map(([word, count]) => (
        <span className={`badge ${variant}`} key={word}>
          {word} × {count}
        </span>
      ))}
    </div>
  );
}

/** A section that could not be produced explains itself. */
function Unavailable({ reason, fallback }) {
  return <p className="note">{reason || fallback}</p>;
}

/**
 * The six Module 5 sections for one answer, without any card or heading of its
 * own — so it can be dropped into the end-of-interview report and into the
 * history review, which each frame a question differently.
 */
export function AnswerDetail({ analysis, transcript }) {
  const a = analysis || {};
  const { fillers, pace, communication, pronunciation, score } = a;
  const entry = { transcript };

  return (
    <>
      {a.available === false ? (
        <Unavailable reason={a.reason} fallback="This answer was not analysed." />
      ) : (
        <>
          {/* 1 — transcription */}
          <p className="label gap-top">1 · Speech-to-text transcript</p>
          {entry.transcript ? (
            <p className="note">“{entry.transcript}”</p>
          ) : (
            <p className="note">No speech was picked up in this recording.</p>
          )}

          {/* 3 — filler words (measured) */}
          <p className="label gap-top">
            3 · Filler words — measured
            {fillers ? ` · ${fillers.total} in ${fillers.word_count} words` : ''}
            {fillers?.per_100_words !== null && fillers?.per_100_words !== undefined
              ? ` · ${fillers.per_100_words} per 100`
              : ''}
          </p>
          <Tags counts={fillers?.by_word} variant="badge-warn" empty="No fillers detected." />

          {Object.keys(fillers?.discourse_markers || {}).length > 0 && (
            <>
              <small className="muted">
                Also heard, but not counted as fillers — each is an ordinary word too:
              </small>
              <Tags counts={fillers.discourse_markers} />
            </>
          )}

          {/* 4 — pace (measured) */}
          <p className="label gap-top">4 · Speaking pace — measured</p>
          {pace?.available ? (
            <div className="row">
              <div>
                <strong>{pace.words_per_minute} words per minute</strong>
                <small>
                  over {pace.duration_seconds}s of speech · comfortable is{' '}
                  {pace.comfortable_range?.[0]}–{pace.comfortable_range?.[1]} wpm
                </small>
              </div>
              <span
                className={`badge ${pace.verdict === 'comfortable' ? 'badge-ok' : 'badge-warn'}`}
              >
                {pace.verdict}
              </span>
            </div>
          ) : (
            <Unavailable reason={pace?.reason} fallback="Pace was not measured." />
          )}

          {/* 2 + 6 — grammar and communication quality (assessed) */}
          <p className="label gap-top">2 · Grammar — AI assessment</p>
          {communication?.available ? (
            communication.grammar_issues?.length ? (
              communication.grammar_issues.map((issue, i) => (
                <div className="row" key={`${issue.excerpt}-${i}`}>
                  <div>
                    <strong>“{issue.excerpt}”</strong>
                    <small>
                      {issue.issue} → {issue.suggestion}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="note">Nothing flagged in this answer.</p>
            )
          ) : (
            <Unavailable reason={communication?.reason} fallback="Grammar review unavailable." />
          )}

          <p className="label gap-top">6 · Communication quality — AI assessment</p>
          {communication?.available ? (
            <>
              {/* A smaller local model sometimes returns these as empty
                  strings. Rendering the heading anyway leaves three bare
                  labels that read as a broken page, so an empty one is
                  reported as not returned rather than shown blank. */}
              {[
                ['Clarity', communication.clarity],
                ['Structure', communication.structure],
                ['Conciseness', communication.conciseness],
              ].every(([, value]) => !(value || '').trim()) ? (
                <p className="note">
                  The model returned no clarity, structure or conciseness notes for this answer.
                </p>
              ) : (
                [
                  ['Clarity', communication.clarity],
                  ['Structure', communication.structure],
                  ['Conciseness', communication.conciseness],
                ]
                  .filter(([, value]) => (value || '').trim())
                  .map(([label, value]) => (
                    <div className="row" key={label}>
                      <div>
                        <strong>{label}</strong>
                        <small>{value}</small>
                      </div>
                    </div>
                  ))
              )}
              {communication.improvements?.length > 0 && (
                <>
                  <small className="muted">To work on next time:</small>
                  {communication.improvements.map((item) => (
                    <div className="row" key={item}>
                      <div>
                        <small>{item}</small>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <Unavailable
              reason={communication?.reason}
              fallback="Communication assessment unavailable."
            />
          )}

          {/* 5 — pronunciation (assessed, qualitative) */}
          <p className="label gap-top">5 · Pronunciation — listening notes</p>
          {pronunciation?.available ? (
            <>
              <div className="row">
                <div>
                  <strong>{pronunciation.intelligibility}</strong>
                  <small>{pronunciation.notes}</small>
                </div>
              </div>
              {pronunciation.unclear_words?.length > 0 && (
                <>
                  <small className="muted">Hard to make out:</small>
                  <div className="tags">
                    {pronunciation.unclear_words.map((w) => (
                      <span className="badge badge-warn" key={w}>
                        {w}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <small className="muted">
                Notes only — there is no pronunciation score. Scoring speech properly needs
                phoneme-level analysis this platform does not do.
              </small>
            </>
          ) : (
            <Unavailable
              reason={pronunciation?.reason}
              fallback="Pronunciation was not assessed."
            />
          )}

          {/* Module 6 */}
          {score?.available && (
            <>
              <p className="label gap-top">Score for this answer</p>
              <div className="row">
                <div>
                  <small>{score.rationale}</small>
                </div>
                <span className={`badge ${SCORE_TONE[score.rating] ?? 'badge-muted'}`}>
                  {score.overall} · {score.rating}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function QuestionBlock({ entry }) {
  return (
    <div className="card gap-top">
      <h3>
        Question {entry.sequence_no}
        {entry.category ? ` · ${entry.category}` : ''}
      </h3>
      <p className="quote">{entry.question_text}</p>
      <AnswerDetail analysis={entry.analysis} transcript={entry.transcript} />
    </div>
  );
}

export default function AnalysisReport({ report }) {
  if (!report) return null;

  const summary = report.summary || {};
  const questions = report.questions || [];

  return (
    <>
      <section className="card">
        <h2>Communication analysis</h2>

        {summary.available === false ? (
          <Unavailable
            reason={summary.reason}
            fallback="No answer in this interview has been analysed."
          />
        ) : (
          <>
            <div className="row">
              <div>
                <strong>Overall score</strong>
                <small>
                  {summary.score?.available
                    ? `Averaged over ${summary.score.graded_answers} scored answer(s)`
                    : 'Not scored'}
                </small>
              </div>
              {summary.score?.available ? (
                <span className={`badge ${SCORE_TONE[summary.score.rating] ?? 'badge-muted'}`}>
                  {summary.score.overall} · {summary.score.rating}
                </span>
              ) : (
                <span className="badge badge-muted">not scored</span>
              )}
            </div>

            <div className="row">
              <div>
                <strong>Filler words</strong>
                <small>
                  {summary.filler_total} across {summary.total_words} words
                  {summary.filler_per_100_words !== null &&
                  summary.filler_per_100_words !== undefined
                    ? ` · ${summary.filler_per_100_words} per 100`
                    : ''}
                </small>
              </div>
            </div>
            <Tags counts={summary.filler_by_word} variant="badge-warn" empty="None detected." />

            <div className="row gap-top">
              <div>
                <strong>Average speaking pace</strong>
                <small>
                  {summary.pace?.available
                    ? `${summary.pace.average_words_per_minute} wpm over ${summary.pace.measured_over_answers} answer(s) · comfortable is ${summary.pace.comfortable_range?.[0]}–${summary.pace.comfortable_range?.[1]}`
                    : 'Not measured — no answer had a usable recording length.'}
                </small>
              </div>
            </div>

            <div className="row">
              <div>
                <strong>Grammar issues</strong>
                <small>
                  {summary.grammar_issue_total} across {summary.grammar_reviewed_answers} reviewed
                  answer(s)
                </small>
              </div>
            </div>

            <div className="row">
              <div>
                <strong>Answers analysed</strong>
                <small>
                  {summary.analysed_answers} of {questions.length}
                </small>
              </div>
            </div>

            {summary.note && <small className="muted">{summary.note}</small>}
          </>
        )}
      </section>

      {questions.map((entry) => (
        <QuestionBlock entry={entry} key={entry.sequence_no} />
      ))}
    </>
  );
}
