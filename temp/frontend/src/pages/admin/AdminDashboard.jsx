import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import PageHead from '../../components/PageHead';

const STATS = [
  ['312', 'Total users'],
  ['48', 'Recruiters'],
  ['1,284', 'Interviews'],
  ['72%', 'Platform avg'],
];

const ACTIVITY = [
  ['Recruiter created', 'KUMAR KUMAR added by admin', '2 min ago', 'badge-ok'],
  ['AI model updated', 'Scoring model switched to v2.4', '1 hr ago', 'badge-info'],
  ['User blocked', 'Karan Patel blocked for policy breach', '3 hr ago', 'badge-bad'],
  ['Settings changed', 'Session cap raised to 12 questions', '5 hr ago', 'badge-warn'],
];

export default function AdminDashboard() {
  return (
    <AppLayout>
      <PageHead
        title="Platform overview"
        subtitle="Users, configuration, AI settings and system activity."
      />

      <div className="grid cols-4">
        {STATS.map(([value, label]) => (
          <div key={label} className="stat">
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="grid cols-3">
        <Link to="/admin/users" className="tile">
          <strong>Manage users &amp; recruiters</strong>
          <span>Search, block, change roles and create recruiter accounts.</span>
        </Link>

        <Link to="/admin/settings" className="tile">
          <strong>Platform settings</strong>
          <span>Session limits, scoring weights, retention and sign-up rules.</span>
        </Link>

        <Link to="/admin/activity" className="tile">
          <strong>System activity</strong>
          <span>Audit log of configuration changes, blocks and failures.</span>
        </Link>

        <Link to="/admin/ai" className="tile">
          <strong>AI configuration</strong>
          <span>Model selection, temperature, prompts and scoring weights.</span>
        </Link>

        <Link to="/admin/analytics" className="tile">
          <strong>Platform analytics</strong>
          <span>Volume, completion rate and score distribution across all users.</span>
        </Link>
      </div>

      
    </AppLayout>
  );
}
