// ============================================================
//  PlatformConfig.jsx — Platform, Security & Auth Settings
// ============================================================
import { useState, useEffect } from 'react';
import { Settings, Shield, Mail, Key, Lock, CheckCircle, Save, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function PlatformConfig() {
  const [siteName, setSiteName]                 = useState('SmartHire AI Platform');
  const [supportEmail, setSupportEmail]         = useState('support@smarthire.ai');
  const [allowRegistration, setAllowRegistration] = useState(true);
  
  const [smtpHost, setSmtpHost]                 = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort]                 = useState(587);
  const [smtpUser, setSmtpUser]                 = useState('notifications@smarthire.ai');
  
  const [jwtExpiry, setJwtExpiry]               = useState(7);
  const [enableGoogle, setEnableGoogle]         = useState(true);
  const [enableGithub, setEnableGithub]         = useState(true);
  
  const [rateLimit, setRateLimit]               = useState(120);
  const [strongPasswords, setStrongPasswords]   = useState(true);

  const [saving, setSaving]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/config`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.site_name) setSiteName(data.site_name);
        if (data.support_email) setSupportEmail(data.support_email);
        if (data.allow_self_registration !== undefined) setAllowRegistration(data.allow_self_registration);
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(data.smtp_port);
        if (data.smtp_user) setSmtpUser(data.smtp_user);
        if (data.jwt_expiry_days) setJwtExpiry(data.jwt_expiry_days);
        if (data.enable_google_oauth !== undefined) setEnableGoogle(data.enable_google_oauth);
        if (data.enable_github_oauth !== undefined) setEnableGithub(data.enable_github_oauth);
        if (data.rate_limit_per_min) setRateLimit(data.rate_limit_per_min);
        if (data.enforce_strong_passwords !== undefined) setStrongPasswords(data.enforce_strong_passwords);
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          site_name: siteName,
          support_email: supportEmail,
          allow_self_registration: allowRegistration,
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort, 10),
          smtp_user: smtpUser,
          jwt_expiry_days: parseInt(jwtExpiry, 10),
          enable_google_oauth: enableGoogle,
          enable_github_oauth: enableGithub,
          rate_limit_per_min: parseInt(rateLimit, 10),
          enforce_strong_passwords: strongPasswords,
        }),
      });

      if (!res.ok) throw new Error('Failed to save platform config');

      setStatusMsg('Platform Settings saved successfully!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700 }}>
          Platform Settings &amp; Configuration
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Manage global application parameters, email SMTP, authentication policies &amp; security rules.
        </p>
      </div>

      {statusMsg && (
        <div style={{ background: 'hsla(142,70%,55%,0.1)', border: '1px solid var(--accent-green)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, color: 'var(--accent-green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={16} /> {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: 'hsla(350,90%,65%,0.1)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, color: 'var(--accent-rose)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* General Settings */}
        <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Settings size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              General Application Settings
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Platform Name
              </label>
              <input className="input" value={siteName} onChange={e => setSiteName(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Support Email Address
              </label>
              <input className="input" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>
          </div>
        </div>

        {/* Email SMTP Configuration */}
        <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Mail size={20} color="var(--accent-teal)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              Email SMTP Configuration
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                SMTP Server Host
              </label>
              <input className="input" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Port Number
              </label>
              <input className="input" type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Sender Email Account
              </label>
              <input className="input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>
          </div>
        </div>

        {/* Authentication & OAuth Settings */}
        <div className="card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Key size={20} color="var(--accent-amber)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
              Authentication &amp; Security Policies
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                JWT Token Expiry (Days)
              </label>
              <input className="input" type="number" value={jwtExpiry} onChange={e => setJwtExpiry(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                API Rate Limit (Reqs / min)
              </label>
              <input className="input" type="number" value={rateLimit} onChange={e => setRateLimit(e.target.value)} style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-input)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '12px 26px', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
