import React, { useState } from 'react';

export default function RecruiterPortal() {
  const [templateDeployed, setTemplateDeployed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const candidatePool = [
    { id: "SH-901", name: "Rahul Sharma", track: "Technical Track", score: 91, label: "Excellent 🌟", comm: 88, conf: 92, tech: 90, prof: 95 },
    { id: "SH-902", name: "Priya Anand", track: "Technical Track", score: 79, label: "Good ✅", comm: 78, conf: 80, tech: 78, prof: 82 }
  ];

  return (
    <div style={{ color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2>💼 Recruiter Command Deck</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>Review candidate metrics and deploy blueprint templates.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '25px' }}>
        <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h4>👥 Candidate Analytics Matrix</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', marginTop: '10px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '12px 8px' }}>Candidate Name</th>
                <th style={{ padding: '12px 8px' }}>Composite Score</th>
                <th style={{ padding: '12px 8px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidatePool.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '700' }}>{c.name}</td>
                  <td style={{ padding: '12px 8px', color: '#0284C7', fontWeight: '800' }}>{c.score}%</td>
                  <td style={{ padding: '12px 8px' }}>
                    <button type="button" onClick={() => setSelectedCandidate(c)} className="btn-gradient" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px' }}>Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <h4>⚙️ Create Assessment Template</h4>
          <button type="button" onClick={() => setTemplateDeployed(true)} className="btn-gradient" style={{ marginTop: '15px' }}>Deploy Blueprint Template Live</button>
          {templateDeployed && <p style={{ color: '#10B981', fontSize: '13px', marginTop: '10px' }}>✓ Template synchronized successfully.</p>}
        </div>
      </div>

      {selectedCandidate && (
        <div style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', borderLeft: '6px solid #0284C7' }}>
          <h4>📋 Report Summary for: {selectedCandidate.name}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>COMMUNICATION: <strong>{selectedCandidate.comm}/100</strong></div>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>CONFIDENCE: <strong>{selectedCandidate.conf}/100</strong></div>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>TECHNICAL FIT: <strong>{selectedCandidate.tech}/100</strong></div>
            <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>PROFESSIONALISM: <strong>{selectedCandidate.prof}/100</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
