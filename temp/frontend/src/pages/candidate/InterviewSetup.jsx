import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

const TYPES = ['technical', 'hr', 'aptitude', 'behavioural'];
const LEVELS = ['easy', 'medium', 'hard'];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'technical', level: 'medium', domain: 'Backend engineer - Python', count: 10 });
  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const Picker = ({ label, items, active, field }) => (
    <div className="field">
      <span className="label">{label}</span>
      <div className="choices">
        {items.map((val) => (
          <button key={val} type="button" className={`choice ${val === active ? 'on' : ''}`} onClick={() => update(field, val)}>
            {val}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <PageHead title="Configure session" subtitle="Questions are generated to match the role, level, and your skills." />
      <form className="card" onSubmit={(e) => { e.preventDefault(); navigate('/interview/live'); }}>
        <h2>Session settings</h2>

        <Picker label="Interview type" items={TYPES} active={form.type} field="type" />

        <div className="field">
          <label className="label" htmlFor="domain">Domain / role</label>
          <input id="domain" type="text" value={form.domain} onChange={(e) => update('domain', e.target.value)} />
        </div>

        <Picker label="Difficulty" items={LEVELS} active={form.level} field="level" />

        <div className="field">
          <label className="label" htmlFor="count">Number of questions</label>
          <input id="count" type="number" min={1} max={50} value={form.count} onChange={(e) => update('count', Number(e.target.value) || 1)} />
        </div>

        <button type="submit" className="btn btn-primary btn-block">Launch session</button>
      </form>
    </AppLayout>
  );
}
