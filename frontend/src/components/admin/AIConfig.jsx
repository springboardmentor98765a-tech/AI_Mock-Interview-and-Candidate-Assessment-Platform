import { useState } from 'react';
import { Bot, Thermometer, Sliders, FileText, Save, Check, RefreshCw } from 'lucide-react';
import { aiPersonalities, aiProviders } from '../../data/mockData';

const DEFAULT_PROMPT = `You are an AI interviewer for SmartHire. Your role is to conduct professional interview sessions.

Guidelines:
- Ask one question at a time
- Listen carefully to the candidate's responses
- Follow up with relevant clarifying questions
- Evaluate: technical depth, communication clarity, and problem-solving approach
- Be {{personality}} and {{formality}} in your tone
- Adjust difficulty based on candidate's response quality`;

export default function AIConfig() {
  const [personality, setPersonality] = useState('balanced');
  const [provider, setProvider] = useState('gemini');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [topP, setTopP] = useState(0.9);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>AI Configuration</h1>
        <p>Fine-tune the AI interviewer's personality, language model, and generation parameters</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Personality */}
          <div className="card">
            <h3 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-5)' }}>
              <Bot size={18} color="var(--accent-primary)" />
              AI Personality Mode
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {aiPersonalities.map(p => (
                <div
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className="provider-option"
                  style={{
                    borderColor: personality === p.id ? 'var(--accent-primary)' : 'var(--border-medium)',
                    background: personality === p.id ? 'hsla(252,100%,68%,0.06)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  id={`personality-${p.id}`}
                >
                  <div className={`provider-radio ${personality === p.id ? 'checked' : ''}`} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3, fontSize: '0.875rem' }}>{p.label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.desc}</p>
                  </div>
                  {personality === p.id && <span className="badge badge-primary">Active</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Model Parameters */}
          <div className="card">
            <h3 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-6)' }}>
              <Sliders size={18} color="var(--accent-primary)" />
              Generation Parameters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Temperature */}
              <div className="slider-row">
                <div className="flex justify-between">
                  <label className="form-label">Temperature</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{temperature.toFixed(2)}</span>
                </div>
                <input type="range" className="range-slider" min={0} max={1} step={0.01} value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))} id="temperature-slider"
                  style={{ '--fill-pct': `${temperature * 100}%` }}
                />
                <div className="slider-labels">
                  <span>Precise (0.0)</span>
                  <span>Creative (1.0)</span>
                </div>
                <div style={{ padding: '6px 10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {temperature < 0.4 ? '❄️ Very deterministic — consistent, repeatable answers' :
                   temperature < 0.7 ? '⚖️ Balanced — good variety with coherence' :
                   '🔥 High creativity — more diverse, exploratory responses'}
                </div>
              </div>

              {/* Max Tokens */}
              <div className="slider-row">
                <div className="flex justify-between">
                  <label className="form-label">Max Response Tokens</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-teal)', fontWeight: 600 }}>{maxTokens}</span>
                </div>
                <input type="range" className="range-slider" min={128} max={2048} step={64} value={maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))} id="max-tokens-slider" />
                <div className="slider-labels">
                  <span>128 tokens</span>
                  <span>2048 tokens</span>
                </div>
              </div>

              {/* Top-P */}
              <div className="slider-row">
                <div className="flex justify-between">
                  <label className="form-label">Top-P (Nucleus Sampling)</label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{topP.toFixed(2)}</span>
                </div>
                <input type="range" className="range-slider" min={0.1} max={1.0} step={0.01} value={topP}
                  onChange={e => setTopP(parseFloat(e.target.value))} id="top-p-slider" />
                <div className="slider-labels">
                  <span>Focused</span>
                  <span>Diverse</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Provider Selection */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-5)' }}>AI Provider</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {aiProviders.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className="provider-option"
                  style={{
                    borderColor: provider === p.id ? 'var(--accent-primary)' : 'var(--border-medium)',
                    background: provider === p.id ? 'hsla(252,100%,68%,0.06)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  id={`provider-${p.id}`}
                >
                  <div className={`provider-radio ${provider === p.id ? 'checked' : ''}`} />
                  <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{p.label}</span>
                  <span className={`badge ${p.badge === 'Recommended' ? 'badge-success' : p.badge === 'Stable' ? 'badge-primary' : 'badge-teal'}`} style={{ fontSize: '0.65rem' }}>
                    {p.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Template */}
          <div className="card" style={{ flex: 1 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-5)' }}>
              <h3 className="flex items-center gap-2">
                <FileText size={18} color="var(--accent-primary)" />
                System Prompt Template
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setPrompt(DEFAULT_PROMPT)}>
                <RefreshCw size={13} />
                Reset
              </button>
            </div>
            <textarea
              className="form-control font-mono"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              id="system-prompt-textarea"
              style={{ minHeight: 240, fontSize: '0.78rem', lineHeight: 1.7, resize: 'vertical' }}
            />
            <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
              {['{{personality}}', '{{formality}}', '{{difficulty}}', '{{candidate_name}}'].map(v => (
                <button key={v} className="skill-tag" style={{ fontSize: '0.72rem', cursor: 'pointer' }}
                  onClick={() => setPrompt(p => p + ` ${v}`)}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Config Summary */}
          <div style={{ background: 'hsla(252,100%,68%,0.05)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>Current Config</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>provider: <span style={{ color: 'var(--accent-teal)' }}>"{provider}"</span></span>
              <span>personality: <span style={{ color: 'var(--accent-teal)' }}>"{personality}"</span></span>
              <span>temperature: <span style={{ color: 'var(--accent-amber)' }}>{temperature}</span></span>
              <span>max_tokens: <span style={{ color: 'var(--accent-amber)' }}>{maxTokens}</span></span>
              <span>top_p: <span style={{ color: 'var(--accent-amber)' }}>{topP}</span></span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-8)' }}>
        <button className="btn btn-primary btn-lg" onClick={save} id="save-ai-config-btn">
          {saved ? <><Check size={16} /> Configuration Saved!</> : <><Save size={16} /> Save AI Configuration</>}
        </button>
      </div>
    </div>
  );
}
