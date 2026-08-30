import React from 'react';

const CONFIDENCE_TONE = { Confident: 'badge-ok', Neutral: 'badge-muted', Nervous: 'badge-warn' };
const ENGAGEMENT_TONE = { High: 'badge-ok', Medium: 'badge-warn', Low: 'badge-bad' };

// How each expression reads. `fear` is warn rather than bad because the model
// only catches about a third of genuine fear — a strong colour would overstate
// a signal that is mostly silent.
const EXPRESSION_TONE = {
  confident: 'badge-ok',
  nervous: 'badge-warn',
  fear: 'badge-warn',
  surprise: 'badge-muted',
  neutral: 'badge-muted',
};

function EmotionTags({ emotions }) {
  const entries = Object.entries(emotions || {}).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="note">No expression reading — the model did not run this session.</p>;
  }
  return (
    <div className="tags">
      {entries.map(([label, pct]) => (
        <span className={`badge ${EXPRESSION_TONE[label] ?? 'badge-muted'}`} key={label}>
          {label} &middot; {pct}%
        </span>
      ))}
    </div>
  );
}

/**
 * Module 6: behavior & engagement, read from the camera recording.
 *
 * A separate signal from Module 5's transcript-based Confidence score —
 * deliberately never merged with it, see docs/plans/module-6-emotion-eye-tracking.
 * `behavior` is undefined/null (not yet produced), {available: false, reason}
 * (could not be produced), or the full report.
 */
export default function BehaviorReport({ behavior }) {
  return (
    <>
      <p className="label gap-top">Behavior &amp; engagement</p>

      {!behavior && (
        <p className="note">
          Not available yet — this is produced shortly after the interview ends. Check
          back in a minute.
        </p>
      )}

      {behavior?.available === false && (
        <p className="note">{behavior.reason || 'This interview could not be analysed.'}</p>
      )}

      {behavior?.available && (
        <>
          <p className="muted">
            Measured live from your camera while you answered — a separate signal from the
            Module 5 Confidence score above, which is judged from what you said.
          </p>

          <div className="row gap-top">
            <div>
              <strong>Behavioural confidence</strong>
              <small>Eye contact (measured) combined with expression (read by a model)</small>
            </div>
            <span className={`badge ${CONFIDENCE_TONE[behavior.confidence] ?? 'badge-muted'}`}>
              {behavior.confidence}
            </span>
          </div>

          {/* The confidence percentage. Rendered only when the model actually
              read some frames — null means not measured, and 0% would be a
              very different and much crueller claim. */}
          {behavior.confidence_percent !== null &&
            behavior.confidence_percent !== undefined && (
              <div className="row">
                <div>
                  <strong>Confidence</strong>
                  <small>
                    How much of the session your expression read as composed. This is your
                    face, not your feelings — a calm expression scores high whether or not
                    you were nervous behind it.
                  </small>
                </div>
                <div style={{ minWidth: 160 }}>
                  <strong>{behavior.confidence_percent}%</strong>
                  <div className="meter">
                    <i style={{ width: `${behavior.confidence_percent}%` }} />
                  </div>
                </div>
              </div>
            )}

          <div className="row">
            <div>
              <strong>Expression</strong>
              {/* "Expression", not "emotion": what is measured is facial
                  movement. People concentrate with the same face they worry
                  with, and the label must not claim to know which it was. */}
              <small>
                Read by a model trained on facial expressions. Reliable for composed vs
                uncomfortable; &ldquo;fear&rdquo; is the least reliable and is missed more
                often than it is caught, so its absence means little.
              </small>
            </div>
          </div>
          <EmotionTags emotions={behavior.emotions} />

          <div className="row gap-top">
            <div>
              <strong>Eye contact</strong>
              <small>Estimated time looking toward the camera</small>
            </div>
            <div style={{ minWidth: 160 }}>
              <strong>{behavior.eye_contact_percent}%</strong>
              <div className="meter">
                <i style={{ width: `${behavior.eye_contact_percent}%` }} />
              </div>
            </div>
          </div>

          {behavior.gaze_breakdown && (
            <>
              <div className="row">
                <div>
                  <strong>Where you were looking</strong>
                  <small>Share of the tracked session in each direction</small>
                </div>
              </div>
              <div className="tags">
                {[
                  ['camera', 'at the camera', 'badge-ok'],
                  ['down', 'down', 'badge-warn'],
                  ['side', 'to the side', 'badge-warn'],
                  ['away', 'out of frame', 'badge-muted'],
                ]
                  .filter(([key]) => behavior.gaze_breakdown[key])
                  .map(([key, label, tone]) => (
                    <span className={`badge ${tone}`} key={key}>
                      {label} &middot; {behavior.gaze_breakdown[key]}%
                    </span>
                  ))}
              </div>
            </>
          )}

          <div className="row gap-top">
            <div>
              <strong>Attention</strong>
              <small>Times the candidate looked away for a sustained period</small>
            </div>
            <span className={`badge ${behavior.look_aways > 2 ? 'badge-warn' : 'badge-ok'}`}>
              {behavior.look_aways} look-away{behavior.look_aways === 1 ? '' : 's'}
            </span>
          </div>

          <div className="row">
            <div>
              <strong>Engagement</strong>
              <small>Overall energy and responsiveness on camera</small>
            </div>
            <span className={`badge ${ENGAGEMENT_TONE[behavior.engagement] ?? 'badge-muted'}`}>
              {behavior.engagement}
            </span>
          </div>

          <p className="label gap-top">Interview behaviour analysis</p>
          <p className="note">{behavior.summary}</p>

          {/* Provenance. A report drawn from 45 samples over 12 seconds is a
              much weaker claim than one from 1200 over 5 minutes, and the
              percentages above look identically confident either way. */}
          {behavior.samples ? (
            <p className="muted mono gap-top" style={{ fontSize: 11 }}>
              {behavior.samples} samples over {Math.round(behavior.tracked_seconds ?? 0)}s
              {behavior.face_present_percent !== undefined
                ? ` · face in frame ${behavior.face_present_percent}%`
                : ''}
              {behavior.alerts_shown ? ` · ${behavior.alerts_shown} live nudge(s)` : ''}
            </p>
          ) : null}

          <p className="muted gap-top" style={{ fontSize: 11 }}>
            {behavior.method_note ||
              'A best-effort read of your camera, not a certified behavioural assessment.'}
          </p>
        </>
      )}
    </>
  );
}
