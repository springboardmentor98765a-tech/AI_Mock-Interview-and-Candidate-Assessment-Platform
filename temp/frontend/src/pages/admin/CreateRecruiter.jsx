import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

const ACCESS = ['active', 'read only', 'disabled'];


export default function CreateRecruiter() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: 'KUMAR KUMAR',
    org: 'TechCorp Pvt Ltd',
    email: 'sonia@smarthire.ai',
    password: '',
    access: 'active',
  });

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/admin');
  };

  return (
    <AppLayout>
      <PageHead
        title="Recruiters"
        subtitle="Create a recruiter account and set its access level."
      />

      <div className="grid cols-2">
        <form className="card" onSubmit={handleSubmit}>
          <h2>New recruiter</h2>

          <div className="field">
            <label className="label" htmlFor="name">
              Full name
            </label>
            <input id="name" type="text" required value={form.name} onChange={update('name')} />
          </div>

          <div className="field">
            <label className="label" htmlFor="org">
              Organization
            </label>
            <input id="org" type="text" required value={form.org} onChange={update('org')} />
          </div>

          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required value={form.email} onChange={update('email')} />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Temporary password
            </label>
            <input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={update('password')}
            />
          </div>

          <div className="field">
            <span className="label">Access level</span>
            <div className="choices">
              {ACCESS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === form.access ? 'choice on' : 'choice'}
                  onClick={() => setForm({ ...form, access: value })}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Create account
          </button>

          <p className="note">Login credentials are emailed to the recruiter.</p>
        </form>

        <section className="card">
          <h2>Existing recruiters</h2>
        </section>
      </div>
    </AppLayout>
  );
}
