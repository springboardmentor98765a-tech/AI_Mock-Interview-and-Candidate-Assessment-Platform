import React, { useState, useEffect } from 'react';
import AuthLanding from './views/AuthLanding';
import CandidatePortal from './views/CandidatePortal';
import RecruiterPortal from './views/RecruiterPortal';
import AdminPortal from './views/AdminPortal';
import Navbar from './components/Navbar';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [pageLoading, setPageLoading] = useState(false);

  // --- CAPTURE THE GENUINE CODE FROM GOOGLE REDIRECT URL ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    
    if (authCode) {
      exchangeCodeForRealUser(authCode);
    }
  }, []);

  const exchangeCodeForRealUser = async (code) => {
    try {
      setPageLoading(true);
      const targetRole = localStorage.getItem("smarthire_target_role") || "CANDIDATE";

      // Secure exchange node: backend communicates with Google server-to-server to fetch the true user identity
      const response = await fetch("http://localhost:8000/api/auth/exchange-google-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, role: targetRole })
      });
      const data = await response.json();
      setPageLoading(false);

      if (!response.ok) throw new Error(data.detail || "Google authentication rejected.");

      // Clean the URL query fields cleanly so it looks professional
      window.history.replaceState(null, null, window.location.pathname);

      setUserEmail(data.email);
      const formattedRole = data.role === 'ADMIN' ? 'Admin' : data.role === 'RECRUITER' ? 'Recruiter' : 'Candidate';
      setUserRole(formattedRole);
      setIsAuthenticated(true);
    } catch (err) {
      setPageLoading(false);
      alert(`Authentic Login Loop Failure: ${err.message}`);
    }
  };

  const handleAuthorize = (role, email) => {
    setUserRole(role);
    setUserEmail(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('');
    setUserEmail('');
    localStorage.removeItem("smarthire_target_role");
  };

  if (pageLoading) {
    return <div style={{ background: '#0F172A', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}><h3>🔒 Validating real Google profile fields against PostgreSQL tables...</h3></div>;
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      {isAuthenticated ? (
        <>
          <Navbar role={userRole} email={userEmail} onLogout={handleLogout} />
          <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            {userRole === 'Candidate' && <CandidatePortal />}
            {userRole === 'Recruiter' && <RecruiterPortal />}
            {userRole === 'Admin' && <AdminPortal />}
          </div>
        </>
      ) : (
        <AuthLanding onAuthorize={handleAuthorize} />
      )}
    </div>
  );
}
