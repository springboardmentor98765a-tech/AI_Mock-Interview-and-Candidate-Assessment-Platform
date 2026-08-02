import React, { useState, useEffect } from 'react';
import ScoringMeter from '../components/ScoringMeter';

export default function CandidatePortal() {
  const [resState, setResState] = useState('idle'); 
  const [active, setActive] = useState(false);
  const [time, setTime] = useState(180); 
  const [done, setDone] = useState(false);
  const [track, setTrack] = useState('Technical');
  const [ans, setAns] = useState('');

  useEffect(() => {
    let timer = null;
    if (active && time > 0) {
      timer = setInterval(() => setTime(t => t - 1), 1000);
    } else if (time === 0) {
      setActive(false);
      setDone(true);
    }
    return () => clearInterval(timer);
  }, [active, time]);

  const prompts = {
    Technical: "Explain convolutional networks vs dense layer trade-offs.",
    HR: "Why do your engineering skills align with our workspace values?",
    Behavioral: "Describe a scenario where you resolved friction inside a sprint.",
    Aptitude: "Map an optimization path for an inference pipeline with decaying capacity."
  };

  return (
    <div style={{ color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '25px' }}>
        <h2>👤 Candidate Workspace Dashboard</h2>
        <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>All features consolidated onto a single page viewport node.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '25px' }}>
        <div style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          <strong>📊 Track Improvement Progress & Analytics History</strong>
          <div style={{ display: 'flex', gap: '12px', height: '80px', alignItems: 'flex-end', background: '#F8FAFC', padding: '10px 20px', borderRadius: '10px', marginTop: '10px', border: '1px solid #E2E8F0' }}>
            <div style={{ flex: 1, background: '#94A3B8', height: '45%', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }}>62%</div>
            <div style={{ flex: 1, background: '#60A5FA', height: '70%', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }}>74%</div>
            <div style={{ flex: 1, background: '#0284C7', height: '85%', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }}>85%</div>
          </div>
          <small style={{ color: '#0284C7', display: 'block', marginTop: '8px', fontWeight: '600' }}>Weak Area Prediction Vector: Optimize structural answer context configurations.</small>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #0284C7 100%)', color: 'white', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <small style={{ fontWeight: '700', fontSize: '11px' }}>COMPOSITE GRADE INDEX</small>
          <h1 style={{ margin: '4px 0', fontSize: '38px', fontWeight: '900' }}>85.0%</h1>
          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '20px', margin: '0 auto' }}>Good Rubric ✅</span>
        </div>
      </div>

      <div style={{ marginBottom: '25px', padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <strong>📄 Resume Upload & Automated Skill Extraction Matrix</strong>
        <div style={{ display: 'grid', gridTemplateColumns: resState === 'completed' ? '1fr 1.5fr' : '1fr', gap: '20px', marginTop: '10px' }}>
          <div style={{ border: '2px dashed #CBD5E1', padding: '25px', borderRadius: '12px', background: '#F8FAFC', textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>Select Professional Engineering CV PDF Artifact</p>
            <button type="button" onClick={() => { setResState('parsing'); setTimeout(() => setResState('completed'), 1000); }} className="btn-gradient" style={{ width: 'auto', padding: '8px 20px', fontSize: '13px' }}>
              {resState === 'parsing' ? 'Extracting Stack Metrics...' : 'Upload Resume PDF'}
            </button>
          </div>
          {resState === 'completed' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '12px' }}>
              <div style={{ padding: '12px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #93C5FD' }}>
                <strong style={{ color: '#1E40AF' }}>✓ Tech Detection & Education</strong>
                <p style={{ margin: '4px 0 0 0' }}>Python, PyTorch, React, SQL. 3rd Year B.Tech AI Student Profile.</p>
              </div>
              <div style={{ padding: '12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <strong style={{ color: '#16A34A' }}>✓ Resume Summary Generation</strong>
                <p style={{ margin: '4px 0 0 0', color: '#14532D' }}>Candidate maps solid competence parameters matching core deployment pipelines.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '25px', padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <strong>🎥 Attend Mock Interviews Simulator Studio</strong>
        {!active && !done ? (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '12px', maxWidth: '600px' }}>
            <div style={{ flex: 1 }}>
              <select value={track} onChange={e => setTrack(e.target.value)} className="input-field" style={{ background: 'white', padding: '9px' }}>
                <option value="Technical">Technical Interview Generation</option>
                <option value="HR">HR Interview Generation</option>
                <option value="Behavioral">Behavioral Interview Generation</option>
                <option value="Aptitude">Aptitude Interview Generation</option>
              </select>
            </div>
            <button type="button" onClick={() => setActive(true)} className="btn-gradient" style={{ width: 'auto', height: '40px', padding: '0 20px', fontSize: '13px' }}>Initialize Studio</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginTop: '12px' }}>
            <div>
              <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: '8px', color: '#991B1B', fontWeight: '700', fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span>⏱ Timer Workflow Active</span>
                <span>Time Remaining: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</span>
              </div>
              <div style={{ background: '#EFF6FF', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0284C7', marginBottom: '12px', fontSize: '13px' }}>
                <strong>🤖 Custom Prompt:</strong> {prompts[track]}
              </div>
              <textarea rows="3" className="input-field" placeholder="Dictate technical script answer content..." value={ans} onChange={e => setAns(e.target.value)}></textarea>
              <button type="button" onClick={() => { setActive(false); setDone(true); }} className="btn-gradient" style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '10px' }}>Commit Telemetry Frames</button>
            </div>
            <div style={{ background: '#000000', borderRadius: '12px', minHeight: '180px', color: '#00FF00', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontSize: '11px', padding: '15px' }}>
              <div style={{ color: '#EF4444', fontWeight: '800', marginBottom: '5px' }}>● HW CAPTURE STREAM ACTIVE</div>
              <div style={{ textAlign: 'left', width: '100%' }}>
                <div>• [ASR Transcription]: Whisper Logging Active</div>
                <div>• [Gaze Focus]: MediaPipe Tracking 94%</div>
                <div>• [Emotion Recognition]: DeepFace Matrix Active</div>
              </div>
            </div>
          </div>
        )}
        {done && <ScoringMeter communication={88} confidence={91} technical={84} professionalism={92} />}
      </div>

      <div style={{ padding: '20px', background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
        <strong>📋 Download Reports & Session Alerts</strong>
        <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <div>
            <strong>Interview_Evaluation_Summary_Report_401.pdf</strong>
            <small style={{ display: 'block', color: '#64748B' }}>Dispatched and synced with verified server logs.</small>
          </div>
          <button type="button" onClick={() => alert('Downloading performance summaries...')} className="btn-gradient" style={{ width: 'auto', padding: '6px 14px', fontSize: '12px', boxShadow: 'none' }}>Download Report</button>
        </div>
      </div>
    </div>
  );
}
