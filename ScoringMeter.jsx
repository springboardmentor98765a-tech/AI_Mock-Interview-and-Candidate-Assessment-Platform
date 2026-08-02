import React from 'react';

export default function ScoringMeter({ communication, confidence, technical, professionalism }) {
  // Composite mathematical score allocation formula from Module 7 requirements
  const overallScore = Math.round((communication * 0.3) + (confidence * 0.25) + (technical * 0.3) + (professionalism * 0.15));
  
  let rubricLabel = 'Poor';
  let rubricColor = '#EF4444';
  if (overallScore >= 90) { rubricLabel = 'Excellent'; rubricColor = '#10B981'; }
  else if (overallScore >= 75) { rubricLabel = 'Good'; rubricColor = '#3B82F6'; }
  else if (overallScore >= 60) { rubricLabel = 'Average'; rubricColor = '#F59E0B'; }
  else if (overallScore >= 40) { rubricLabel = 'Needs Improvement'; rubricColor = '#F97316'; }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', marginTop: '20px' }}>
      
      {/* MODULE 7: DETAILED METRIC PARAMETER CARD GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
        
        {/* Parameter 1: Communication (30%) */}
        <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <small style={{ color: '#0284C7', fontWeight: '800', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Communication (30%)</small>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>{communication}/100</h3>
          <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            <div>• Speech Clarity: <strong>92%</strong></div>
            <div>• Grammar Quality: <strong>Passed</strong></div>
            <div>• Filler Frequency: <strong>Optimal (2)</strong></div>
            <div>• Speaking Pace: <strong>130 WPM</strong></div>
          </div>
        </div>

        {/* Parameter 2: Confidence (25%) */}
        <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <small style={{ color: '#10B981', fontWeight: '800', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Confidence (25%)</small>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>{confidence}/100</h3>
          <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            <div>• Eye-Contact Ratio: <strong>94%</strong></div>
            <div>• Facial Engagement: <strong>High</strong></div>
            <div>• Response Hesitation: <strong>Minimal</strong></div>
            <div>• Attention Level: <strong>96%</strong></div>
          </div>
        </div>

        {/* Parameter 3: Technical Relevance (30%) */}
        <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <small style={{ color: '#F59E0B', fontWeight: '800', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Technical Fit (30%)</small>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>{technical}/100</h3>
          <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            <div>• Technical Accuracy: <strong>88%</strong></div>
            <div>• Keyword Relevance: <strong>90%</strong></div>
            <div>• Problem-Solving: <strong>Strong</strong></div>
            <div>• Domain Knowledge: <strong>Verified</strong></div>
          </div>
        </div>

        {/* Parameter 4: Professionalism (15%) */}
        <div style={{ padding: '16px', background: '#FAFAFA', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <small style={{ color: '#8B5CF6', fontWeight: '800', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Professionalism (15%)</small>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>{professionalism}/100</h3>
          <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
            <div>• Time Management: <strong>Optimal</strong></div>
            <div>• Response Organization: <strong>Good</strong></div>
            <div>• Professional Comm: <strong>Passed</strong></div>
            <div>• Interview Etiquette: <strong>Exceptional</strong></div>
          </div>
        </div>

      </div>

      {/* OVERALL SCORE BANNER & AI FEEDBACK GENERATION */}
      <div style={{ background: '#FFFFFF', border: `1px solid #E2E8F0`, padding: '20px', borderRadius: '12px', borderLeft: `6px solid ${rubricColor}` }}>
        <h4 style={{ margin: '0 0 4px 0', color: '#0F172A' }}>Overall Score: <span style={{ color: rubricColor }}>{overallScore}%</span> | Rating Rubric: <code>{rubricLabel}</code></h4>
        <hr style={{ border: 0, borderTop: '1px solid #E2E8F0', margin: '12px 0' }} />
        
        <strong style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: '#334155' }}>🤖 AI Feedback Insights Matrix (Module 7):</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
          <div>
            <div><strong>• Core Strengths:</strong> Pronunciation evaluation, vocabulary density patterns, and explicit keyword relevance show outstanding parameters.</div>
            <div style={{ marginTop: '4px' }}><strong>• Identified Weaknesses:</strong> Minor rhythmic speech pace acceleration logged during dense algorithmic definitions.</div>
          </div>
          <div>
            <div><strong>• Improvement Suggestions:</strong> Organize structural solution paradigms using standard chronological code templates.</div>
            <div style={{ marginTop: '4px' }}><strong>• Learning Resources:</strong> Practice targeted interactive mock frameworks within the advanced portal pathways.</div>
          </div>
        </div>
      </div>

    </div>
  );
}
