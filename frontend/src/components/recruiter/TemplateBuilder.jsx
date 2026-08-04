import { useState } from 'react';
import { Plus, Trash2, GripVertical, Clock, Save, ChevronDown } from 'lucide-react';
import { templateQuestions } from '../../data/mockData';

const ROUND_TYPES = ['Technical', 'HR', 'Behavioral'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function DifficultyBadge({ diff }) {
  const cls = diff === 'Easy' ? 'difficulty-easy' : diff === 'Medium' ? 'difficulty-medium' : 'difficulty-hard';
  return <span className={`badge ${cls}`} style={{ fontSize: '0.68rem' }}>{diff}</span>;
}

export default function TemplateBuilder() {
  const [activeRound, setActiveRound] = useState('Technical');
  const [questions, setQuestions] = useState(templateQuestions['Technical']);
  const [newQ, setNewQ] = useState('');
  const [newDiff, setNewDiff] = useState('Medium');
  const [duration, setDuration] = useState(45);
  const [templateName, setTemplateName] = useState('React Developer — Technical Round');
  const [saved, setSaved] = useState(false);

  const switchRound = (round) => {
    setActiveRound(round);
    setQuestions(templateQuestions[round] || []);
  };

  const addQuestion = () => {
    if (!newQ.trim()) return;
    setQuestions(q => [...q, { id: Date.now(), text: newQ, difficulty: newDiff }]);
    setNewQ('');
  };

  const removeQuestion = (id) => setQuestions(q => q.filter(x => x.id !== id));

  const saveTemplate = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Interview Template Builder</h1>
        <p>Design custom interview rounds with specific questions, difficulty levels, and time constraints</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Builder */}
        <div>
          {/* Template Name */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-5)' }}>Template Settings</h3>
            <div className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Template Name</label>
                <input
                  id="template-name-input"
                  className="form-control"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes): {duration} min</label>
                <input
                  type="range"
                  className="range-slider"
                  min={15} max={120} step={5}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  id="template-duration-slider"
                />
                <div className="slider-labels">
                  <span>15 min</span>
                  <span>120 min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Round Tabs */}
          <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
            {ROUND_TYPES.map(r => (
              <button key={r} className={`tab-item ${activeRound === r ? 'active' : ''}`} onClick={() => switchRound(r)}>
                {r}
                <span style={{ marginLeft: 4, fontSize: '0.7rem', background: activeRound === r ? 'var(--accent-primary)' : 'var(--border-medium)', color: 'white', padding: '1px 6px', borderRadius: 99 }}>
                  {(templateQuestions[r] || []).length}
                </span>
              </button>
            ))}
          </div>

          {/* Question List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {questions.map((q, i) => (
              <div key={q.id} className="template-question">
                <GripVertical size={16} className="drag-handle" />
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{q.text}</span>
                <DifficultyBadge diff={q.difficulty} />
                <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-muted)' }} onClick={() => removeQuestion(q.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Question */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px dashed var(--border-medium)' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: 'var(--space-4)', color: 'var(--text-secondary)' }}>
              <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />
              Add Custom Question
            </h4>
            <div className="flex flex-col gap-3">
              <textarea
                className="form-control"
                placeholder="Type your interview question here..."
                value={newQ}
                onChange={e => setNewQ(e.target.value)}
                id="new-question-textarea"
                style={{ minHeight: 70 }}
              />
              <div className="flex gap-3 items-center">
                <select className="form-control" value={newDiff} onChange={e => setNewDiff(e.target.value)} id="question-difficulty-select" style={{ maxWidth: 140 }}>
                  {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                </select>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addQuestion} id="add-question-btn">
                  <Plus size={15} />
                  Add Question
                </button>
              </div>
            </div>
          </div>

          <button className="btn btn-primary w-full" onClick={saveTemplate} id="save-template-btn">
            {saved ? '✓ Template Saved!' : <><Save size={16} /> Save Template</>}
          </button>
        </div>

        {/* Preview Panel */}
        <div>
          <div className="card" style={{ background: 'linear-gradient(135deg, hsla(252,100%,68%,0.05), hsla(280,90%,65%,0.05))', border: '1px solid var(--border-accent)' }}>
            <h3 style={{ marginBottom: 'var(--space-6)' }}>Template Preview</h3>

            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Template Name</p>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{templateName}</p>
            </div>

            <div className="grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <div style={{ background: 'var(--bg-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-primary)' }}>{questions.length}</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Questions</p>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--accent-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Clock size={22} />{duration}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minutes</p>
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Difficulty Mix</p>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map(d => {
                  const count = questions.filter(q => q.difficulty === d).length;
                  const pct = questions.length ? Math.round(count / questions.length * 100) : 0;
                  return count > 0 ? (
                    <div key={d} style={{ flex: pct, minWidth: 40, background: d === 'Easy' ? 'hsla(142,70%,55%,0.15)' : d === 'Medium' ? 'hsla(38,95%,60%,0.15)' : 'hsla(350,90%,65%,0.15)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: d === 'Easy' ? 'var(--accent-green)' : d === 'Medium' ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>{count}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{d}</p>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Round overview */}
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>All Rounds</p>
              {ROUND_TYPES.map(r => (
                <div key={r} className="flex justify-between items-center" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                  <span style={{ color: activeRound === r ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeRound === r ? 600 : 400 }}>{r}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{(templateQuestions[r] || []).length} questions</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
