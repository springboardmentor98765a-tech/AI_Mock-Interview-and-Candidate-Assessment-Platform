import React from 'react';
import { GrammarAnalysis as GrammarType } from '../../types/speech';

interface GrammarAnalysisProps {
  grammar: GrammarType;
}

export const GrammarAnalysis: React.FC<GrammarAnalysisProps> = ({ grammar }) => {
  return (
    <div className="grammar-card glass-card">
      <div className="card-header-flex">
        <h4>✍️ Grammar & Language Analysis</h4>
        <span className={`score-badge ${grammar.score >= 85 ? 'good' : 'warning'}`}>
          Score: {grammar.score}/100
        </span>
      </div>

      <div className="mini-metrics-row">
        <div><strong>Total Sentences:</strong> {grammar.total_sentences_count || (grammar.sentences_analysis ? grammar.sentences_analysis.length : 1)}</div>
        <div><strong>Correct Sentences:</strong> {grammar.passed_sentences_count !== undefined ? grammar.passed_sentences_count : (grammar.sentences_analysis ? grammar.sentences_analysis.filter(s => s.is_valid).length : 0)}</div>
        <div><strong>Mistakes:</strong> {grammar.mistakes_count}</div>
      </div>

      {grammar.sentences_analysis && grammar.sentences_analysis.length > 0 ? (
        <div className="sentence-breakdown-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {grammar.sentences_analysis.map((sent) => (
            <div key={sent.sentence_index} className={`sentence-card ${sent.is_valid ? 'valid' : 'invalid'}`} style={{ padding: '0.85rem', borderRadius: '8px', background: sent.is_valid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderLeft: sent.is_valid ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sentence #{sent.sentence_index}</span>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: sent.is_valid ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: sent.is_valid ? '#34d399' : '#fca5a5' }}>
                  {sent.is_valid ? '✅ Correct' : `⚠️ ${sent.mistakes_count} Mistake(s)`}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}><strong>Spoken:</strong> "{sent.original_sentence}"</div>
              {!sent.is_valid && (
                <div style={{ fontSize: '0.9rem', color: '#34d399', marginBottom: '0.4rem' }}><strong>Suggested:</strong> "{sent.corrected_sentence}"</div>
              )}
              {sent.mistakes.map((m, mIdx) => (
                <div key={mIdx} style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  ❌ <em>{m.incorrect_portion}</em> ➔ ✅ <em>{m.suggested_correction}</em> ({m.explanation})
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : grammar.mistakes.length === 0 ? (
        <p className="success-notice">✅ No grammatical errors detected! Great articulation.</p>
      ) : (
        <div className="mistakes-list">
          {grammar.mistakes.map((m, idx) => (
            <div key={idx} className="mistake-item">
              <div className="severity-tag">{m.severity} Severity</div>
              <div className="orig-sentence">"{m.original_sentence}"</div>
              <div className="correction-row">
                <span className="inc">❌ {m.incorrect_portion}</span> ➔ <span className="sug">✅ {m.suggested_correction}</span>
              </div>
              <div className="explanation-text">{m.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {grammar.improvement_suggestions.length > 0 && (
        <div className="suggestions-box">
          <strong>Improvement Suggestions:</strong>
          <ul>
            {grammar.improvement_suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
