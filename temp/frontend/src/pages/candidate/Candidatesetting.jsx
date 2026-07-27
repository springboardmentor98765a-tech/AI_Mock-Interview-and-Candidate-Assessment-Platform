import React, { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';
import { useAuth } from '../../context/AuthContext';

export default function Candidatesetting() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? 'DIV KUMAR',
    email: user?.email ?? 'candidate@smarthire.ai',
    password: '••••••••',
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout>
      <PageHead title="Account settings" subtitle="Manage your profile details and password." />

      <form className="card card-narrow" onSubmit={handleSubmit}>
        <h2>Candidate profile</h2>

        <div className="field">
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {saved && <p className="note">Settings saved successfully.</p>}

        <button type="submit" className="btn btn-primary btn-block gap-top">
          Save
        </button>
      </form>
    </AppLayout>
  );
}
