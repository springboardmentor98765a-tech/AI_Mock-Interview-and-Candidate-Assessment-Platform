// ============================================================
//  QuestionPreview.jsx — Recruiter/Admin Review, Edit, Delete & Assign
// ============================================================
import { useState, useEffect } from 'react';
import { Play, RefreshCw, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Edit3, Trash2, UserCheck, Plus, Save, AlertCircle } from 'lucide-react';

export default function QuestionPreview({
  initialQuestions = [],
  jobRole,
  domain,
  interviewType,
  difficulty,
  experienceLevel,
  candidates = [],
  selectedCandidateId: defaultCandidateId = '',
  onRegenerate,
  onConfirm,
  onBack,
  loading = false,
}) {
  const [questions, setQuestions]               = useState(initialQuestions);
  const [expandedIndex, setExpandedIndex]       = useState(0);
  const [editingIndex, setEditingIndex]         = useState(-1);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editCategory, setEditCategory]         = useState('');
  const [editPointsText, setEditPointsText]     = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState(defaultCandidateId);
  const [isRegenerating, setIsRegenerating]     = useState(false);
  const [regenError, setRegenError]             = useState('');

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  const handleRegenerateClick = async () => {
    setIsRegenerating(true);
    setRegenError('');
    try {
      if (onRegenerate) {
        const freshQuestions = await onRegenerate();
        if (freshQuestions && Array.isArray(freshQuestions) && freshQuestions.length > 0) {
          setQuestions(freshQuestions);
          setExpandedIndex(0);
        }
      }
    } catch (err) {
      console.error('[QuestionPreview] Regeneration failed:', err);
      setRegenError(err.message || 'Failed to regenerate questions. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? -1 : idx);
  };

  const handleStartEdit = (idx, q) => {
    setEditingIndex(idx);
    setEditQuestionText(q.question_text);
    setEditCategory(q.category || domain);
    setEditPointsText((q.expected_answer_points || []).join('\n'));
  };

  const handleSaveEdit = (idx) => {
    const updated = [...questions];
    updated[idx] = {
      ...updated[idx],
      question_text: editQuestionText,
      category: editCategory,
      expected_answer_points: editPointsText.split('\n').map(p => p.trim()).filter(Boolean),
    };
    setQuestions(updated);
    setEditingIndex(-1);
  };

  const handleDelete = (idx) => {
    if (questions.length <= 1) {
      alert('An interview session must have at least 1 question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    // reindex
    const reindexed = updated.map((q, i) => ({ ...q, question_number: i + 1 }));
    setQuestions(reindexed);
    if (expandedIndex >= reindexed.length) setExpandedIndex(0);
  };

  const handleAddQuestion = () => {
    const newQ = {
      question_number: questions.length + 1,
      question_text: `Custom question for ${jobRole}`,
      interview_type: interviewType,
      domain: domain,
      difficulty: difficulty,
      category: domain,
      expected_answer_points: ['Domain understanding', 'Structured explanation'],
      sample_answer: 'Ideal answer outline demonstrating domain expertise.'
    };
    setQuestions([...questions, newQ]);
    setExpandedIndex(questions.length);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.85rem', marginBottom: 8, padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back to Setup
          </button>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            Review, Edit &amp; Assign Questions ({questions.length} Total)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {jobRole} &bull; <span style={{ color: 'var(--accent-primary)' }}>{domain}</span> &bull; {interviewType} &bull; {' '}
            <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{difficulty}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleRegenerateClick}
            disabled={loading || isRegenerating}
            style={{
              padding: '10px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)', cursor: (loading || isRegenerating) ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 500
            }}
          >
            <RefreshCw size={16} className={(loading || isRegenerating) ? 'spin' : ''} />
            <span>{(loading || isRegenerating) ? 'Generating Fresh Questions...' : 'Regenerate AI Questions'}</span>
          </button>

          <button
            onClick={() => onConfirm(questions, selectedCandidateId)}
            disabled={loading || isRegenerating}
            style={{
              padding: '10px 22px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              border: 'none', color: '#fff', cursor: (loading || isRegenerating) ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600,
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <UserCheck size={18} />
            <span>Save &amp; Assign Interview</span>
          </button>
        </div>
      </div>

      {regenError && (
        <div style={{
          background: 'hsla(350,90%,65%,0.1)',
          border: '1px solid var(--accent-rose)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'var(--accent-rose)', fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} />
            <span>{regenError}</span>
          </div>
          <button
            onClick={handleRegenerateClick}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-rose)', border: 'none', color: '#fff',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* Candidate Assignment selector bar */}
      <div className="card" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: 20, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserCheck size={20} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Assign Session to Candidate:
          </span>
        </div>

        <select
          value={selectedCandidateId}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', color: '#fff', minWidth: 260 }}
        >
          <option value="">-- Save without Candidate Assignment --</option>
          {candidates.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
          ))}
        </select>
      </div>

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {questions.map((q, idx) => {
          const isExpanded = expandedIndex === idx;
          const isEditing  = editingIndex === idx;

          return (
            <div
              key={idx}
              className="card"
              style={{
                borderRadius: 'var(--radius-md)',
                border: isExpanded ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                overflow: 'hidden',
                transition: 'var(--transition-normal)'
              }}
            >
              {/* Question Header Row */}
              <div
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  background: isExpanded ? 'hsla(252,100%,68%,0.04)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(idx)}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: 'hsla(252,100%,68%,0.12)', color: 'var(--accent-primary)', fontWeight: 600,
                      }}>
                        {q.category || domain}
                      </span>
                    </div>

                    {!isEditing ? (
                      <h4 style={{ fontSize: '1.02rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {q.question_text}
                      </h4>
                    ) : (
                      <textarea
                        rows={2}
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--accent-primary)' }}
                      />
                    )}
                  </div>
                </div>

                {/* Edit / Delete Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {!isEditing ? (
                    <>
                      <button
                        title="Edit question text"
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(idx, q); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        title="Delete question"
                        onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => toggleExpand(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSaveEdit(idx)}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-green)', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}
                    >
                      <Save size={14} /> Save
                    </button>
                  )}
                </div>
              </div>

              {/* Question Detail Body */}
              {isExpanded && (
                <div style={{
                  padding: '0 20px 20px 66px',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 16,
                  display: 'flex', flexDirection: 'column', gap: 16
                }}>
                  {/* Expected Key Points */}
                  {!isEditing ? (
                    <div>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        Expected Answer Key Points
                      </h5>
                      <ul style={{ listStyleType: 'none', paddingLeft: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(q.expected_answer_points || []).map((pt, pIdx) => (
                          <li key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <CheckCircle2 size={14} color="var(--accent-teal)" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-teal)', marginBottom: 4 }}>
                        Edit Expected Points (one per line):
                      </label>
                      <textarea
                        rows={3}
                        value={editPointsText}
                        onChange={(e) => setEditPointsText(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', color: '#fff', border: '1px solid var(--border-medium)' }}
                      />
                    </div>
                  )}

                  {/* Sample Answer Outline */}
                  {q.sample_answer && (
                    <div style={{
                      background: 'var(--bg-elevated)', padding: '14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} /> Model Answer Outline
                      </h5>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {q.sample_answer}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Custom Question Button */}
      <button
        onClick={handleAddQuestion}
        style={{
          width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)', border: '1px dashed var(--border-accent)',
          color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
      >
        <Plus size={16} /> Add Custom Question
      </button>
    </div>
  );
}
