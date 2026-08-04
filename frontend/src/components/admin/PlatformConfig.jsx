import { useState } from 'react';
import { CreditCard, Database, Link2, Shield, Bell, Globe, Check } from 'lucide-react';

const integrations = [
  { name: 'Google Workspace', icon: '🔵', status: true,  desc: 'SSO, Calendar & Drive' },
  { name: 'Slack',            icon: '💬', status: true,  desc: 'Notifications & alerts' },
  { name: 'Greenhouse',       icon: '🟢', status: false, desc: 'ATS Integration' },
  { name: 'BambooHR',         icon: '🏔️', status: false, desc: 'HR Management System' },
  { name: 'Stripe',           icon: '💳', status: true,  desc: 'Billing & payments' },
  { name: 'AWS S3',           icon: '☁️', status: true,  desc: 'File storage' },
];

const tabs = [
  { id: 'billing',     label: 'Billing & Plans',    icon: CreditCard },
  { id: 'integrations',label: 'Integrations',       icon: Link2 },
  { id: 'security',    label: 'Security',            icon: Shield },
  { id: 'notifications',label: 'Notifications',     icon: Bell },
];

export default function PlatformConfig() {
  const [activeTab, setActiveTab] = useState('billing');
  const [plan, setPlan] = useState('enterprise');
  const [toggles, setToggles] = useState(Object.fromEntries(integrations.map(i => [i.name, i.status])));
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const ToggleSwitch = ({ id, on, onChange }) => (
    <div className={`toggle-switch ${on ? 'on' : ''}`} style={{ width: 40, height: 22, cursor: 'pointer' }} onClick={onChange}>
      <div style={{ position: 'absolute', width: 16, height: 16, background: 'white', borderRadius: '50%', top: 3, left: on ? 21 : 3, transition: 'left 0.25s ease' }} />
    </div>
  );

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <h1>Platform Configuration</h1>
        <p>Manage billing, integrations, security policies, and notification settings</p>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--space-8)' }}>
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* BILLING */}
      {activeTab === 'billing' && (
        <div className="animate-fade-in">
          <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
            {[
              { id: 'starter', name: 'Starter', price: '$49', users: 'Up to 50 users', interviews: '200 interviews/mo', color: 'var(--text-muted)' },
              { id: 'pro',     name: 'Professional', price: '$149', users: 'Up to 500 users', interviews: '2,000 interviews/mo', color: 'var(--accent-primary)' },
              { id: 'enterprise', name: 'Enterprise', price: '$399', users: 'Unlimited users', interviews: 'Unlimited interviews', color: 'var(--accent-amber)' },
            ].map(p => (
              <div key={p.id} onClick={() => setPlan(p.id)} style={{
                background: plan === p.id ? 'hsla(252,100%,68%,0.07)' : 'var(--bg-card)',
                border: `2px solid ${plan === p.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', cursor: 'pointer', transition: 'all 0.2s ease'
              }}>
                <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-4)' }}>
                  <div>
                    <h3 style={{ color: p.color }}>{p.name}</h3>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                      {p.price}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/mo</span>
                    </div>
                  </div>
                  {plan === p.id && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={14} color="white" />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[p.users, p.interviews, 'AI Analysis', 'Priority Support'].map(f => (
                    <div key={f} className="flex items-center gap-2" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--accent-green)' }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Billing Details */}
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-6)' }}>Billing Information</h3>
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
              {[
                { label: 'Company Name', placeholder: 'TechCorp Solutions', id: 'company-name' },
                { label: 'Tax ID / VAT', placeholder: 'US-123456789', id: 'tax-id' },
                { label: 'Billing Email', placeholder: 'billing@techcorp.com', id: 'billing-email' },
                { label: 'Billing Cycle', placeholder: '', id: 'billing-cycle', type: 'select', options: ['Monthly', 'Annual (20% off)'] },
              ].map(f => (
                <div key={f.id} className="form-group">
                  <label className="form-label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="form-control" id={f.id}>{f.options.map(o => <option key={o}>{o}</option>)}</select>
                  ) : (
                    <input className="form-control" placeholder={f.placeholder} id={f.id} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {integrations.map(integ => (
              <div key={integ.name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.8rem' }}>{integ.icon}</span>
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{integ.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{integ.desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch id={integ.name} on={toggles[integ.name]} onChange={() => setToggles(t => ({ ...t, [integ.name]: !t[integ.name] }))} />
                </div>
                <div style={{ fontSize: '0.75rem', color: toggles[integ.name] ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {toggles[integ.name] ? '● Connected & Active' : '○ Not connected'}
                </div>
                <button className="btn btn-secondary btn-sm">{toggles[integ.name] ? 'Configure' : 'Connect'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECURITY */}
      {activeTab === 'security' && (
        <div className="animate-fade-in grid-2" style={{ gap: 'var(--space-6)' }}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-6)' }}>Authentication Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {[
                { label: 'Require Two-Factor Authentication', sub: 'Mandatory for all admin and recruiter accounts', on: true },
                { label: 'SSO (Single Sign-On)', sub: 'Allow login via Google Workspace / SAML', on: true },
                { label: 'Session Timeout (30 min)', sub: 'Auto-logout inactive users after 30 minutes', on: false },
                { label: 'IP Allowlist', sub: 'Restrict access to specific IP ranges', on: false },
              ].map((s, i) => (
                <div key={s.label} className="flex justify-between items-start" style={{ paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 3 }}>{s.label}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.sub}</p>
                  </div>
                  <ToggleSwitch id={`sec-${i}`} on={s.on} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-6)' }}>Database & Storage</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { label: 'Database Connection', value: 'postgres://db.smarthire.io:5432/prod', icon: Database },
                { label: 'Storage Bucket', value: 's3://smarthire-recordings-prod', icon: Globe },
                { label: 'CDN Endpoint', value: 'cdn.smarthire.io', icon: Link2 },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="form-group">
                    <label className="form-label">
                      <Icon size={12} style={{ display: 'inline', marginRight: 6 }} />
                      {f.label}
                    </label>
                    <input className="form-control font-mono" defaultValue={f.value} style={{ fontSize: '0.78rem' }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="animate-fade-in card">
          <h3 style={{ marginBottom: 'var(--space-6)' }}>Notification Preferences</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { label: 'Interview Completed', sub: 'Notify recruiter when a candidate completes their session', on: true },
              { label: 'High Score Alert', sub: 'Alert when a candidate scores above 85%', on: true },
              { label: 'New User Registration', sub: 'Admin email when new users join', on: false },
              { label: 'System Alerts', sub: 'Critical system errors and downtime notifications', on: true },
              { label: 'Weekly Report', sub: 'Send platform analytics digest every Monday', on: true },
              { label: 'AI Cost Threshold', sub: 'Alert when monthly AI costs exceed budget', on: false },
            ].map((n, i) => (
              <div key={n.label} className="flex justify-between items-start" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 3 }}>{n.label}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{n.sub}</p>
                </div>
                <ToggleSwitch id={`notif-${i}`} on={n.on} onChange={() => {}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <button className="btn btn-primary" onClick={save} id="save-config-btn">
          {saved ? <><Check size={16} /> Saved!</> : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
