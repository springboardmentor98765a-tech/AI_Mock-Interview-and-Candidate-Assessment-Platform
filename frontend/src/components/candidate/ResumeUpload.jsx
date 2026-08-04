import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, Sparkles, X, RefreshCw } from 'lucide-react';
import { extractedSkills } from '../../data/mockData';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const radarData = extractedSkills.map(s => ({ subject: s.name, A: s.score, fullMark: 100 }));

const steps = ['uploading', 'parsing', 'extracting', 'complete'];
const stepLabels = ['Uploading file...', 'Parsing resume content...', 'Extracting skills & scoring...', 'Analysis complete!'];

export default function ResumeUpload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(-1); // -1 = idle

  const simulateParsing = (f) => {
    setFile(f);
    setStep(0);
    let s = 0;
    const tick = () => {
      s++;
      if (s < steps.length) {
        setTimeout(() => { setStep(s); tick(); }, 900 + Math.random() * 400);
      }
    };
    tick();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) simulateParsing(f);
  }, []);

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) simulateParsing(f);
  };

  const reset = () => { setFile(null); setStep(-1); };
  const isDone = step === steps.length - 1;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Resume Upload</h1>
        <p>Upload your resume to get AI-powered skill extraction, gap analysis, and ATS scoring</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Upload Zone */}
        <div>
          {step === -1 ? (
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-file-input').click()}
              id="resume-drop-zone"
            >
              <input
                type="file"
                id="resume-file-input"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              <div className="drop-zone-icon">📄</div>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Drop your resume here</h3>
              <p className="text-sm" style={{ marginBottom: 'var(--space-6)' }}>
                Supports PDF, DOC, DOCX · Max 10MB
              </p>
              <button className="btn btn-primary" style={{ pointerEvents: 'none' }}>
                <Upload size={16} />
                Choose File
              </button>
            </div>
          ) : (
            <div className="card">
              {/* File Info */}
              <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{
                  width: 48, height: 48, background: 'hsla(252,100%,68%,0.1)',
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <FileText size={24} color="var(--accent-primary)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    {file?.name || 'resume.pdf'}
                  </p>
                  <p className="text-xs text-muted">
                    {file?.size ? (file.size / 1024).toFixed(1) + ' KB' : '248 KB'} · PDF Document
                  </p>
                </div>
                {!isDone && (
                  <div style={{ width: 20, height: 20, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                )}
                {isDone && <CheckCircle size={20} color="var(--accent-green)" />}
              </div>

              {/* Progress Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-3" style={{
                    opacity: i > step ? 0.3 : 1,
                    transition: 'opacity 0.4s ease'
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: i < step ? 'var(--accent-green)' : i === step ? 'var(--accent-primary)' : 'var(--border-medium)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'white',
                      transition: 'background 0.4s ease'
                    }}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {stepLabels[i]}
                    </span>
                    {i === step && i < steps.length - 1 && (
                      <div style={{ marginLeft: 'auto', width: 14, height: 14, border: '2px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    )}
                  </div>
                ))}
              </div>

              {isDone && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-6)', color: 'var(--text-muted)' }} onClick={reset}>
                  <RefreshCw size={14} />
                  Upload different file
                </button>
              )}
            </div>
          )}

          {/* Resume Score Card */}
          {isDone && (
            <div className="card mt-6 animate-fade-in" style={{ background: 'linear-gradient(135deg, hsla(252,100%,68%,0.06), hsla(280,90%,65%,0.06))', border: '1px solid var(--border-accent)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2">
                  <Sparkles size={18} color="var(--accent-primary)" />
                  ATS Resume Score
                </h3>
                <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  84<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                </div>
              </div>
              <div className="progress-bar" style={{ height: 8, marginBottom: 'var(--space-4)' }}>
                <div className="progress-fill" style={{ width: '84%' }} />
              </div>
              <div className="grid-3" style={{ gap: 'var(--space-3)' }}>
                {[
                  { label: 'Format', score: 92, color: 'green' },
                  { label: 'Keywords', score: 78, color: '' },
                  { label: 'Experience', score: 88, color: 'teal' },
                ].map(m => (
                  <div key={m.label} className="flex flex-col gap-2">
                    <div className="flex justify-between" style={{ fontSize: '0.75rem' }}>
                      <span className="text-muted">{m.label}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${m.color}`} style={{ width: `${m.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Skills Panel */}
        <div>
          {/* Extracted Skills */}
          <div className="card mb-6">
            <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
              <Sparkles size={16} color="var(--accent-primary)" />
              Extracted Skills
              {isDone && <span className="badge badge-success" style={{ marginLeft: 'auto' }}>AI Analyzed</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', minHeight: 60 }}>
              {isDone ? (
                extractedSkills.map((skill, i) => (
                  <div key={skill.name} className="skill-tag animate-fade-in" style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}>
                    {skill.name}
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{skill.score}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted" style={{ fontStyle: 'italic' }}>Upload a resume to extract skills...</p>
              )}
            </div>
          </div>

          {/* Skill Radar Chart */}
          {isDone && (
            <div className="card animate-fade-in">
              <h4 className="section-title">
                <BarIcon /> Skill Competency Radar
              </h4>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-subtle)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Radar name="Skills" dataKey="A" stroke="hsl(252,100%,68%)" fill="hsl(252,100%,68%)" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Skill breakdown */}
          {isDone && (
            <div className="card mt-6 animate-fade-in">
              <h4 className="section-title">Skill Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {extractedSkills.map((skill, i) => (
                  <div key={skill.name} className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>{skill.name}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: skill.score >= 80 ? 'var(--accent-green)' : 'var(--accent-primary)' }}>{skill.score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${skill.score >= 80 ? 'green' : ''}`} style={{ width: `${skill.score}%`, transition: `width ${0.5 + i * 0.1}s ease` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
