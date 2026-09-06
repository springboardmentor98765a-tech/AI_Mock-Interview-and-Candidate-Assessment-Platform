import React from 'react';
import { RATING_TONE } from '../lib/scoring';

/**
 * Module 7 — the interview's rubric score and the evidence behind it.
 *
 * Two layers, deliberately: the four weighted axes at the top are the score,
 * and the sub-metrics below are the measurements that informed it. The second
 * layer exists so a candidate can see *why* an axis came out where it did
 * rather than being handed a number with no account of it.
 *
 * Sub-metrics are only rendered when the underlying figure was actually
 * measured. An axis with nothing measurable behind it says so instead of
 * padding the grid with zeros, which would read as "you scored 0" rather than
 * "this was not measured".
 */

const AXES = [
  {
    key: 'communication',
    label: 'Communication',
    weight: 30,
    color: 'var(--green)',
    blurb: 'Clarity, structure, conciseness',
  },
  {
    key: 'confidence',
    label: 'Confidence',
    weight: 25,
    color: 'var(--blue)',
    blurb: 'Hedging, hesitation, assertion',
  },
  {
    key: 'technical_relevance',
    label: 'Technical',
    weight: 30,
    color: 'var(--yellow)',
    blurb: 'Domain knowledge, accuracy',
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    weight: 15,
    color: 'var(--red)',
    blurb: 'Time management, tone',
  },
];

/** The measured figures behind each axis, or [] when nothing was measured. */
function subMetrics(axisKey, summary, behavior) {
  const pace = summary.pace || {};
  const rows = [];

  if (axisKey === 'communication') {
    if (pace.available) {
      rows.push(['Speaking pace', `${pace.average_words_per_minute} wpm`]);
    }
    rows.push(['Filler words', `${summary.filler_total} in ${summary.total_words} words`]);
    if (summary.filler_per_100_words !== null && summary.filler_per_100_words !== undefined) {
      rows.push(['Fillers per 100 words', summary.filler_per_100_words]);
    }
    if (summary.grammar_reviewed_answers > 0) {
      rows.push([
        'Grammar issues',
        `${summary.grammar_issue_total} across ${summary.grammar_reviewed_answers}`,
      ]);
    }
  }

  if (axisKey === 'confidence' && behavior?.available) {
    if (behavior.eye_contact_percent !== null && behavior.eye_contact_percent !== undefined) {
      rows.push(['Camera eye contact', `${Math.round(behavior.eye_contact_percent)}%`]);
    }
    if (behavior.engagement) rows.push(['Engagement', behavior.engagement]);
    if (behavior.tracked_seconds) {
      rows.push(['Tracked', `${Math.round(behavior.tracked_seconds)}s`]);
    }
  }

  if (axisKey === 'technical_relevance' || axisKey === 'professionalism') {
    rows.push(['Answers graded', summary.score?.graded_answers ?? 0]);
  }

  return rows;
}

/**
 * Why there is no score, in the candidate's terms.
 *
 * An unscored interview used to render nothing at all here, next to a bare
 * "not scored" badge — leaving the candidate to guess whether they had done
 * something wrong, the interview had not finished, or the app was broken. The
 * backend already says which of those it is; this stops throwing that away.
 */
function NotScored({ reason }) {
  return (
    <section className="card gap-top" style={{ background: 'var(--panel)' }}>
      <h2>Module 7 &middot; AI scoring &amp; feedback</h2>
      <p className="note gap-top">
        {reason || 'No answer in this interview has been scored yet.'}
      </p>
      <small className="muted">
        Your recordings are saved either way — scoring can be run again later
        without you having to retake the interview.
      </small>
    </section>
  );
}

export default function Module7Report({ summary, behavior }) {
  // Still loading, or an interview from before analysis existed. Nothing to
  // say yet, and a "not scored" panel would be wrong rather than merely empty.
  if (!summary) return null;

  if (!summary.available) return <NotScored reason={summary.reason} />;

  const score = summary.score;
  const feedback = summary.feedback;
  const averages = feedback?.axis_averages;

  if (!score?.available || !averages) {
    return <NotScored reason={score?.reason} />;
  }

  const present = AXES.filter((axis) => averages[axis.key] !== undefined);

  return (
    <section className="card gap-top" style={{ background: 'var(--panel)' }}>
      <h2>Module 7 &middot; AI scoring &amp; feedback</h2>

      {/* The score itself: overall, then the four weighted axes. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginTop: 16,
        }}
      >
        <div
          className="card"
          style={{ background: 'var(--card)', borderLeft: '3px solid var(--blue)', textAlign: 'center' }}
        >
          <span className="label">Overall score</span>
          <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--blue)', lineHeight: 1.2 }}>
            {score.overall.toFixed(1)}
          </div>
          <span className={`badge ${RATING_TONE[score.rating] ?? 'badge-muted'}`}>{score.rating}</span>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            weighted composite &middot; {score.graded_answers} answer
            {score.graded_answers === 1 ? '' : 's'} scored
          </p>
        </div>

        {present.map((axis) => (
          <div
            key={axis.key}
            className="card"
            style={{ background: 'var(--card)', borderLeft: `3px solid ${axis.color}`, textAlign: 'center' }}
          >
            <span className="label">
              {axis.label} ({axis.weight}%)
            </span>
            <div style={{ fontSize: 34, fontWeight: 700, color: axis.color, lineHeight: 1.3 }}>
              {averages[axis.key]}
            </div>
            <p className="muted" style={{ fontSize: 11 }}>{axis.blurb}</p>
          </div>
        ))}
      </div>

      {/* The evidence: what was actually measured, per axis. */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <span className="label">Evidence behind the scores</span>
        <p className="muted" style={{ fontSize: 12, marginBottom: 14 }}>
          Measured directly from your recorded speech
          {behavior?.available ? ' and camera' : ''} — these inform the axes above, they are not
          themselves scores.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          {present.map((axis) => {
            const rows = subMetrics(axis.key, summary, behavior);
            return (
              <div
                key={axis.key}
                style={{ background: 'var(--card)', borderRadius: 'var(--radius)', padding: 12 }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: axis.color,
                    paddingBottom: 8,
                    marginBottom: 8,
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {axis.label}
                </div>
                {rows.length === 0 ? (
                  <p className="muted" style={{ fontSize: 12 }}>Nothing measurable was captured.</p>
                ) : (
                  rows.map(([name, value]) => (
                    <div
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 12,
                        padding: '4px 0',
                      }}
                    >
                      <span className="muted" style={{ fontSize: 12 }}>{name}</span>
                      <strong style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{value}</strong>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* What to do about it. */}
      {feedback?.available && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <span className="label">Recommended practice</span>
          {feedback.weakest_axis && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
              Weakest axis:{' '}
              <strong style={{ color: 'var(--tx)' }}>
                {AXES.find((a) => a.key === feedback.weakest_axis)?.label ?? feedback.weakest_axis}
              </strong>{' '}
              &mdash; worth an hour of your week before the next one.
            </p>
          )}

          {feedback.practice_recommendations?.map((item) => (
            <p className="note" key={item}>{item}</p>
          ))}

          {feedback.learning_resources?.length > 0 && (
            <>
              <small className="muted gap-top">Where to practise:</small>
              <div className="tags">
                {feedback.learning_resources.map((item) => (
                  <span className="badge badge-muted" key={item}>{item}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
