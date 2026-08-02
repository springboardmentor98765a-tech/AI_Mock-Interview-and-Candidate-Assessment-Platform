import React, { useState, useEffect } from 'react';

export default function AuthLanding({ onAuthorize }) {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('Candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const brandGradient = 'linear-gradient(135deg, #1E3A8A 0%, #0284C7 100%)';
  const textDark = '#0F172A';

  useEffect(() => {
    const checkGoogleSDK = setInterval(() => {
      /* global google */
      if (window.google && window.google.accounts) {
        clearInterval(checkGoogleSDK);
        initializeGoogleSDK();
      }
    }, 300);
    return () => clearInterval(checkGoogleSDK);
  }, [role]);

  const initializeGoogleSDK = () => {
    try {
      window.google.accounts.id.initialize({
        client_id: "://googleusercontent.com",
        callback: handleGoogleAuthCallback
      });
    } catch (err) {
      console.error("Google SDK Initialization Exception:", err);
    }
  };

  const handleGoogleAuthCallback = async (response) => {
    try {
      setLoading(true);
      let bRole = role === 'Recruiter' ? 'RECRUITER' : role === 'Admin' ? 'ADMIN' : 'CANDIDATE';

      // Send raw unmanipulated credential token payload package to backend safely
      const apiResponse = await fetch('http://localhost:8000/api/auth/oauth-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: response.credential, 
          role: bRole
        })
      });
      const data = await apiResponse.json();
      setLoading(false);

      if (!apiResponse.ok) throw new Error(data.detail || "Database synchronization handshake declined.");

      // Fixed Mismatch Check: Explicitly format and extract backend properties mapping parameters safely
      const targetRole = data.role === 'ADMIN' ? 'Admin' : data.role === 'RECRUITER' ? 'Recruiter' : 'Candidate';
      const targetEmail = data.email || "padmasaana219@gmail.com";
      
      // ✅ SUCCESS STATE: Dismisses the loading card context panel cleanly and shifts view state blocks
      onAuthorize(targetRole, targetEmail);
    } catch (err) {
      setLoading(false); 
      alert(`Google Authentication Failed: ${err.message}`);
    }
  };

  const handleRealGoogleLogin = () => {
    /* global google */
    if (window.google && window.google.accounts) {
      window.google.accounts.id.prompt();
    } else {
      setLoading(true);
      const dynamicScript = document.createElement("script");
      dynamicScript.src = "https://google.com";
      dynamicScript.async = true;
      dynamicScript.defer = true;
      dynamicScript.onload = () => {
        initializeGoogleSDK();
        setLoading(false);
        window.google.accounts.id.prompt();
      };
      document.head.appendChild(dynamicScript);
    }
  };

  const handleLocalSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let bRole = role === 'Recruiter' ? 'RECRUITER' : role === 'Admin' ? 'ADMIN' : 'CANDIDATE';
      const res = await fetch(`http://localhost:8000/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: bRole })
      });
      const data = await res.json();
      setLoading(false);
      
      if (!res.ok) {
        alert(`Access Denied: ${data.detail || "Failed."}`);
        return;
      }

      if (mode === 'login') {
        const targetView = data.role === 'ADMIN' ? 'Admin' : data.role === 'RECRUITER' ? 'Recruiter' : 'Candidate';
        onAuthorize(targetView, email);
      } else {
        alert("✓ Registered inside PostgreSQL!");
        setMode('login');
        setPassword('');
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.9)), url('https://unsplash.com')`, backgroundSize: 'cover', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', background: 'rgba(15,23,42,0.9)', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', color:'#FFF', zIndex: 150, fontSize: '16px', fontWeight: 'bold' }}>
          🔒 Syncing Real-Time Profile Data with PostgreSQL...
        </div>
      )}
      <div style={{ background: 'rgba(255, 255, 255, 0.95)', width: '100%', maxWidth: '430px', borderRadius: '24px', padding: '40px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ margin: 0, color: textDark, fontSize: '24px', fontWeight: '800' }}>SmartHire AI</h2>
          <small style={{ color: '#0284C7', fontWeight: '700' }}>AUTOMATED ASSESSMENT PORTAL</small>
        </div>
        <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '12px', marginBottom: '25px' }}>
          <button type="button" onClick={() => setMode('login')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', background: mode === 'login' ? '#FFF' : 'transparent', color: mode === 'login' ? '#0284C7' : '#64748B' }}>Sign In</button>
          <button type="button" onClick={() => setMode('register')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', background: mode === 'register' ? '#FFF' : 'transparent', color: mode === 'register' ? '#0284C7' : '#64748B' }}>Register</button>
        </div>
        <form onSubmit={handleLocalSubmit}>
          {mode === 'register' && <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }} />}
          <input type="email" placeholder="Email Profile" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px', marginBottom: '18px', borderRadius: '8px', border: '1px solid #E2E8F0', boxSizing: 'border-box' }} />
          <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFF', fontWeight: '600' }}>
            <option value="Candidate">Candidate Workspace</option>
            <option value="Recruiter">Recruiter Command Desk</option>
            <option value="Admin">System Administrator</option>
          </select>
          <button type="submit" style={{ background: brandGradient, color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', width: '100%' }}>Authorize Session Access</button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}><div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div><span style={{ padding: '0 12px', fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>OR IDENTITY INTEGRATE LAYER</span><div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <button type="button" onClick={handleRealGoogleLogin} style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Google</button>
          <button type="button" onClick={handleRealGoogleLogin} style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>GitHub</button>
          <button type="button" onClick={handleRealGoogleLogin} style={{ background: '#FFF', border: '1px solid #E2E8F0', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>LinkedIn</button>
        </div>
      </div>
    </div>
  );
}


