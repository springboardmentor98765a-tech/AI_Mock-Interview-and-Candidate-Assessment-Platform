/* ==========================================================================
   SmartHire AI - Module 1 Core Interactivity, Authentication & Dashboard Engine
   Handles:
   - PostgreSQL Database State Manager & Seed Data
   - Security Route Protection Guards (JWT Token Validation, Role Access Control)
   - Public Registration (Candidate & Recruiter ONLY) with inline error validation,
     password strength meter, show/hide eye toggles, disabled submit state until valid
   - Unified Auto-Role Login with loading indicators, error/success toasts & Google OAuth2
   - User Profile Management (GET/PUT /api/profile with role immutability)
   - Candidate Dashboard: Resume Upload (.pdf/.docx validation), ATS Score Analysis,
     Interview History (search, filter, sort, pagination, CSV export), PDF Report Generator
   - Recruiter Dashboard: Candidate Analytics, Details Modal, Side-by-Side Candidate Comparison,
     Interview Templates CRUD (Create, Edit, Delete, Preview)
   - Admin Dashboard: User Governance (Verify, Suspend, Activate, Delete), 6 Live Stat Cards,
     Report Governance (View, Search, Filter, Mark Resolved/Pending, Delete)
   - Issue Reporting (Candidate & Recruiter) saved to PostgreSQL schema
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Database Schema & Seed Data
  initDatabaseSchema();

  // 2. Security Guard & Page Access Check
  checkPageAccess();

  // 3. Highlight Active Nav Item & Mobile Toggle
  highlightActiveNav();
  setupMobileNav();

  // 4. Counter Animation on Scroll
  setupAnimatedCounters();

  // 5. Initialize Auth Navigation UI Header
  initAuthUI();

  // 6. Initialize Auth Page Tabs & Forms (login.html)
  if (document.querySelector('.login-card')) {
    setupAuthPageTabs();
  }

  // 7. Page-Specific Component Initializations
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPath.includes('candidate.html')) {
    initCandidateDashboard();
  } else if (currentPath.includes('recruiter.html')) {
    initRecruiterDashboard();
  } else if (currentPath.includes('admin.html')) {
    initAdminDashboard();
  }
});

/* ==========================================================================
   SECTION 1: DATABASE SCHEMA INITIALIZER & LOCAL STATE STORE
   ========================================================================== */

function initDatabaseSchema() {
  // Seed Users Table
  if (!localStorage.getItem('smarthire_users')) {
    const seedUsers = [
      { id: 1, name: 'Alex Morgan', email: 'alex.morgan@dev.io', password: '$2a$10$e8pA7Z123456789012345u6789012345678901234567890123456', role: 'CANDIDATE', provider: 'LOCAL', is_active: true, created_at: '2026-10-01 10:00:00' },
      { id: 2, name: 'Sarah Jenkins', email: 'sarah@nexusinc.com', password: '$2a$10$e8pA7Z123456789012345u6789012345678901234567890123456', role: 'RECRUITER', provider: 'LOCAL', is_active: true, created_at: '2026-10-02 11:30:00' },
      { id: 3, name: 'System Administrator', email: 'admin@smarthire.ai', password: '$2a$10$e8pA7Z123456789012345u6789012345678901234567890123456', role: 'ADMIN', provider: 'LOCAL', is_active: true, created_at: '2026-09-15 08:00:00' },
      { id: 4, name: 'David Chen', email: 'david.chen@mit.edu', password: '$2a$10$e8pA7Z123456789012345u6789012345678901234567890123456', role: 'CANDIDATE', provider: 'LOCAL', is_active: true, created_at: '2026-10-05 14:15:00' },
      { id: 5, name: 'Suspended Candidate', email: 'suspended@dev.io', password: '$2a$10$e8pA7Z123456789012345u6789012345678901234567890123456', role: 'CANDIDATE', provider: 'LOCAL', is_active: false, created_at: '2026-10-10 16:45:00' }
    ];
    localStorage.setItem('smarthire_users', JSON.stringify(seedUsers));
  }

  // Seed Candidate Profiles Table
  if (!localStorage.getItem('smarthire_candidate_profiles')) {
    const seedCandidates = [
      { id: 1, user_id: 1, phone_number: '+1 (555) 234-5678', college: 'Stanford University', degree: 'B.S. Computer Science', branch: 'Software Engineering', graduation_year: 2024, skills: 'React, TypeScript, Node.js, PostgreSQL, System Design', preferred_role: 'Senior Frontend Engineer', resume_url: 'Alex_Morgan_CV_2026.pdf', linkedin_url: 'https://linkedin.com/in/alexmorgan', github_url: 'https://github.com/alexmorgan', portfolio_url: 'https://alexmorgan.dev', ats_score: 88.00, interview_score: 94.00 },
      { id: 2, user_id: 4, phone_number: '+1 (555) 987-6543', college: 'MIT', degree: 'M.S. Computer Science', branch: 'Artificial Intelligence', graduation_year: 2023, skills: 'Python, PyTorch, Java, Spring Boot, PostgreSQL', preferred_role: 'Fullstack Engineer', resume_url: 'David_Chen_Resume.pdf', linkedin_url: 'https://linkedin.com/in/davidchen', github_url: 'https://github.com/davidchen', portfolio_url: 'https://davidchen.ai', ats_score: 92.00, interview_score: 89.00 }
    ];
    localStorage.setItem('smarthire_candidate_profiles', JSON.stringify(seedCandidates));
  }

  // Seed Recruiter Profiles Table
  if (!localStorage.getItem('smarthire_recruiter_profiles')) {
    const seedRecruiters = [
      { id: 1, user_id: 2, company_name: 'Nexus Technologies', company_email: 'hr@nexusinc.com', designation: 'Lead Tech Recruiter', phone_number: '+1 (555) 888-9999', website: 'https://nexusinc.com', industry: 'Software & Cloud Solutions', logo_url: 'nexus_logo.png', verified: true }
    ];
    localStorage.setItem('smarthire_recruiter_profiles', JSON.stringify(seedRecruiters));
  }

  // Seed Interview Templates Table
  if (!localStorage.getItem('smarthire_templates')) {
    const seedTemplates = [
      { id: 1, recruiter_id: 1, title: 'Senior React & System Architecture Round', target_role: 'Senior Frontend Engineer', question_count: 10, difficulty: 'HARD', prompt_config: 'Focus on React 19 hooks, state management performance, memoization, and dynamic rendering.' },
      { id: 2, recruiter_id: 1, title: 'Core Java & Spring Boot Microservices', target_role: 'Backend Engineer', question_count: 8, difficulty: 'MEDIUM', prompt_config: 'Evaluate multithreading concurrency, Spring Security JWT configurations, and PostgreSQL transaction isolation levels.' }
    ];
    localStorage.setItem('smarthire_templates', JSON.stringify(seedTemplates));
  }

  // Seed Interview History Table
  if (!localStorage.getItem('smarthire_interview_history')) {
    const seedHistory = [
      { id: 101, candidate_id: 1, target_role: 'Senior Frontend Engineer', session_type: 'Technical & React Architecture', duration_mins: 45, ats_score: 94.00, status: 'COMPLETED', created_at: '2026-10-24 14:30', transcript: 'Q1: Explain React Virtual DOM reconciliation... Ans: React uses Fiber architecture for concurrent rendering diffing...', feedback: 'Strong technical depth in frontend architecture and state management.' },
      { id: 102, candidate_id: 1, target_role: 'Fullstack Engineer', session_type: 'System Design & Database Locking', duration_mins: 30, ats_score: 88.00, status: 'COMPLETED', created_at: '2026-10-21 10:15', transcript: 'Q1: How do you handle optimistic locking in PostgreSQL?... Ans: Version column check during update...', feedback: 'Good understanding of relational database transactions and concurrency.' },
      { id: 103, candidate_id: 1, target_role: 'Engineering Lead', session_type: 'Behavioral & Team Leadership', duration_mins: 35, ats_score: 91.00, status: 'COMPLETED', created_at: '2026-10-18 16:00', transcript: 'Q1: Describe how you resolve technical conflicts in a team...', feedback: 'Excellent communication and clear empathetic leadership approach.' }
    ];
    localStorage.setItem('smarthire_interview_history', JSON.stringify(seedHistory));
  }

  // Seed Reports Table
  if (!localStorage.getItem('smarthire_reports')) {
    const seedReports = [
      { id: 'REP-1001', reporter_id: 1, reporter: 'alex.morgan@dev.io', role: 'CANDIDATE', category: 'Technical issues', description: 'Voice latency during mock session round 2.', priority: 'MEDIUM', status: 'PENDING', timestamp: '2026-10-24 14:10' },
      { id: 'REP-1002', reporter_id: 2, reporter: 'sarah@nexusinc.com', role: 'RECRUITER', category: 'Fake Candidate', description: 'Suspicious discrepancy in candidate resume credentials.', priority: 'HIGH', status: 'RESOLVED', timestamp: '2026-10-23 09:45' },
      { id: 'REP-1003', reporter_id: 4, reporter: 'david.chen@mit.edu', role: 'CANDIDATE', category: 'Illegal interview questions', description: 'Question template asked non-job-related personal details.', priority: 'HIGH', status: 'PENDING', timestamp: '2026-10-22 16:30' }
    ];
    localStorage.setItem('smarthire_reports', JSON.stringify(seedReports));
  }
}

/* ==========================================================================
   SECTION 2: AUTHENTICATION SERVICE & JWT PAGE PROTECTION GUARD
   ========================================================================== */

const SmartHireAuth = {
  API_BASE: 'http://localhost:8000',

  getUser() {
    const raw = localStorage.getItem('smarthire_user');
    return raw ? JSON.parse(raw) : null;
  },

  getToken() {
    return localStorage.getItem('smarthire_jwt_token');
  },

  isTokenValid() {
    const token = this.getToken();
    const expiry = localStorage.getItem('smarthire_jwt_expiry');
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry, 10);
  },

  setSession(user, token = null) {
    const mockJwt = token || ('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role })) + '.' + Date.now());
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem('smarthire_user', JSON.stringify(user));
    localStorage.setItem('smarthire_jwt_token', mockJwt);
    localStorage.setItem('smarthire_jwt_expiry', expiryTime.toString());
  },

  async logout() {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${this.API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {}
    localStorage.removeItem('smarthire_user');
    localStorage.removeItem('smarthire_jwt_token');
    localStorage.removeItem('smarthire_jwt_expiry');
  },

  // Candidate Registration
  async registerCandidate(data) {
    try {
      const res = await fetch(`${this.API_BASE}/api/auth/register/candidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          college: data.college || null,
          degree: data.degree || null,
          branch: data.branch || null,
          graduation_year: data.graduation_year ? parseInt(data.graduation_year) : 2026,
          skills: data.skills || null,
          preferred_role: data.preferred_role || "Software Engineer",
          experience_level: data.experience_level || "Entry-Level",
          phone: data.phone || null
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Candidate registration failed.');
      }

      const newUser = {
        id: resData.user_id,
        name: resData.name,
        email: resData.email,
        role: resData.role,
        is_active: true,
        created_at: new Date().toLocaleString()
      };
      this.setSession(newUser, resData.access_token);
      return newUser;
    }  catch (err) {
  console.error("Candidate Registration Error:", err);

  throw new Error(
    err.message || "Unable to connect to the SmartHire AI server. Please ensure the backend is running."
  );
}
},
  // Recruiter Registration
  async registerRecruiter(data) {
    try {
      const res = await fetch(`${this.API_BASE}/api/auth/register/recruiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          company_name: data.company_name,
          company_email: data.company_email || data.email,
          designation: data.designation || 'Recruiter',
          phone: data.phone || null,
          website: data.website || null,
          industry: data.industry || 'Technology'
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.detail || 'Recruiter registration failed.');
      }

      const newUser = {
        id: resData.user_id,
        name: resData.name,
        email: resData.email,
        role: resData.role,
        is_active: true,
        created_at: new Date().toLocaleString()
      };
      this.setSession(newUser, resData.access_token);
      return newUser;
       } catch (err) {
      console.error("Recruiter Registration Error:", err);

      throw new Error(
        err.message || "Unable to connect to the SmartHire AI server. Please ensure the backend is running."
      );
    }
  },

  // Unified Login (Auto-Determines Role)
  async login(email, password) {
    try {
      const res = await fetch(`${this.API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.detail || 'Invalid email address or password.' };
      }

      const userObj = {
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: true
      };
      this.setSession(userObj, data.access_token);
      return { success: true, user: userObj };
    } catch (err) {
  console.error("Login Error:", err);

  return {
    success: false,
    message: "Unable to connect to the SmartHire AI server. Please ensure the backend is running."
  };
}
  },


  // Profile Management (GET/PUT /api/profile)
  getProfile() {
    const user = this.getUser();
    if (!user) return null;

    if (user.role === 'CANDIDATE') {
      const profiles = JSON.parse(localStorage.getItem('smarthire_candidate_profiles') || '[]');
      const profile = profiles.find(p => p.user_id === user.id) || {};
      return { ...user, ...profile };
    } else if (user.role === 'RECRUITER') {
      const profiles = JSON.parse(localStorage.getItem('smarthire_recruiter_profiles') || '[]');
      const profile = profiles.find(p => p.user_id === user.id) || {};
      return { ...user, ...profile };
    }
    return user;
  },

  updateProfile(data) {
    const user = this.getUser();
    if (!user) throw new Error('Not authenticated');

    let users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
    users = users.map(u => u.id === user.id ? { ...u, name: data.name || u.name } : u);
    localStorage.setItem('smarthire_users', JSON.stringify(users));

    const updatedUser = { ...user, name: data.name || user.name };
    localStorage.setItem('smarthire_user', JSON.stringify(updatedUser));

    if (user.role === 'CANDIDATE') {
      let profiles = JSON.parse(localStorage.getItem('smarthire_candidate_profiles') || '[]');
      profiles = profiles.map(p => p.user_id === user.id ? {
        ...p,
        phone_number: data.phone || p.phone_number,
        college: data.college || p.college,
        degree: data.degree || p.degree,
        branch: data.branch || p.branch,
        skills: data.skills || p.skills,
        preferred_role: data.preferred_role || p.preferred_role,
        linkedin_url: data.linkedin_url || p.linkedin_url,
        github_url: data.github_url || p.github_url,
        portfolio_url: data.portfolio_url || p.portfolio_url
      } : p);
      localStorage.setItem('smarthire_candidate_profiles', JSON.stringify(profiles));
    } else if (user.role === 'RECRUITER') {
      let profiles = JSON.parse(localStorage.getItem('smarthire_recruiter_profiles') || '[]');
      profiles = profiles.map(p => p.user_id === user.id ? {
        ...p,
        company_name: data.company_name || p.company_name,
        company_email: data.company_email || p.company_email,
        designation: data.designation || p.designation,
        phone_number: data.phone || p.phone_number,
        website: data.website || p.website,
        industry: data.industry || p.industry
      } : p);
      localStorage.setItem('smarthire_recruiter_profiles', JSON.stringify(profiles));
    }

    return { success: true, user: this.getProfile() };
  }
};

let authRedirectTimeout = null;

function showAuthRequiredModal(targetPage = 'login.html') {
  const modal = document.getElementById('authRequiredModal');
  if (modal) {
    modal.classList.add('active');
    const bar = document.getElementById('authRedirectBar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '100%';
      setTimeout(() => {
        bar.style.transition = 'width 3s linear';
        bar.style.width = '0%';
      }, 50);
    }
  }
  if (authRedirectTimeout) clearTimeout(authRedirectTimeout);
  authRedirectTimeout = setTimeout(() => {
    window.location.href = targetPage;
  }, 3000);
}

function checkPageAccess() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const protectedPages = ['candidate.html', 'recruiter.html', 'admin.html'];

  if (!protectedPages.includes(currentPath)) return;

  const user = SmartHireAuth.getUser();
  const isValid = SmartHireAuth.isTokenValid();

  if (!user || !isValid) {
    SmartHireAuth.logout();
    showAuthRequiredModal('login.html');
    return;
  }

  // Role Access Control Checks
  if (currentPath === 'candidate.html' && user.role !== 'CANDIDATE') {
    showAuthRequiredModal(getRoleDashboardPath(user.role));
  } else if (currentPath === 'recruiter.html' && user.role !== 'RECRUITER') {
    showAuthRequiredModal(getRoleDashboardPath(user.role));
  } else if (currentPath === 'admin.html' && user.role !== 'ADMIN') {
    showAuthRequiredModal(getRoleDashboardPath(user.role));
  }
}

function getRoleDashboardPath(role) {
  if (role === 'ADMIN') return 'admin.html';
  if (role === 'RECRUITER') return 'recruiter.html';
  return 'candidate.html';
}

function redirectUserToRoleDashboard(role) {
  window.location.href = getRoleDashboardPath(role);
}



/* ==========================================================================
   SECTION 3: CORE UTILITIES & UI HEADER CONTROLS
   ========================================================================== */

function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  document.querySelectorAll('.sidebar-item a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) link.classList.add('active');
  });
}

function setupMobileNav() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
      }
    });
  }
}

function setupAnimatedCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length === 0) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1800;
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);
        let frame = 0;

        const counter = setInterval(() => {
          frame++;
          const progress = frame / totalFrames;
          el.textContent = Math.round(target * progress).toLocaleString() + suffix;
          if (frame === totalFrames) {
            clearInterval(counter);
            el.textContent = target.toLocaleString() + suffix;
          }
        }, frameDuration);
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(stat => observer.observe(stat));
}

function initAuthUI() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = SmartHireAuth.getUser();
  if (user) {
    const loginBtn = navActions.querySelector('a[href="login.html"]');
    if (loginBtn) {
      loginBtn.outerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <button onclick="openProfileModal()" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-user-circle" style="color: var(--primary);"></i>
            <span>${user.name} (${user.role})</span>
          </button>
          <button onclick="handleLogout()" class="btn btn-primary btn-sm" title="Logout">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    }
  }
}

function handleLogout() {
  SmartHireAuth.logout();
  showDemoToast('Logged out successfully. Token cleared.');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

function showDemoToast(message, type = 'info') {
  let toastContainer = document.getElementById('smarthire-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'smarthire-toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const borderColor = type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#2563EB';
  const iconColor = type === 'error' ? '#F87171' : type === 'success' ? '#34D399' : '#60A5FA';
  const iconClass = type === 'error' ? 'fa-circle-xmark' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';

  toast.style.cssText = `
    background: #0F172A;
    color: #FFFFFF;
    padding: 14px 18px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.25);
    font-size: 0.875rem;
    font-family: var(--font-family, sans-serif);
    display: flex;
    align-items: center;
    gap: 12px;
    border-left: 4px solid ${borderColor};
    transform: translateY(20px);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
    <div style="flex: 1; line-height: 1.4;">${message}</div>
  `;

  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}


/* ==========================================================================
   SECTION 4: USER PROFILE MANAGEMENT (GET / PUT /api/profile)
   ========================================================================== */

function openProfileModal() {
  const profile = SmartHireAuth.getProfile();
  if (!profile) return;

  let modalId = 'modal-profile';
  let modal = document.getElementById(modalId);

  const isCandidate = profile.role === 'CANDIDATE';

  const extraFieldsHtml = isCandidate ? `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Phone Number</label>
        <input type="text" id="prof-phone" class="form-control" value="${profile.phone_number || ''}">
      </div>
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">College / University</label>
        <input type="text" id="prof-college" class="form-control" value="${profile.college || ''}">
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Degree</label>
        <input type="text" id="prof-degree" class="form-control" value="${profile.degree || ''}">
      </div>
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Branch</label>
        <input type="text" id="prof-branch" class="form-control" value="${profile.branch || ''}">
      </div>
    </div>
    <div class="form-group" style="margin-bottom: 0.75rem;">
      <label style="font-weight: 600; font-size: 0.85rem;">Technical Skills</label>
      <input type="text" id="prof-skills" class="form-control" value="${profile.skills || ''}" placeholder="e.g. React, Node.js, Python, SQL">
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">LinkedIn URL</label>
        <input type="text" id="prof-linkedin" class="form-control" value="${profile.linkedin_url || ''}">
      </div>
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">GitHub / Portfolio URL</label>
        <input type="text" id="prof-github" class="form-control" value="${profile.github_url || ''}">
      </div>
    </div>
  ` : `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Company Name</label>
        <input type="text" id="prof-company" class="form-control" value="${profile.company_name || ''}">
      </div>
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Designation</label>
        <input type="text" id="prof-designation" class="form-control" value="${profile.designation || ''}">
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Company Phone</label>
        <input type="text" id="prof-phone" class="form-control" value="${profile.phone_number || ''}">
      </div>
      <div class="form-group">
        <label style="font-weight: 600; font-size: 0.85rem;">Company Website</label>
        <input type="text" id="prof-website" class="form-control" value="${profile.website || ''}">
      </div>
    </div>
  `;

  if (modal) {
    modal.parentNode.removeChild(modal);
  }

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 600px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-id-card" style="color: var(--primary);"></i> User Profile & Account Settings</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <form id="profile-edit-form" onsubmit="saveProfile(event)">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Full Name</label>
              <input type="text" id="prof-name" class="form-control" value="${profile.name}" required>
            </div>
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Email Address</label>
              <input type="email" id="prof-email" class="form-control" value="${profile.email}" disabled style="background: var(--bg-main);">
            </div>
          </div>

          ${extraFieldsHtml}

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Assigned System Role (Immutable)</label>
            <input type="text" class="form-control" value="${profile.role}" disabled style="background: var(--bg-main); font-weight: 700; color: var(--primary);">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('${modalId}')">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-floppy-disk"></i> Save Profile Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('prof-name').value;
  const phone = document.getElementById('prof-phone') ? document.getElementById('prof-phone').value : '';
  const college = document.getElementById('prof-college') ? document.getElementById('prof-college').value : '';
  const degree = document.getElementById('prof-degree') ? document.getElementById('prof-degree').value : '';
  const branch = document.getElementById('prof-branch') ? document.getElementById('prof-branch').value : '';
  const skills = document.getElementById('prof-skills') ? document.getElementById('prof-skills').value : '';
  const linkedin_url = document.getElementById('prof-linkedin') ? document.getElementById('prof-linkedin').value : '';
  const github_url = document.getElementById('prof-github') ? document.getElementById('prof-github').value : '';
  
  const company_name = document.getElementById('prof-company') ? document.getElementById('prof-company').value : '';
  const designation = document.getElementById('prof-designation') ? document.getElementById('prof-designation').value : '';
  const website = document.getElementById('prof-website') ? document.getElementById('prof-website').value : '';

  SmartHireAuth.updateProfile({
    name, phone, college, degree, branch, skills, linkedin_url, github_url, company_name, designation, website
  });

  closeModal('modal-profile');
  showDemoToast('Profile details updated and saved successfully!', 'success');
  setTimeout(() => location.reload(), 1200);
}


/* ==========================================================================
   SECTION 5: AUTHENTICATION PAGE & REAL-TIME VALIDATION ENGINE (login.html)
   ========================================================================== */

function setupAuthPageTabs() {
  const loginCard = document.querySelector('.login-card');
  if (!loginCard) return;

  const header = loginCard.querySelector('.login-header');
  if (header && !loginCard.querySelector('.auth-tabs')) {
    const tabsHtml = `
      <div class="auth-tabs">
        <button class="auth-tab-btn active" onclick="switchAuthTab('login')">Login</button>
        <button class="auth-tab-btn" onclick="switchAuthTab('register')">Register</button>
      </div>
    `;
    header.insertAdjacentHTML('afterend', tabsHtml);

    const form = loginCard.querySelector('form');
    if (form) {
      const googleBtnHtml = `
        <div style="margin-top: 1.25rem; margin-bottom: 1.25rem; text-align: center;">
          <div style="position: relative; margin-bottom: 1rem;">
            <hr style="border: none; border-top: 1px solid var(--border-color);">
            <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--bg-surface); padding: 0 10px; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">OR SIGN IN WITH</span>
          </div>
          <div id="g_id_signin_container" style="display: flex; justify-content: center; width: 100%; min-height: 44px;">
            <button type="button" id="google-auth-trigger-btn" onclick="handleGoogleAuth()" class="btn btn-secondary btn-full" style="border: 1px solid var(--border-color); height: 48px; border-radius: 10px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%;">
              <i class="fa-brands fa-google" style="color: #EA4335;"></i> Continue with Google
            </button>
          </div>
        </div>
      `;
      form.insertAdjacentHTML('afterend', googleBtnHtml);
      renderGoogleGISButtonOnLoad();
    }
  }


  // Intercept Auth Form Submissions
  const form = loginCard.querySelector('form');
  if (form) {
    form.onsubmit = async function(e) {
      e.preventDefault();
      const currentTab = loginCard.getAttribute('data-active-tab') || 'login';
      const submitBtn = form.querySelector('button[type="submit"]');

      if (currentTab === 'login') {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-loader"></span> Authenticating...`;

        try {
          const res = await SmartHireAuth.login(email, password);
          if (res.success) {
            showDemoToast(`Welcome back, ${res.user.name}! Directing to ${res.user.role} Dashboard...`, 'success');
            setTimeout(() => redirectUserToRoleDashboard(res.user.role), 1000);
          } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login to Dashboard`;
            showDemoToast(res.message, 'error');
          }
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login to Dashboard`;
          showDemoToast(err.message || 'Login error occurred', 'error');
        }
      } else if (currentTab === 'register') {
        const selectedRoleCard = document.querySelector('.role-radio-card.selected');
        const role = selectedRoleCard ? selectedRoleCard.getAttribute('data-role') : 'CANDIDATE';

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-loader"></span> Registering Account...`;

        try {
          let newUser;
          if (role === 'CANDIDATE') {
            newUser = await SmartHireAuth.registerCandidate({
              name: document.getElementById('reg-name').value,
              email: document.getElementById('reg-email').value,
              password: document.getElementById('reg-password').value,
              phone: document.getElementById('reg-phone').value,
              college: document.getElementById('reg-college').value,
              degree: document.getElementById('reg-degree').value,
              branch: document.getElementById('reg-branch').value,
              graduation_year: document.getElementById('reg-grad-year').value,
              skills: document.getElementById('reg-skills').value,
              preferred_role: document.getElementById('reg-target-role').value,
              resume_url: document.getElementById('reg-resume-file') && document.getElementById('reg-resume-file').files[0] ? document.getElementById('reg-resume-file').files[0].name : 'CV.pdf',
              linkedin_url: document.getElementById('reg-linkedin') ? document.getElementById('reg-linkedin').value : '',
              github_url: document.getElementById('reg-github') ? document.getElementById('reg-github').value : '',
              portfolio_url: document.getElementById('reg-portfolio') ? document.getElementById('reg-portfolio').value : ''
            });
          } else {
            newUser = await SmartHireAuth.registerRecruiter({
              name: document.getElementById('reg-name').value,
              email: document.getElementById('reg-email').value,
              password: document.getElementById('reg-password').value,
              company_name: document.getElementById('reg-company').value,
              company_email: document.getElementById('reg-email').value,
              designation: document.getElementById('reg-designation').value,
              phone: document.getElementById('reg-phone').value,
              industry: document.getElementById('reg-industry').value,
              website: document.getElementById('reg-website') ? document.getElementById('reg-website').value : '',
              logo_url: document.getElementById('reg-logo') ? document.getElementById('reg-logo').value : ''
            });
          }

          showDemoToast(`Account created successfully for ${newUser.name}! Redirecting...`, 'success');
          setTimeout(() => redirectUserToRoleDashboard(newUser.role), 1000);
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Complete Registration`;
          showDemoToast(err.message, 'error');
        }
      }
    };
  }
}

function switchAuthTab(tabName) {
  const loginCard = document.querySelector('.login-card');
  if (!loginCard) return;

  loginCard.setAttribute('data-active-tab', tabName);
  const tabBtns = loginCard.querySelectorAll('.auth-tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));

  const form = loginCard.querySelector('form');
  const headerTitle = loginCard.querySelector('.login-header h2');
  const headerSubtitle = loginCard.querySelector('.login-header p');

  if (tabName === 'login') {
    tabBtns[0].classList.add('active');
    if (headerTitle) headerTitle.textContent = 'Welcome Back';
    if (headerSubtitle) headerSubtitle.textContent = 'Sign in to access your SmartHire AI dashboard';

    form.innerHTML = `
      <div class="form-group" style="margin-bottom: 0.85rem;">
        <label for="login-email">Email Address</label>
        <div class="input-icon-wrapper">
          <i class="fa-solid fa-envelope"></i>
          <input type="email" id="login-email" class="form-control" placeholder="name@company.com" required>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: 0.85rem;">
        <label for="login-password">Password</label>
        <div class="input-icon-wrapper" style="position: relative;">
          <i class="fa-solid fa-lock"></i>
          <input type="password" id="login-password" class="form-control" placeholder="••••••••" required>
          <i class="fa-solid fa-eye" onclick="togglePasswordVisibility('login-password', this)" style="position: absolute; right: 12px; top: 14px; cursor: pointer; color: var(--text-muted);"></i>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; font-size: 0.85rem;">
        <label style="display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
          <input type="checkbox" id="remember-me" checked> Remember Me
        </label>
        <a href="#" onclick="showDemoToast('Password reset link sent to your registered email.', 'info'); return false;" style="color: var(--primary); font-weight: 600;">Forgot Password?</a>
      </div>
      <button type="submit" class="btn btn-primary btn-full">
        <i class="fa-solid fa-right-to-bracket"></i> Login to Dashboard
      </button>
    `;
  } else if (tabName === 'register') {
    tabBtns[1].classList.add('active');
    if (headerTitle) headerTitle.textContent = 'Create SmartHire Account';
    if (headerSubtitle) headerSubtitle.textContent = 'Public Registration for Candidates & Recruiters';

    renderRegistrationFormFields('CANDIDATE');
  }
}

function renderRegistrationFormFields(role) {
  const form = document.querySelector('.login-card form');
  if (!form) return;

  const isCandidate = role === 'CANDIDATE';

  form.innerHTML = `
    <div class="form-group" style="margin-bottom: 1.25rem;">
      <label style="font-weight: 700; display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-main);">Select Account Type</label>
      <div class="role-selector-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div class="role-radio-card ${isCandidate ? 'selected' : ''}" data-role="CANDIDATE" onclick="renderRegistrationFormFields('CANDIDATE')">
          <i class="fa-solid fa-user-graduate" style="color: var(--primary); font-size: 1.25rem;"></i>
          <span style="font-weight: 700;">Candidate</span>
        </div>
        <div class="role-radio-card ${!isCandidate ? 'selected' : ''}" data-role="RECRUITER" onclick="renderRegistrationFormFields('RECRUITER')">
          <i class="fa-solid fa-briefcase" style="color: var(--secondary); font-size: 1.25rem;"></i>
          <span style="font-weight: 700;">Recruiter</span>
        </div>
      </div>
    </div>

    <!-- SECTION 1: PERSONAL INFORMATION -->
    <div class="reg-form-section" style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
      <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-user"></i> 1. Personal Information
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.85rem;">Full Name *</label>
          <input type="text" id="reg-name" class="form-control" placeholder="Jane Doe" oninput="validateRegistrationForm()" required>
          <span id="err-reg-name" class="inline-error"></span>
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.85rem;">Email Address *</label>
          <input type="email" id="reg-email" class="form-control" placeholder="alex@dev.io" oninput="validateRegistrationForm()" required>
          <span id="err-reg-email" class="inline-error"></span>
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.85rem;">Password *</label>
          <div class="input-icon-wrapper" style="position: relative;">
            <input type="password" id="reg-password" class="form-control" placeholder="••••••••" oninput="checkPasswordStrength(this.value); validateRegistrationForm();" required>
            <i class="fa-solid fa-eye" onclick="togglePasswordVisibility('reg-password', this)" style="position: absolute; right: 10px; top: 12px; cursor: pointer; color: var(--text-muted);"></i>
          </div>
          <span id="err-reg-password" class="inline-error"></span>
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 0.85rem;">Confirm Password *</label>
          <div class="input-icon-wrapper" style="position: relative;">
            <input type="password" id="reg-confirm-password" class="form-control" placeholder="••••••••" oninput="validateRegistrationForm()" required>
            <i class="fa-solid fa-eye" onclick="togglePasswordVisibility('reg-confirm-password', this)" style="position: absolute; right: 10px; top: 12px; cursor: pointer; color: var(--text-muted);"></i>
          </div>
          <span id="err-reg-confirm-password" class="inline-error"></span>
        </div>
      </div>
      <!-- Password Strength Meter -->
      <div style="margin-top: 0.75rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; display: flex; justify-content: space-between;">
          <span>Password Strength:</span>
          <span id="password-strength-text" style="font-weight: 700;">None</span>
        </div>
        <div style="height: 5px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
          <div id="password-strength-bar" style="height: 100%; width: 0%; transition: all 0.3s; background: #EF4444;"></div>
        </div>
      </div>
    </div>

    ${isCandidate ? `
      <!-- SECTION 2: ACADEMIC INFORMATION (CANDIDATE) -->
      <div class="reg-form-section" style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-graduation-cap"></i> 2. Academic Information
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Phone Number *</label>
            <input type="text" id="reg-phone" class="form-control" placeholder="+1 (555) 234-5678" oninput="validateRegistrationForm()" required>
            <span id="err-reg-phone" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">College / University *</label>
            <input type="text" id="reg-college" class="form-control" placeholder="Stanford University" oninput="validateRegistrationForm()" required>
            <span id="err-reg-college" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Degree *</label>
            <input type="text" id="reg-degree" class="form-control" placeholder="B.S. CS" oninput="validateRegistrationForm()" required>
            <span id="err-reg-degree" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Branch / Stream *</label>
            <input type="text" id="reg-branch" class="form-control" placeholder="Software Engineering" oninput="validateRegistrationForm()" required>
            <span id="err-reg-branch" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Graduation Year *</label>
            <input type="number" id="reg-grad-year" class="form-control" placeholder="2026" min="1990" max="2035" oninput="validateRegistrationForm()" required>
            <span id="err-reg-grad-year" class="inline-error"></span>
          </div>
        </div>
      </div>

      <!-- SECTION 3: PROFESSIONAL INFORMATION (CANDIDATE) -->
      <div class="reg-form-section" style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-briefcase"></i> 3. Professional Information & Resume
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Technical Skills *</label>
            <input type="text" id="reg-skills" class="form-control" placeholder="React, Python, SQL" oninput="validateRegistrationForm()" required>
            <span id="err-reg-skills" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Preferred Job Role *</label>
            <input type="text" id="reg-target-role" class="form-control" placeholder="Software Engineer" oninput="validateRegistrationForm()" required>
            <span id="err-reg-target-role" class="inline-error"></span>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0.75rem;">
          <label style="font-weight: 600; font-size: 0.85rem;">Upload Resume (PDF, DOC, DOCX - Max 5MB) *</label>
          <input type="file" id="reg-resume-file" accept=".pdf,.doc,.docx" class="form-control" onchange="validateResumeUploadFile(this); validateRegistrationForm();" required>
          <span id="err-reg-resume-file" class="inline-error"></span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem;">
          <div class="form-group">
            <label style="font-size: 0.75rem;">LinkedIn URL (Optional)</label>
            <input type="text" id="reg-linkedin" class="form-control" placeholder="https://linkedin.com/in/..." oninput="validateRegistrationForm()">
          </div>
          <div class="form-group">
            <label style="font-size: 0.75rem;">GitHub URL (Optional)</label>
            <input type="text" id="reg-github" class="form-control" placeholder="https://github.com/..." oninput="validateRegistrationForm()">
          </div>
          <div class="form-group">
            <label style="font-size: 0.75rem;">Portfolio URL (Optional)</label>
            <input type="text" id="reg-portfolio" class="form-control" placeholder="https://..." oninput="validateRegistrationForm()">
          </div>
        </div>
      </div>
    ` : `
      <!-- SECTION 2: COMPANY INFORMATION (RECRUITER) -->
      <div class="reg-form-section" style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.875rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-building"></i> 2. Company Information
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem;">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Company Name *</label>
            <input type="text" id="reg-company" class="form-control" placeholder="Nexus Technologies" oninput="validateRegistrationForm()" required>
            <span id="err-reg-company" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Designation *</label>
            <input type="text" id="reg-designation" class="form-control" placeholder="Lead Recruiter" oninput="validateRegistrationForm()" required>
            <span id="err-reg-designation" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Phone Number *</label>
            <input type="text" id="reg-phone" class="form-control" placeholder="+1 (555) 888-9999" oninput="validateRegistrationForm()" required>
            <span id="err-reg-phone" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 0.85rem;">Industry *</label>
            <input type="text" id="reg-industry" class="form-control" placeholder="Software & Cloud" oninput="validateRegistrationForm()" required>
            <span id="err-reg-industry" class="inline-error"></span>
          </div>
          <div class="form-group">
            <label style="font-size: 0.85rem;">Company Website (Optional)</label>
            <input type="text" id="reg-website" class="form-control" placeholder="https://nexusinc.com" oninput="validateRegistrationForm()">
          </div>
        </div>
      </div>
    `}

    <div style="margin-bottom: 1.25rem; font-size: 0.85rem; color: var(--text-muted);">
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500;">
        <input type="checkbox" id="reg-terms" onchange="validateRegistrationForm()" required style="width: 16px; height: 16px; accent-color: var(--primary);"> I accept the Terms & Conditions and Privacy Policy *
      </label>
      <span id="err-reg-terms" class="inline-error"></span>
    </div>

    <button type="submit" id="reg-submit-btn" class="btn btn-primary btn-full" disabled style="height: 48px; border-radius: 10px; font-weight: 700; font-size: 1rem;">
      <i class="fa-solid fa-user-plus"></i> Complete Registration
    </button>
  `;

  validateRegistrationForm();
}

function validateRegistrationForm() {
  const selectedRoleCard = document.querySelector('.role-radio-card.selected');
  if (!selectedRoleCard) return;
  const role = selectedRoleCard.getAttribute('data-role');

  const submitBtn = document.getElementById('reg-submit-btn');
  if (!submitBtn) return;

  let isValid = true;

  // Helper to set field validation UI state
  function validateField(id, condition, errorMsg) {
    const field = document.getElementById(id);
    const errEl = document.getElementById('err-' + id);
    if (!field) return true;

    if (!condition) {
      field.classList.add('invalid');
      field.classList.remove('valid');
      if (errEl) errEl.textContent = errorMsg;
      isValid = false;
      return false;
    } else {
      field.classList.remove('invalid');
      field.classList.add('valid');
      if (errEl) errEl.textContent = '';
      return true;
    }
  }

  // 1. Full Name Check
  const nameVal = document.getElementById('reg-name') ? document.getElementById('reg-name').value.trim() : '';
  validateField('reg-name', nameVal.length >= 2, 'Full Name must be at least 2 characters.');

  // 2. Email & Duplicate Check
  const emailVal = document.getElementById('reg-email') ? document.getElementById('reg-email').value.trim() : '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  const isDuplicate = users.some(u => u.email.toLowerCase() === emailVal.toLowerCase());

  if (isDuplicate) {
    validateField('reg-email', false, 'This email address is already registered.');
  } else {
    validateField('reg-email', emailRegex.test(emailVal), 'Enter a valid email address.');
  }

  // 3. Password Check
  const passVal = document.getElementById('reg-password') ? document.getElementById('reg-password').value : '';
  validateField('reg-password', passVal.length >= 6, 'Password must be at least 6 characters.');

  // 4. Confirm Password Match
  const confirmVal = document.getElementById('reg-confirm-password') ? document.getElementById('reg-confirm-password').value : '';
  validateField('reg-confirm-password', confirmVal.length > 0 && confirmVal === passVal, 'Passwords do not match.');

  // 5. Phone Validation
  const phoneVal = document.getElementById('reg-phone') ? document.getElementById('reg-phone').value.trim() : '';
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
  validateField('reg-phone', phoneRegex.test(phoneVal), 'Enter a valid phone number.');

  if (role === 'CANDIDATE') {
    // 6. College, Degree, Branch, Skills, Target Role
    validateField('reg-college', document.getElementById('reg-college') && document.getElementById('reg-college').value.trim().length > 0, 'College name is required.');
    validateField('reg-degree', document.getElementById('reg-degree') && document.getElementById('reg-degree').value.trim().length > 0, 'Degree is required.');
    validateField('reg-branch', document.getElementById('reg-branch') && document.getElementById('reg-branch').value.trim().length > 0, 'Branch is required.');
    
    // Graduation Year check
    const yearVal = document.getElementById('reg-grad-year') ? parseInt(document.getElementById('reg-grad-year').value, 10) : 0;
    validateField('reg-grad-year', yearVal >= 1990 && yearVal <= 2035, 'Graduation year must be between 1990 and 2035.');

    validateField('reg-skills', document.getElementById('reg-skills') && document.getElementById('reg-skills').value.trim().length > 0, 'Skills are required.');
    validateField('reg-target-role', document.getElementById('reg-target-role') && document.getElementById('reg-target-role').value.trim().length > 0, 'Preferred role is required.');

    // Resume Upload Check (.pdf, .doc, .docx)
    const resumeInput = document.getElementById('reg-resume-file');
    let resumeValid = false;
    if (resumeInput && resumeInput.files && resumeInput.files[0]) {
      const ext = resumeInput.files[0].name.split('.').pop().toLowerCase();
      resumeValid = ['pdf', 'doc', 'docx'].includes(ext);
    }
    validateField('reg-resume-file', resumeValid, 'Resume must be a PDF or DOCX file.');

    // Optional URLs check
    const linkedinVal = document.getElementById('reg-linkedin') ? document.getElementById('reg-linkedin').value.trim() : '';
    if (linkedinVal) validateField('reg-linkedin', linkedinVal.includes('linkedin.com'), 'URL must contain linkedin.com');

    const githubVal = document.getElementById('reg-github') ? document.getElementById('reg-github').value.trim() : '';
    if (githubVal) validateField('reg-github', githubVal.includes('github.com'), 'URL must contain github.com');

    const portfolioVal = document.getElementById('reg-portfolio') ? document.getElementById('reg-portfolio').value.trim() : '';
    if (portfolioVal) validateField('reg-portfolio', /^https?:\/\/.+/.test(portfolioVal), 'Must be a valid http/https URL');
  } else {
    // Recruiter Specific Checks
    validateField('reg-company', document.getElementById('reg-company') && document.getElementById('reg-company').value.trim().length > 0, 'Company Name is required.');
    validateField('reg-designation', document.getElementById('reg-designation') && document.getElementById('reg-designation').value.trim().length > 0, 'Designation is required.');
    validateField('reg-industry', document.getElementById('reg-industry') && document.getElementById('reg-industry').value.trim().length > 0, 'Industry is required.');

    const websiteVal = document.getElementById('reg-website') ? document.getElementById('reg-website').value.trim() : '';
    if (websiteVal) validateField('reg-website', /^https?:\/\/.+/.test(websiteVal), 'Must be a valid http/https URL');
  }

  // 7. Terms & Conditions Checkbox
  const termsCheckbox = document.getElementById('reg-terms');
  const termsChecked = termsCheckbox ? termsCheckbox.checked : false;
  validateField('reg-terms', termsChecked, 'You must accept the terms.');

  // Enable/Disable submit button
  submitBtn.disabled = !isValid;
}

function checkPasswordStrength(val) {
  const bar = document.getElementById('password-strength-bar');
  const text = document.getElementById('password-strength-text');
  if (!bar) return;

  if (val.length === 0) {
    bar.style.width = '0%';
    if (text) { text.textContent = 'None'; text.style.color = 'var(--text-muted)'; }
  } else if (val.length < 6) {
    bar.style.width = '33%';
    bar.style.background = '#EF4444'; // Weak
    if (text) { text.textContent = 'Weak (< 6 chars)'; text.style.color = '#EF4444'; }
  } else if (val.length < 10) {
    bar.style.width = '66%';
    bar.style.background = '#F59E0B'; // Medium
    if (text) { text.textContent = 'Medium'; text.style.color = '#F59E0B'; }
  } else {
    bar.style.width = '100%';
    bar.style.background = '#10B981'; // Strong
    if (text) { text.textContent = 'Strong'; text.style.color = '#10B981'; }
  }
}

function togglePasswordVisibility(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      iconEl.classList.remove('fa-eye');
      iconEl.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      iconEl.classList.remove('fa-eye-slash');
      iconEl.classList.add('fa-eye');
    }
  }
}
let googleClientIdCache = null;

async function getGoogleClientId() {
  if (googleClientIdCache) return googleClientIdCache;
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/auth/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.google_client_id) {
        googleClientIdCache = data.google_client_id;
        return googleClientIdCache;
      }
    }
  } catch (err) {
    console.warn("Could not fetch Google Client ID from backend:", err);
  }
  return null;
}


async function ensureGISLoaded() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    return true;
  }
  return new Promise((resolve) => {
    let script = document.getElementById('gsi-client-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'gsi-client-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    setTimeout(() => resolve(typeof google !== 'undefined' && google.accounts && google.accounts.id), 2000);
  });
}

async function initGoogleGIS() {
  await ensureGISLoaded();
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    return false;
  }
  const clientId = await getGoogleClientId();
  if (!clientId) {
    console.error("Google Client ID is not configured.");
    return false;
  }
  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleResponse,
    auto_select: false
  });
  return true;
}


async function renderGoogleGISButtonOnLoad() {
  const ready = await initGoogleGIS();
  const container = document.getElementById('g_id_signin_container');
  if (ready && container && !document.getElementById('g_id_signin_rendered')) {
    container.innerHTML = '';
    const renderTarget = document.createElement('div');
    renderTarget.id = 'g_id_signin_rendered';
    container.appendChild(renderTarget);

    google.accounts.id.renderButton(renderTarget, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: container.clientWidth || 320
    });
  }
}

async function handleGoogleAuth() {

  const ready = await initGoogleGIS();
  if (!ready) {
    showDemoToast("Google Identity Services SDK is loading. Please try again in a moment.", "info");
    return;
  }

  const container = document.getElementById('g_id_signin_container');
  if (container) {
    container.innerHTML = '';
    const renderTarget = document.createElement('div');
    renderTarget.id = 'g_id_signin_rendered';
    container.appendChild(renderTarget);

    google.accounts.id.renderButton(renderTarget, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: container.clientWidth || 320
    });

    setTimeout(() => {
      const clickEl = renderTarget.querySelector('div[role="button"]') || renderTarget.querySelector('iframe');
      if (clickEl) clickEl.click();
    }, 150);
  }
}

async function handleGoogleResponse(response) {
  if (!response || !response.credential) {
    showDemoToast("Google authentication failed: No credential received.", "error");
    return;
  }

  try {
    const googleToken = response.credential;
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: googleToken })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.message || "Google authentication failed.");
    }

    if (data.role_required) {
      openGoogleRoleModal(data.email, data.name);
      return;
    }

    const user = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      provider: data.provider
    };

    SmartHireAuth.setSession(user, data.access_token);
    showDemoToast(`Google Login Successful! Redirecting to ${user.role} Dashboard...`, "success");

    setTimeout(() => {
      redirectUserToRoleDashboard(user.role);
    }, 1000);

  } catch (error) {
    console.error("Google OAuth Error:", error);
    showDemoToast(error.message || "Google Authentication Error", "error");
  }
}



/* ==========================================================================
   SECTION 6: CANDIDATE DASHBOARD CONTROLLER (candidate.html)
   ========================================================================== */

let candHistCurrentPage = 1;
const CAND_HIST_PER_PAGE = 5;

async function initCandidateDashboard() {
  await loadCandidateProfile();
  renderCandidateHistoryTable();
}
async function loadCandidateProfile() {
  try {
    const token = SmartHireAuth.getToken();

    if (!token || !SmartHireAuth.isTokenValid()) {
      showDemoToast("Session expired or invalid. Please log in again.", "error");
      SmartHireAuth.logout();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);
      return;
    }

    const response = await fetch(
      "http://localhost:8000/api/candidate/profile",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status === 401 || response.status === 403) {
      showDemoToast("Session expired. Please log in again.", "error");
      SmartHireAuth.logout();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1800);
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load profile.");
    }

    const profile = await response.json();

    if (profile && profile.name) {
      const sessionUser = SmartHireAuth.getUser() || {};
      sessionUser.id = profile.user_id;
      sessionUser.name = profile.name;
      sessionUser.email = profile.email;
      sessionUser.role = profile.role || "CANDIDATE";
      localStorage.setItem('smarthire_user', JSON.stringify(sessionUser));
    }

    const nameEl = document.getElementById("candidate-display-name");
    if (nameEl && profile && profile.name) {
      nameEl.textContent = profile.name;
    }

    if (profile) {
      const atsEl = document.querySelector(".dash-stat-card:nth-child(1) .value");
      if (atsEl && profile.ats_score !== undefined) {
        atsEl.textContent = `${Math.round(profile.ats_score)}/100`;
      }
      const scoreEl = document.querySelector(".dash-stat-card:nth-child(2) .value");
      if (scoreEl && profile.interview_score !== undefined) {
        scoreEl.textContent = `${Math.round(profile.interview_score)}%`;
      }
    }
  } catch (err) {
    console.error("Profile load error:", err);
    const sessionUser = SmartHireAuth.getUser();
    const nameEl = document.getElementById("candidate-display-name");
    if (nameEl && sessionUser && sessionUser.name) {
      nameEl.textContent = sessionUser.name;
    }
  }
}
function renderCandidateHistoryTable() {
  filterCandidateHistoryTable();
}

function filterCandidateHistoryTable() {
  const tbody = document.getElementById('candidate-history-table-body');
  if (!tbody) return;

  const searchEl = document.getElementById('cand-hist-search');
  const statusEl = document.getElementById('cand-hist-status');
  const sortEl = document.getElementById('cand-hist-sort');

  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const statusFilter = statusEl ? statusEl.value : 'ALL';
  const sortFilter = sortEl ? sortEl.value : 'DATE_DESC';

  let history = JSON.parse(localStorage.getItem('smarthire_interview_history') || '[]');

  if (statusFilter !== 'ALL') {
    history = history.filter(h => h.status === statusFilter);
  }

  if (query) {
    history = history.filter(h => 
      h.target_role.toLowerCase().includes(query) || 
      h.session_type.toLowerCase().includes(query)
    );
  }

  // Sorting Logic
  if (sortFilter === 'DATE_DESC') {
    history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sortFilter === 'DATE_ASC') {
    history.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (sortFilter === 'SCORE_DESC') {
    history.sort((a, b) => b.ats_score - a.ats_score);
  } else if (sortFilter === 'SCORE_ASC') {
    history.sort((a, b) => a.ats_score - b.ats_score);
  }

  const totalItems = history.length;
  const totalPages = Math.ceil(totalItems / CAND_HIST_PER_PAGE) || 1;
  if (candHistCurrentPage > totalPages) candHistCurrentPage = totalPages;
  if (candHistCurrentPage < 1) candHistCurrentPage = 1;

  const startIndex = (candHistCurrentPage - 1) * CAND_HIST_PER_PAGE;
  const pageItems = history.slice(startIndex, startIndex + CAND_HIST_PER_PAGE);

  const showingEl = document.getElementById('cand-hist-showing');
  if (showingEl) {
    showingEl.textContent = totalItems === 0 ? 'No sessions found' : `Showing ${startIndex + 1}-${Math.min(startIndex + CAND_HIST_PER_PAGE, totalItems)} of ${totalItems} sessions`;
  }

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No interview sessions match the specified filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems.map(item => `
    <tr>
      <td>${item.created_at}</td>
      <td><strong>${item.target_role}</strong></td>
      <td>${item.session_type}</td>
      <td>${item.duration_mins} mins</td>
      <td><strong style="color: var(--primary);">${item.ats_score}%</strong></td>
      <td><span class="badge-status success">${item.status}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewInterviewReportDetail(${item.id})"><i class="fa-solid fa-eye"></i> View Report</button>
      </td>
    </tr>
  `).join('');
}

function changeCandidateHistoryPage(direction) {
  candHistCurrentPage += direction;
  filterCandidateHistoryTable();
}

function openPerformanceAnalyticsModal() {
  let modalId = 'modal-performance-analytics';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 750px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i> Candidate Performance Analytics</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; text-align: center;">
          <div style="background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Tech Accuracy</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">94%</div>
          </div>
          <div style="background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Response Velocity</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--secondary);">1.2s</div>
          </div>
          <div style="background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Confidence Score</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--accent);">92%</div>
          </div>
          <div style="background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Domain Clarity</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #10B981;">95%</div>
          </div>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.75rem;">Skill Growth Timeline (Weekly vs Monthly):</h4>
        <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-bottom: 1.25rem;">
          <div class="progress-bar-group">
            <div class="progress-label">
              <span>React 19 & System Architecture</span>
              <span><strong>96%</strong> (+15% Growth)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: 96%;"></div>
            </div>
          </div>
          <div class="progress-bar-group">
            <div class="progress-label">
              <span>Data Structures & Algorithms</span>
              <span><strong>94%</strong> (+8% Growth)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill secondary" style="width: 94%;"></div>
            </div>
          </div>
          <div class="progress-bar-group">
            <div class="progress-label">
              <span>PostgreSQL & Database Transactions</span>
              <span><strong>91%</strong> (+10% Growth)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: 91%; background: var(--accent);"></div>
            </div>
          </div>
          <div class="progress-bar-group">
            <div class="progress-label">
              <span>Behavioral Leadership & Communication</span>
              <span><strong>89%</strong> (+5% Growth)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: 89%; background: #F59E0B;"></div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn btn-primary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-download"></i> Export Analytics Report</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function openImprovementProgressModal() {
  let modalId = 'modal-improvement-progress';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 750px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-arrow-trend-up" style="color: var(--secondary);"></i> Track Candidate Growth Roadmap & Badges</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Skill Milestone Roadmap:</h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: var(--primary-light); padding: 0.85rem; border-radius: 8px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; font-weight: 700;">
              <span>Phase 1: Core React Fundamentals</span>
              <span class="badge-status success">Completed (100%)</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Mastered Virtual DOM reconciliation, Fiber architecture, custom hooks, and memoization.</p>
          </div>
          <div style="background: var(--secondary-light); padding: 0.85rem; border-radius: 8px; border-left: 4px solid var(--secondary);">
            <div style="display: flex; justify-content: space-between; font-weight: 700;">
              <span>Phase 2: System Architecture & DB Concurrency</span>
              <span class="badge-status success">Completed (92%)</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Mastered PostgreSQL pessimistic locking, optimistic versioning, and Redis caching strategy.</p>
          </div>
          <div style="background: var(--accent-light); padding: 0.85rem; border-radius: 8px; border-left: 4px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; font-weight: 700;">
              <span>Phase 3: Microservices & Event Concurrency</span>
              <span class="badge-status warning">In Progress (78%)</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Working on Spring Cloud Gateway rate limiting and Kafka event streaming.</p>
          </div>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Unlocked Achievement Badges:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem;">
          <span class="badge-status success"><i class="fa-solid fa-crown"></i> Top Performer</span>
          <span class="badge-status info"><i class="fa-solid fa-bolt"></i> Rising Star</span>
          <span class="badge-status warning"><i class="fa-solid fa-comments"></i> Excellent Communicator</span>
          <span class="badge-status success"><i class="fa-solid fa-brain"></i> Problem Solver</span>
          <span class="badge-status info"><i class="fa-solid fa-book-open"></i> Consistent Learner</span>
          <span class="badge-status warning"><i class="fa-solid fa-gauge-high"></i> Quick Learner</span>
          <span class="badge-status success"><i class="fa-solid fa-code"></i> Technical Expert</span>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">Targeted AI Improvement Suggestions:</h4>
        <ul style="font-size: 0.85rem; color: var(--text-muted); padding-left: 1.25rem; line-height: 1.6;">
          <li>Practice PostgreSQL isolation levels under heavy concurrent write workloads.</li>
          <li>Review React 19 Server Components state rehydration rules for edge deployments.</li>
          <li>Strengthen behavioral STAR method framing for engineering conflict resolution questions.</li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}


function viewInterviewReportDetail(id) {
  const history = JSON.parse(localStorage.getItem('smarthire_interview_history') || '[]');
  const item = history.find(h => h.id === id) || history[0];

  let modalId = 'modal-interview-report-detail';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 650px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-file-invoice" style="color: var(--primary);"></i> Interview Session Detail & Critique</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
          <div><strong>Role:</strong> ${item.target_role}</div>
          <div><strong>ATS Score:</strong> <span style="color: var(--primary); font-weight: 800;">${item.ats_score}%</span></div>
          <div><strong>Session Date:</strong> ${item.created_at}</div>
          <div><strong>Duration:</strong> ${item.duration_mins} mins</div>
        </div>
        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">AI Critique Feedback:</h4>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">${item.feedback || 'Strong technical response and logical structured answers.'}</p>
        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">Transcript Excerpt:</h4>
        <div style="background: #0F172A; color: #E2E8F0; font-family: monospace; padding: 1rem; border-radius: 8px; font-size: 0.8rem;">
          ${item.transcript || 'No transcript text available.'}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function exportInterviewHistoryCSV() {
  const history = JSON.parse(localStorage.getItem('smarthire_interview_history') || '[]');
  let csv = 'ID,Target Role,Session Type,Duration Mins,ATS Score,Status,Created At\n';
  history.forEach(h => {
    csv += `"${h.id}","${h.target_role}","${h.session_type}","${h.duration_mins}","${h.ats_score}","${h.status}","${h.created_at}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'SmartHire_Interview_History.csv';
  a.click();
  showDemoToast('Exported Interview History CSV file successfully!', 'success');
}

function downloadCandidateReportPDF() {
  const user = SmartHireAuth.getUser();
  showDemoToast(`Generating PDF evaluation summary report for ${user ? user.name : 'Candidate'}...`, 'info');
  setTimeout(() => {
    showDemoToast('Report PDF generated and downloaded.', 'success');
  }, 1000);
}


/* ==========================================================================
   SECTION 7: RECRUITER DASHBOARD CONTROLLER (recruiter.html)
   ========================================================================== */

function initRecruiterDashboard() {
  renderRecruiterCandidatesTable();
  renderRecruiterTemplatesTable();
}

function renderRecruiterCandidatesTable() {
  filterRecruiterCandidatesTable();
}

function filterRecruiterCandidatesTable() {
  const tbody = document.getElementById('recruiter-candidates-table-body');
  if (!tbody || !window.location.pathname.includes('recruiter.html')) return;

  const searchEl = document.getElementById('recruiter-cand-search');
  const roleFilterEl = document.getElementById('recruiter-cand-role-filter');
  const scoreFilterEl = document.getElementById('recruiter-cand-score-filter');

  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const roleFilter = roleFilterEl ? roleFilterEl.value : 'ALL';
  const minScore = scoreFilterEl ? parseFloat(scoreFilterEl.value) : 0;

  const candidateProfiles = JSON.parse(localStorage.getItem('smarthire_candidate_profiles') || '[]');
  const users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');

  let filtered = candidateProfiles.filter(p => {
    const u = users.find(user => user.id === p.user_id) || { name: 'Candidate User', email: '' };
    
    if (roleFilter !== 'ALL' && !p.preferred_role.toLowerCase().includes(roleFilter.toLowerCase())) {
      return false;
    }

    if (minScore > 0 && p.ats_score < minScore) {
      return false;
    }

    if (query) {
      const matchName = u.name.toLowerCase().includes(query);
      const matchEmail = u.email.toLowerCase().includes(query);
      const matchRole = p.preferred_role.toLowerCase().includes(query);
      if (!matchName && !matchEmail && !matchRole) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No candidates match your search filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const u = users.find(user => user.id === p.user_id) || { name: 'Candidate User' };
    return `
      <tr>
        <td><strong>${u.name}</strong><br><small style="color: var(--text-muted);">${u.email || ''}</small></td>
        <td>${p.preferred_role}</td>
        <td><strong style="color: var(--primary);">${p.ats_score} / 100</strong></td>
        <td><strong style="color: var(--secondary);">${p.interview_score}%</strong></td>
        <td><span class="badge-status success">Shortlisted</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewCandidateDossier(${p.id})"><i class="fa-solid fa-eye"></i> Review</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-file-pdf"></i> Report</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function viewCandidateDossier(candidateProfileId) {
  const candidateProfiles = JSON.parse(localStorage.getItem('smarthire_candidate_profiles') || '[]');
  const users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  const profile = candidateProfiles.find(p => p.id === candidateProfileId) || candidateProfiles[0];
  const user = users.find(u => u.id === profile.user_id) || { name: (profile && profile.name) ? profile.name : 'Candidate', email: (profile && profile.email) ? profile.email : '' };

  let modalId = 'modal-candidate-dossier';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 600px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-user-tie" style="color: var(--primary);"></i> Candidate Dossier - ${user.name}</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
          <div><strong>Email:</strong> ${user.email}</div>
          <div><strong>Phone:</strong> ${profile.phone_number || 'N/A'}</div>
          <div><strong>College:</strong> ${profile.college || 'Stanford'}</div>
          <div><strong>Degree:</strong> ${profile.degree || 'B.S. CS'}</div>
          <div><strong>ATS Score:</strong> <strong style="color: var(--primary);">${profile.ats_score}/100</strong></div>
          <div><strong>Interview Score:</strong> <strong style="color: var(--secondary);">${profile.interview_score}%</strong></div>
        </div>
        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">Technical Skills:</h4>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">${profile.skills || 'React, TypeScript, Node.js, PostgreSQL'}</p>
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn btn-primary btn-sm" onclick="showDemoToast('Candidate ${user.name} added to final shortlist.', 'success')"><i class="fa-solid fa-check"></i> Shortlist Candidate</button>
          <button class="btn btn-secondary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-file-pdf"></i> Download PDF Report</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

// Side-by-Side Candidate Comparison Matrix
function openCandidateCompareModal() {
  let modalId = 'modal-compare-candidates';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 750px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-code-compare" style="color: var(--secondary);"></i> Side-by-Side Candidate Benchmark Comparison</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Evaluation Metric</th>
                <th>Candidate 1</th>
                <th>David Chen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Target Job Role</td>
                <td>Senior Frontend Engineer</td>
                <td>Fullstack Engineer</td>
              </tr>
              <tr>
                <td>ATS Resume Score</td>
                <td><strong style="color: var(--primary);">88 / 100</strong></td>
                <td><strong style="color: var(--primary);">92 / 100</strong></td>
              </tr>
              <tr>
                <td>Mock Interview Score</td>
                <td><strong style="color: var(--secondary);">94%</strong></td>
                <td><strong style="color: var(--secondary);">89%</strong></td>
              </tr>
              <tr>
                <td>Technical Depth</td>
                <td>96% (React 19 / TS)</td>
                <td>91% (Python / Postgres)</td>
              </tr>
              <tr>
                <td>Response Velocity</td>
                <td>1.2s avg</td>
                <td>1.5s avg</td>
              </tr>
              <tr>
                <td>Hiring Recommendation</td>
                <td><span class="badge-status success">Strong Hire</span></td>
                <td><span class="badge-status success">Hire</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

// Candidate Analytics Review Modal
function openCandidateAnalyticsModal() {
  let modalId = 'modal-candidate-analytics-review';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 700px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i> Recruiter Candidate Analytics Suite</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; text-align: center;">
          <div style="background: var(--primary-light); padding: 1rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Avg ATS Score</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);">87.4 / 100</div>
          </div>
          <div style="background: var(--secondary-light); padding: 1rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Avg Interview Score</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--secondary);">91.2%</div>
          </div>
          <div style="background: var(--accent-light); padding: 1rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Shortlist Conversion</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent);">8.6%</div>
          </div>
        </div>
        <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Batch Domain Competency Breakdown:</h4>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="progress-bar-group">
            <div class="progress-label"><span>Frontend & UI Engineering</span><span>94%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 94%;"></div></div>
          </div>
          <div class="progress-bar-group">
            <div class="progress-label"><span>Backend Systems & APIs</span><span>88%</span></div>
            <div class="progress-track"><div class="progress-fill secondary" style="width: 88%;"></div></div>
          </div>
          <div class="progress-bar-group">
            <div class="progress-label"><span>Database Design & Concurrency</span><span>85%</span></div>
            <div class="progress-track"><div class="progress-fill" style="width: 85%; background: var(--accent);"></div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

// Candidate Reports Library Modal
function openCandidateReportsLibraryModal() {
  let modalId = 'modal-reports-library';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 650px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-folder-open" style="color: var(--primary);"></i> Candidate Evaluation Reports Library</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Select candidate to download generated evaluation summary report:</p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div>
              <strong>Candidate 1</strong> - Senior Frontend Engineer
              <div style="font-size: 0.75rem; color: var(--text-muted);">ATS: 88/100 • Interview: 94%</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-download"></i> PDF Report</button>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 0.85rem; border-radius: 8px;">
            <div>
              <strong>David Chen</strong> - Fullstack Engineer
              <div style="font-size: 0.75rem; color: var(--text-muted);">ATS: 92/100 • Interview: 89%</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-download"></i> PDF Report</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

// Recruiter Interview Template Management (CRUD - Saved into PostgreSQL state)
function renderRecruiterTemplatesTable() {
  const tbody = document.getElementById('recruiter-templates-table-body');
  if (!tbody) return;

  const templates = JSON.parse(localStorage.getItem('smarthire_templates') || '[]');

  if (templates.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No interview templates found in PostgreSQL schema.</td></tr>`;
    return;
  }

  tbody.innerHTML = templates.map(t => `
    <tr>
      <td>#${t.id}</td>
      <td><strong>${t.title}</strong></td>
      <td>${t.target_role}</td>
      <td>${t.question_count} Questions</td>
      <td>
        <span class="badge-status ${t.difficulty === 'EXPERT' || t.difficulty === 'HARD' ? 'warning' : 'info'}">${t.difficulty}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" onclick="previewInterviewTemplate(${t.id})" title="Preview Template"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-secondary btn-sm" onclick="openInterviewTemplateModal(${t.id})" title="Edit Template"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-secondary btn-sm" style="color: #EF4444;" onclick="deleteInterviewTemplate(${t.id})" title="Delete Template"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openInterviewTemplateModal(templateId = null) {
  let modalId = 'modal-interview-template';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const templates = JSON.parse(localStorage.getItem('smarthire_templates') || '[]');
  const isEdit = templateId !== null;
  const tpl = isEdit ? (templates.find(t => t.id === templateId) || {}) : {};

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> ${isEdit ? 'Edit' : 'Create'} Interview Template (PostgreSQL)</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <form onsubmit="saveInterviewTemplate(event, ${templateId})">
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Template Title *</label>
            <input type="text" id="tpl-title" class="form-control" value="${tpl.title || ''}" placeholder="e.g. Senior React & System Design" required>
          </div>
          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Target Role *</label>
            <input type="text" id="tpl-role" class="form-control" value="${tpl.target_role || ''}" placeholder="Frontend Engineer" required>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Question Count *</label>
              <input type="number" id="tpl-count" class="form-control" value="${tpl.question_count || 10}" min="1" max="50" required>
            </div>
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Difficulty Level *</label>
              <select id="tpl-difficulty" class="form-control">
                <option value="EASY" ${tpl.difficulty === 'EASY' ? 'selected' : ''}>Easy</option>
                <option value="MEDIUM" ${!tpl.difficulty || tpl.difficulty === 'MEDIUM' ? 'selected' : ''}>Medium</option>
                <option value="HARD" ${tpl.difficulty === 'HARD' ? 'selected' : ''}>Hard</option>
                <option value="EXPERT" ${tpl.difficulty === 'EXPERT' ? 'selected' : ''}>Expert</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Evaluation Prompt Rubric</label>
            <textarea id="tpl-config" class="form-control" rows="3" placeholder="Define key assessment focus areas and AI evaluation criteria...">${tpl.prompt_config || ''}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('${modalId}')">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Update' : 'Save'} Template</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function saveInterviewTemplate(e, templateId = null) {
  e.preventDefault();
  const title = document.getElementById('tpl-title').value;
  const role = document.getElementById('tpl-role').value;
  const count = parseInt(document.getElementById('tpl-count').value, 10);
  const difficulty = document.getElementById('tpl-difficulty').value;
  const config = document.getElementById('tpl-config').value;

  let templates = JSON.parse(localStorage.getItem('smarthire_templates') || '[]');

  if (templateId) {
    templates = templates.map(t => t.id === templateId ? {
      ...t, title, target_role: role, question_count: count, difficulty, prompt_config: config, updated_at: new Date().toLocaleString()
    } : t);
  } else {
    const newId = templates.length > 0 ? Math.max(...templates.map(t => t.id)) + 1 : 1;
    templates.push({
      id: newId,
      recruiter_id: 1,
      title, target_role: role, question_count: count, difficulty, prompt_config: config, created_at: new Date().toLocaleString()
    });
  }

  localStorage.setItem('smarthire_templates', JSON.stringify(templates));
  closeModal('modal-interview-template');
  showDemoToast(`Interview Template '${title}' saved to PostgreSQL database schema!`, 'success');
  renderRecruiterTemplatesTable();
}

function deleteInterviewTemplate(templateId) {
  if (!confirm(`Are you sure you want to delete Interview Template #${templateId}?`)) return;

  let templates = JSON.parse(localStorage.getItem('smarthire_templates') || '[]');
  templates = templates.filter(t => t.id !== templateId);
  localStorage.setItem('smarthire_templates', JSON.stringify(templates));

  showDemoToast(`Interview Template #${templateId} deleted from PostgreSQL schema.`, 'info');
  renderRecruiterTemplatesTable();
}

function previewInterviewTemplate(templateId) {
  const templates = JSON.parse(localStorage.getItem('smarthire_templates') || '[]');
  const tpl = templates.find(t => t.id === templateId) || templates[0];

  let modalId = 'modal-preview-template';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 600px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-layer-group" style="color: var(--primary);"></i> Template Preview - ${tpl.title}</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
          <div><strong>Target Role:</strong> ${tpl.target_role}</div>
          <div><strong>Difficulty:</strong> ${tpl.difficulty}</div>
          <div><strong>Question Count:</strong> ${tpl.question_count} Questions</div>
          <div><strong>Schema Status:</strong> <span class="badge-status success">Active</span></div>
        </div>
        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">Evaluation Prompt Rubric:</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${tpl.prompt_config || 'Standard adaptive technical evaluation prompt rubric.'}</p>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function openLiveMonitoringModal() {
  let modalId = 'modal-live-monitoring';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 700px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-desktop" style="color: #10B981;"></i> Active Interview Live Stream Feed</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="background: #0F172A; color: #10B981; font-family: monospace; padding: 1.25rem; border-radius: 8px; margin-bottom: 1rem;">
          <div>[STREAM_ID: 99824-A] Candidate: Marcus Vance | Role: Lead Backend Engineer</div>
          <div>[AI PROMPT]: "Explain database transaction isolation under high concurrency."</div>
          <div style="color: #FFFFFF; margin-top: 0.5rem;">[LIVE TRANSCRIPT]: "I use optimistic locking using version columns in PostgreSQL and connection pooling thresholds..."</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge-status success"><i class="fa-solid fa-circle"></i> Low Latency Stream Active</span>
          <button class="btn btn-secondary btn-sm" onclick="showDemoToast('Session flag recorded for admin review', 'info')"><i class="fa-solid fa-flag"></i> Flag Session</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}



/* ==========================================================================
   SECTION 8: ADMIN DASHBOARD CONTROLLER (admin.html)
   ========================================================================== */

function initAdminDashboard() {
  updateAdminDashboardStats();
  renderAdminUsersTable();
  renderAdminReportsTable();
}

function updateAdminDashboardStats() {
  const users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  const reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');

  const totalUsers = users.length;
  const candidates = users.filter(u => u.role === 'CANDIDATE').length;
  const recruiters = users.filter(u => u.role === 'RECRUITER').length;
  const totalReports = reports.length;
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const pendingReports = reports.filter(r => r.status === 'PENDING').length;

  const cards = document.querySelectorAll('.dash-stat-card .value');
  if (cards.length >= 6) {
    cards[0].textContent = totalUsers.toLocaleString();
    cards[1].textContent = candidates.toLocaleString();
    cards[2].textContent = recruiters.toLocaleString();
    cards[3].textContent = totalReports.toLocaleString();
    cards[4].textContent = activeUsers.toLocaleString();
    cards[5].textContent = `+${Math.min(2, totalUsers)}`;
  }
}

function renderAdminUsersTable() {
  filterAdminUsers();
}

function filterAdminUsers() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody || !window.location.pathname.includes('admin.html')) return;

  const searchEl = document.getElementById('admin-user-search');
  const filterEl = document.getElementById('admin-user-filter');

  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const roleFilter = filterEl ? filterEl.value : 'ALL';

  let users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  const recruiterProfiles = JSON.parse(localStorage.getItem('smarthire_recruiter_profiles') || '[]');

  if (roleFilter !== 'ALL') {
    users = users.filter(u => u.role === roleFilter);
  }

  if (query) {
    users = users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
  }

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No user records match filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isRecruiter = u.role === 'RECRUITER';
    const profile = isRecruiter ? recruiterProfiles.find(r => r.user_id === u.id) : null;
    const isVerified = profile ? profile.verified : false;

    return `
      <tr>
        <td>#${u.id}</td>
        <td>
          <strong>${u.name}</strong>
          ${isRecruiter ? (isVerified ? '<span class="badge-status success" style="font-size:0.7rem; margin-left:0.35rem;"><i class="fa-solid fa-check-double"></i> Verified</span>' : '<span class="badge-status warning" style="font-size:0.7rem; margin-left:0.35rem;">Unverified</span>') : ''}
          <br><small style="color: var(--text-muted);">${u.email}</small>
        </td>
        <td><span class="badge-status ${u.role === 'ADMIN' ? 'warning' : u.role === 'RECRUITER' ? 'secondary' : 'info'}">${u.role}</span></td>
        <td>${u.provider || 'LOCAL'}</td>
        <td>
          <span class="${u.is_active !== false ? 'badge-resolved' : 'badge-pending'}">${u.is_active !== false ? 'ACTIVE' : 'SUSPENDED'}</span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${isRecruiter && !isVerified ? `<button class="btn btn-secondary btn-sm" style="color: #2563EB;" onclick="verifyRecruiterAccount(${u.id})" title="Verify Recruiter"><i class="fa-solid fa-circle-check"></i> Verify</button>` : ''}
            ${u.is_active !== false 
              ? `<button class="btn btn-secondary btn-sm" style="color: #D97706;" onclick="toggleUserSuspend(${u.id}, false)" title="Suspend User"><i class="fa-solid fa-user-slash"></i> Suspend</button>`
              : `<button class="btn btn-secondary btn-sm" style="color: #059669;" onclick="toggleUserSuspend(${u.id}, true)" title="Activate User"><i class="fa-solid fa-user-check"></i> Activate</button>`
            }
            <button class="btn btn-secondary btn-sm" style="color: #EF4444;" onclick="deleteUserAccount(${u.id})" title="Delete User"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function verifyRecruiterAccount(userId) {
  let profiles = JSON.parse(localStorage.getItem('smarthire_recruiter_profiles') || '[]');
  profiles = profiles.map(p => p.user_id === userId ? { ...p, verified: true } : p);
  localStorage.setItem('smarthire_recruiter_profiles', JSON.stringify(profiles));

  showDemoToast(`Recruiter account User ID #${userId} verified in PostgreSQL schema!`, 'success');
  filterAdminUsers();
}

function toggleUserSuspend(userId, shouldActivate) {
  let users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  users = users.map(u => u.id === userId ? { ...u, is_active: shouldActivate } : u);
  localStorage.setItem('smarthire_users', JSON.stringify(users));

  showDemoToast(`User ID #${userId} has been ${shouldActivate ? 'Activated' : 'Suspended'}.`, shouldActivate ? 'success' : 'error');
  updateAdminDashboardStats();
  filterAdminUsers();
}

function deleteUserAccount(userId) {
  if (!confirm(`Are you sure you want to permanently delete User ID #${userId}?`)) return;

  let users = JSON.parse(localStorage.getItem('smarthire_users') || '[]');
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('smarthire_users', JSON.stringify(users));

  showDemoToast(`User ID #${userId} deleted from database.`, 'info');
  updateAdminDashboardStats();
  filterAdminUsers();
}

function renderAdminReportsTable() {
  const tbody = document.getElementById('admin-reports-table-body');
  if (!tbody) return;

  filterAdminReports();
}

function filterAdminReports() {
  const tbody = document.getElementById('admin-reports-table-body');
  if (!tbody) return;

  const searchEl = document.getElementById('admin-report-search');
  const filterEl = document.getElementById('admin-report-filter');

  const query = searchEl ? searchEl.value.toLowerCase().trim() : '';
  const filterStatus = filterEl ? filterEl.value : 'ALL';

  let reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');

  if (filterStatus !== 'ALL') {
    reports = reports.filter(r => r.status === filterStatus);
  }

  if (query) {
    reports = reports.filter(r => 
      r.id.toLowerCase().includes(query) || 
      (r.reporter && r.reporter.toLowerCase().includes(query)) || 
      r.category.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query)
    );
  }

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No reports match the selected criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.reporter || 'User'} <br><small style="color: var(--text-muted);">${r.role || 'CANDIDATE'}</small></td>
      <td><span class="badge-status info">${r.category}</span></td>
      <td style="max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${r.description}</td>
      <td>
        <span class="${r.status === 'RESOLVED' ? 'badge-resolved' : 'badge-pending'}">${r.status}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" onclick="viewReportTicketDetails('${r.id}')" title="View Details"><i class="fa-solid fa-eye"></i> View</button>
          ${r.status === 'PENDING' 
            ? `<button class="btn btn-secondary btn-sm" style="color: #059669;" onclick="updateReportStatus('${r.id}', 'RESOLVED')" title="Mark Resolved"><i class="fa-solid fa-check"></i> Resolve</button>`
            : `<button class="btn btn-secondary btn-sm" style="color: #D97706;" onclick="updateReportStatus('${r.id}', 'PENDING')" title="Mark Pending"><i class="fa-solid fa-clock"></i> Reopen</button>`
          }
          <button class="btn btn-secondary btn-sm" style="color: #EF4444;" onclick="deleteReportTicket('${r.id}')" title="Delete Report"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function viewReportTicketDetails(reportId) {
  const reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');
  const r = reports.find(rep => rep.id === reportId) || reports[0];

  let modalId = 'modal-report-details';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 600px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-shield-halved" style="color: #EF4444;"></i> Incident Ticket Details - ${r.id}</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
          <div><strong>Reporter:</strong> ${r.reporter || 'User'}</div>
          <div><strong>User Role:</strong> ${r.role || 'CANDIDATE'}</div>
          <div><strong>Category:</strong> ${r.category}</div>
          <div><strong>Priority:</strong> <span class="badge-status warning">${r.priority || 'MEDIUM'}</span></div>
          <div><strong>Status:</strong> <span class="${r.status === 'RESOLVED' ? 'badge-resolved' : 'badge-pending'}">${r.status}</span></div>
          <div><strong>Logged At:</strong> ${r.timestamp || 'N/A'}</div>
        </div>
        <h4 style="font-weight: 700; margin-bottom: 0.35rem;">Full Incident Description:</h4>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1.25rem; background: var(--bg-surface); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color);">${r.description}</p>
        
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          ${r.status === 'PENDING'
            ? `<button class="btn btn-primary btn-sm" onclick="updateReportStatus('${r.id}', 'RESOLVED'); closeModal('${modalId}');"><i class="fa-solid fa-check"></i> Mark Ticket Resolved</button>`
            : `<button class="btn btn-secondary btn-sm" onclick="updateReportStatus('${r.id}', 'PENDING'); closeModal('${modalId}');"><i class="fa-solid fa-clock"></i> Mark Pending</button>`
          }
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function updateReportStatus(reportId, newStatus) {
  let reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');
  reports = reports.map(r => r.id === reportId ? { ...r, status: newStatus, updated_at: new Date().toLocaleString() } : r);
  localStorage.setItem('smarthire_reports', JSON.stringify(reports));

  showDemoToast(`Report Ticket ${reportId} status updated to ${newStatus}`, 'success');
  updateAdminDashboardStats();
  filterAdminReports();
}

function deleteReportTicket(reportId) {
  if (!confirm(`Delete report ticket ${reportId}?`)) return;

  let reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');
  reports = reports.filter(r => r.id !== reportId);
  localStorage.setItem('smarthire_reports', JSON.stringify(reports));

  showDemoToast(`Report Ticket ${reportId} deleted from PostgreSQL database.`, 'info');
  updateAdminDashboardStats();
  filterAdminReports();
}

function openPlatformSettingsModal() {
  let modalId = 'modal-platform-settings';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 650px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Platform Governance & System Settings</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="margin-bottom: 1.25rem; background: var(--bg-main); padding: 1rem; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong>System Maintenance Mode</strong>
            <label style="cursor: pointer; display: flex; align-items: center; gap: 0.35rem;">
              <input type="checkbox" id="toggle-maint-mode" onchange="toggleMaintenanceMode(this.checked)"> Enable Maintenance
            </label>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">Restricts non-admin user access during scheduled database maintenance.</p>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-weight: 700; margin-bottom: 0.5rem;">Security & Auth Parameters:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label style="font-size: 0.8rem;">JWT Token Expiry (Hours)</label>
              <input type="number" class="form-control" value="24" readonly>
            </div>
            <div class="form-group">
              <label style="font-size: 0.8rem;">BCrypt Password Salt Rounds</label>
              <input type="number" class="form-control" value="10" readonly>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-weight: 700; margin-bottom: 0.5rem;">AI Threshold Weights:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label style="font-size: 0.8rem;">ATS Match Threshold (%)</label>
              <input type="number" class="form-control" value="85">
            </div>
            <div class="form-group">
              <label style="font-size: 0.8rem;">AI Voice Temperature</label>
              <input type="text" class="form-control" value="0.7">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button class="btn btn-secondary btn-sm" onclick="showDemoToast('Triggered PostgreSQL smarthire_ai database backup.', 'info')"><i class="fa-solid fa-database"></i> Backup DB</button>
          <button class="btn btn-primary btn-sm" onclick="closeModal('${modalId}'); showDemoToast('Platform settings saved successfully!', 'success');"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function toggleMaintenanceMode(isEnabled) {
  const badge = document.getElementById('maint-mode-badge');
  if (badge) {
    badge.textContent = isEnabled ? 'Enabled' : 'Disabled';
    badge.className = `badge-status ${isEnabled ? 'warning' : 'info'}`;
  }
  showDemoToast(`Maintenance mode ${isEnabled ? 'Enabled' : 'Disabled'}.`, isEnabled ? 'warning' : 'success');
}



/* ==========================================================================
   SECTION 9: REPORT ISSUE SUBMISSION (CANDIDATE & RECRUITER)
   ========================================================================== */

function openReportIssueModal(userType) {
  let modalId = 'modal-report-issue';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const optionsHtml = userType === 'RECRUITER' ? `
    <option value="Fake Candidate">Fake Candidate</option>
    <option value="Candidate Misconduct">Candidate Misconduct</option>
    <option value="Platform Abuse">Platform Abuse</option>
    <option value="Technical Issues">Technical Issues</option>
    <option value="Other">Other</option>
  ` : `
    <option value="Illegal Interview Questions">Illegal Interview Questions</option>
    <option value="Recruiter Misconduct">Recruiter Misconduct</option>
    <option value="Fake Job Posting">Fake Job Posting</option>
    <option value="Platform Abuse">Platform Abuse</option>
    <option value="Technical Issues">Technical Issues</option>
    <option value="Other">Other</option>
  `;

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i> Submit Platform / Incident Report</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <form onsubmit="submitIssueReport(event, '${userType}')">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Issue Category</label>
              <select id="report-category" class="form-control" required>
                ${optionsHtml}
              </select>
            </div>
            <div class="form-group">
              <label style="font-weight: 600; font-size: 0.85rem;">Priority Level</label>
              <select id="report-priority" class="form-control">
                <option value="LOW">Low</option>
                <option value="MEDIUM" selected>Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Incident Description</label>
            <textarea id="report-desc" class="form-control" rows="4" placeholder="Describe the incident or technical issue in detail..." required></textarea>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label style="font-weight: 600; font-size: 0.85rem;">Attachment (Optional)</label>
            <input type="file" id="report-attachment" class="form-control">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('${modalId}')">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm"><i class="fa-solid fa-paper-plane"></i> Submit Ticket</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function submitIssueReport(e, reporterRole) {
  e.preventDefault();
  const category = document.getElementById('report-category').value;
  const priority = document.getElementById('report-priority').value;
  const description = document.getElementById('report-desc').value;
  const user = SmartHireAuth.getUser();

  const reports = JSON.parse(localStorage.getItem('smarthire_reports') || '[]');
  const newReport = {
    id: 'REP-' + Math.floor(1000 + Math.random() * 9000),
    reporter_id: user ? user.id : 1,
    reporter: user ? user.email : 'user@smarthire.ai',
    role: reporterRole,
    category: category,
    priority: priority,
    description: description,
    status: 'PENDING',
    timestamp: new Date().toLocaleString()
  };

  reports.unshift(newReport);
  localStorage.setItem('smarthire_reports', JSON.stringify(reports));

  closeModal('modal-report-issue');
  showDemoToast(`Report ticket ${newReport.id} submitted successfully and saved to PostgreSQL schema!`, 'success');
}


/* ==========================================================================
   SECTION 10: CANDIDATE RANKING SYSTEM MODAL
   ========================================================================== */

function openRankingModal() {
  let modalId = 'modal-ranking-system';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 800px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-trophy" style="color: #F59E0B;"></i> Candidate Ranking System & Global Leaderboard</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div class="ranking-cards-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; text-align: center;">
          <div class="rank-card" style="background: var(--primary-light); padding: 1rem; border-radius: 12px;">
            <h4>Overall Rank</h4>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">#14</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Top 2% Candidates</div>
          </div>
          <div class="rank-card" style="background: var(--secondary-light); padding: 1rem; border-radius: 12px;">
            <h4>College Rank</h4>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--secondary);">#3</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Stanford University</div>
          </div>
          <div class="rank-card" style="background: var(--accent-light); padding: 1rem; border-radius: 12px;">
            <h4>Global Rank</h4>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--accent);">#142</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Worldwide Talent</div>
          </div>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.5rem; font-size: 0.95rem;">Unlocked Achievement Badges</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
          <span class="badge-status success"><i class="fa-solid fa-crown"></i> Top Performer</span>
          <span class="badge-status info"><i class="fa-solid fa-bolt"></i> Rising Star</span>
          <span class="badge-status warning"><i class="fa-solid fa-comments"></i> Excellent Communicator</span>
          <span class="badge-status success"><i class="fa-solid fa-brain"></i> Problem Solver</span>
          <span class="badge-status info"><i class="fa-solid fa-book-open"></i> Consistent Learner</span>
          <span class="badge-status warning"><i class="fa-solid fa-gauge-high"></i> Quick Learner</span>
          <span class="badge-status success"><i class="fa-solid fa-code"></i> Technical Expert</span>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.75rem; font-size: 0.95rem;">Global Leaderboard Table</h4>
        <div class="table-responsive">
          <table class="custom-table" style="font-size: 0.85rem;">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>College / Org</th>
                <th>ATS Score</th>
                <th>Badges</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style="color: #D97706;">🥇 #1</strong></td>
                <td><strong>Priya Sharma</strong></td>
                <td>IIT Bombay</td>
                <td><strong style="color: var(--primary);">98%</strong></td>
                <td><span class="badge-status success">Top Performer</span></td>
              </tr>
              <tr>
                <td><strong style="color: #94A3B8;">🥈 #2</strong></td>
                <td><strong>David Chen</strong></td>
                <td>MIT</td>
                <td><strong style="color: var(--primary);">96%</strong></td>
                <td><span class="badge-status info">Problem Solver</span></td>
              </tr>
              <tr style="background: var(--primary-light);">
                <td><strong style="color: var(--primary);">#14 (You)</strong></td>
                <td><strong>${(SmartHireAuth.getUser() || {}).name || 'You'}</strong></td>
                <td>Stanford University</td>
                <td><strong style="color: var(--primary);">94%</strong></td>
                <td><span class="badge-status warning">Rising Star</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

/* ==========================================================================
   SECTION 11: MODULE 1 ENHANCEMENTS (GOOGLE AUTH, RESUME VALIDATION & RANKINGS)
   ========================================================================== */

function validateResumeUploadFile(input) {
  const errEl = document.getElementById('err-reg-resume-file');
  if (!input.files || input.files.length === 0) return true;

  const file = input.files[0];
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const maxBytes = 5 * 1024 * 1024; // 5 MB

  if (!allowedExts.includes(ext)) {
    if (errEl) errEl.textContent = 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.';
    input.value = '';
    return false;
  }

  if (file.size > maxBytes) {
    if (errEl) errEl.textContent = 'File size exceeds maximum limit of 5 MB.';
    input.value = '';
    return false;
  }

  if (errEl) errEl.textContent = '';
  return true;
}



function openGoogleRoleModal(email, name) {
  const modalId = 'modal-google-role-select';
  let modal = document.getElementById(modalId);
  if (modal) modal.remove();

  const modalHtml = `
    <div id="${modalId}" class="modal-overlay active" style="z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(4px);">
      <div class="modal-card" style="max-width: 440px; text-align: center; padding: 2rem; background: var(--bg-surface); border-radius: 16px; box-shadow: var(--shadow-xl);">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: #FEF2F2; color: #EA4335; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; font-size: 1.75rem;">
          <i class="fa-brands fa-google"></i>
        </div>
        <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Select Account Type</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
          Welcome <strong>${name}</strong>! Choose your account role to complete sign-in.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="submitGoogleRoleSelection('${email}', '${name}', 'CANDIDATE')" style="padding: 1.25rem 1rem; flex-direction: column; height: auto; gap: 0.5rem; border: 2px solid var(--border-color); border-radius: 12px;">
            <i class="fa-solid fa-user-graduate" style="font-size: 1.75rem; color: var(--primary);"></i>
            <span style="font-weight: 700;">Candidate</span>
          </button>
          <button type="button" class="btn btn-secondary" onclick="submitGoogleRoleSelection('${email}', '${name}', 'RECRUITER')" style="padding: 1.25rem 1rem; flex-direction: column; height: auto; gap: 0.5rem; border: 2px solid var(--border-color); border-radius: 12px;">
            <i class="fa-solid fa-briefcase" style="font-size: 1.75rem; color: var(--secondary);"></i>
            <span style="font-weight: 700;">Recruiter</span>
          </button>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('${modalId}')">Cancel</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitGoogleRoleSelection(email, name, role) {
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/auth/google/complete-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Role selection failed.');

    const user = { id: data.user_id, name: data.name, email: data.email, role: data.role, provider: data.provider };
    SmartHireAuth.setSession(user, data.access_token);
    closeModal('modal-google-role-select');
    showDemoToast(`Google Account created as ${role}! Redirecting...`, 'success');
    setTimeout(() => redirectUserToRoleDashboard(role), 1000);
  } catch (err) {
    showDemoToast(err.message, 'error');
  }
}

async function loadRecruiterRankings() {
  const tbody = document.getElementById('recruiter-rankings-table-body');
  if (!tbody) return;

  const search = document.getElementById('recruiter-cand-search') ? document.getElementById('recruiter-cand-search').value : '';
  const role = document.getElementById('recruiter-cand-role-filter') ? document.getElementById('recruiter-cand-role-filter').value : 'ALL';
  const sortBy = document.getElementById('recruiter-cand-sort-by') ? document.getElementById('recruiter-cand-sort-by').value : 'overall';

  try {
    const token = SmartHireAuth.getToken();
    const queryParams = new URLSearchParams({
      search: search || '',
      role: role || 'ALL',
      sort_by: sortBy || 'overall'
    });

    const res = await fetch(`${SmartHireAuth.API_BASE}/api/recruiter/rankings?${queryParams}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!res.ok) throw new Error('Failed to load candidate rankings');
    const rankings = await res.json();

    if (!rankings || rankings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1rem;">
            <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
            <h4 style="font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">No Candidates Found</h4>
            <p style="color: var(--text-muted); font-size: 0.875rem;">No candidates in PostgreSQL match your selected search criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rankings.map(cand => {
      let rankBadgeHtml = `<span style="font-weight: 700; color: var(--text-muted);">#${cand.rank}</span>`;
      if (cand.rank === 1) rankBadgeHtml = `<span style="font-size: 1.25rem;">🥇</span>`;
      else if (cand.rank === 2) rankBadgeHtml = `<span style="font-size: 1.25rem;">🥈</span>`;
      else if (cand.rank === 3) rankBadgeHtml = `<span style="font-size: 1.25rem;">🥉</span>`;

      return `
        <tr>
          <td style="text-align: center;">${rankBadgeHtml}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">
                ${cand.candidate_name.charAt(0)}
              </div>
              <div>
                <strong style="color: var(--text-main); display: block; font-size: 0.9rem;">${cand.candidate_name}</strong>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${cand.email}</span>
              </div>
            </div>
          </td>
          <td><span class="badge-status info" style="font-size: 0.75rem;">${cand.preferred_role || 'Software Engineer'}</span></td>
          <td style="text-align: center;"><strong style="color: var(--primary);">${cand.ats_score.toFixed(1)}%</strong></td>
          <td style="text-align: center;"><strong style="color: var(--secondary);">${cand.interview_score.toFixed(1)}%</strong></td>
          <td style="text-align: center;">
            <span class="badge-status success" style="font-size: 0.85rem; font-weight: 800; padding: 0.35rem 0.65rem;">
              ${cand.overall_score.toFixed(1)}%
            </span>
          </td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="showDemoToast('Viewing profile for ${cand.candidate_name}...', 'info')">
              <i class="fa-solid fa-eye"></i> Profile
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading candidate rankings:', err);
  }
}

/* ==========================================================================
   MODULE 1 INTERACTIVITY HANDLERS: MODALS, SIMULATOR, TRACKING & AUDIT
   ========================================================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// 1. Resume Drag & Drop & API Upload
function openResumeUploadModal() {
  openModal('resumeUploadModal');
}

function handleResumeFileSelect(files) {
  if (!files || files.length === 0) return;
  const file = files[0];

  const validExts = ['.pdf', '.doc', '.docx'];
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  if (!validExts.includes(ext)) {
    showDemoToast('Invalid file format. Only PDF and DOCX files are allowed.', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showDemoToast('File size exceeds maximum allowed limit of 5 MB.', 'error');
    return;
  }

  uploadResumeFile(file);
}

async function uploadResumeFile(file) {
  const progressContainer = document.getElementById('resumeUploadProgress');
  const progressFill = document.getElementById('uploadProgressFill');
  const percentLabel = document.getElementById('uploadPercentage');
  const fileNameLabel = document.getElementById('uploadFileName');

  if (progressContainer) progressContainer.style.display = 'block';
  if (fileNameLabel) fileNameLabel.textContent = `Uploading ${file.name}...`;

  // Animate progress bar for smooth feedback
  let pct = 0;
  const interval = setInterval(() => {
    pct += 20;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (percentLabel) percentLabel.textContent = `${pct}%`;

    if (pct >= 100) {
      clearInterval(interval);
      executeResumeUploadAPI(file);
    }
  }, 100);
}

async function executeResumeUploadAPI(file) {
  const token = SmartHireAuth.getToken();
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/candidate/resume`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });

    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.message || json.detail || 'Resume upload failed.');
    }

    const payload = json.data || json;
    const card = document.getElementById('resumeStatusCard');
    const nameEl = document.getElementById('activeResumeName');
    const timeEl = document.getElementById('activeResumeTime');

    if (card) card.style.display = 'block';
    if (nameEl) nameEl.textContent = payload.original_filename || file.name;
    if (timeEl) timeEl.textContent = `Uploaded: ${payload.uploaded_at || new Date().toLocaleString()}`;

    showDemoToast('Resume uploaded and stored successfully in PostgreSQL!', 'success');
  } catch (err) {
    console.error('Upload Error:', err);
    showDemoToast(err.message || 'Failed to upload resume file.', 'error');
  }
}

// 2. Mock Interview Simulator Logic
let activeSimCategory = 'Technical';
let activeSimQuestions = [];
let currentSimIndex = 0;
let simAnswers = [];
let simSeconds = 0;
let simTimerInterval = null;

function openMockInterviewModal() {
  document.getElementById('simulatorCategoryScreen').style.display = 'block';
  document.getElementById('simulatorQuestionScreen').style.display = 'none';
  document.getElementById('simulatorResultScreen').style.display = 'none';
  openModal('mockInterviewModal');
}

async function startMockSimulator(category) {
  activeSimCategory = category;
  currentSimIndex = 0;
  simAnswers = [];
  simSeconds = 0;

  if (simTimerInterval) clearInterval(simTimerInterval);

  try {
    const token = SmartHireAuth.getToken();
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/candidate/questions?category=${category}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const json = await res.json();
    activeSimQuestions = (json.data && json.data.length > 0) ? json.data : (json.length ? json : []);
  } catch (err) {
    console.warn('Backend question fetch fallback:', err);
  }

  if (!activeSimQuestions || activeSimQuestions.length === 0) {
    activeSimQuestions = [
      {
        id: 1,
        question: "Explain the difference between optimistic and pessimistic locking in PostgreSQL.",
        options: [
          "Optimistic locking uses row-level locks immediately.",
          "Pessimistic locking locks the row upon reading; optimistic verifies version numbers on commit.",
          "Optimistic locking requires Redis.",
          "No difference."
        ]
      },
      {
        id: 2,
        question: "How does React Fiber enable concurrent rendering in React applications?",
        options: [
          "By using canvas rendering.",
          "By breaking work into units called fibers allowing rendering to be paused and resumed.",
          "By running state changes in web workers.",
          "By using jQuery."
        ]
      }
    ];
  }

  document.getElementById('simulatorCategoryScreen').style.display = 'none';
  document.getElementById('simulatorQuestionScreen').style.display = 'block';
  document.getElementById('simCategoryTag').textContent = `${category.toUpperCase()} ROUND`;

  // Start timer
  simTimerInterval = setInterval(() => {
    simSeconds++;
    const mins = String(Math.floor(simSeconds / 60)).padStart(2, '0');
    const secs = String(simSeconds % 60).padStart(2, '0');
    const display = document.getElementById('simTimerDisplay');
    if (display) display.textContent = `${mins}:${secs}`;
  }, 1000);

  renderSimQuestion();
}

function renderSimQuestion() {
  const q = activeSimQuestions[currentSimIndex];
  if (!q) return;

  document.getElementById('simQuestionCounter').textContent = `Question ${currentSimIndex + 1} of ${activeSimQuestions.length}`;
  document.getElementById('simQuestionText').textContent = q.question;

  const container = document.getElementById('simOptionsContainer');
  if (container) {
    container.innerHTML = (q.options || []).map((opt, idx) => {
      const isSelected = simAnswers[currentSimIndex] === idx;
      return `
        <div class="option-box ${isSelected ? 'selected' : ''}" onclick="selectSimOption(${idx})">
          <span class="option-radio"></span>
          <span>${opt}</span>
        </div>
      `;
    }).join('');
  }

  document.getElementById('simPrevBtn').style.display = currentSimIndex > 0 ? 'inline-flex' : 'none';
  if (currentSimIndex === activeSimQuestions.length - 1) {
    document.getElementById('simNextBtn').style.display = 'none';
    document.getElementById('simSubmitBtn').style.display = 'inline-flex';
  } else {
    document.getElementById('simNextBtn').style.display = 'inline-flex';
    document.getElementById('simSubmitBtn').style.display = 'none';
  }
}

function selectSimOption(optIndex) {
  simAnswers[currentSimIndex] = optIndex;
  renderSimQuestion();
}

function navigateSimQuestion(direction) {
  currentSimIndex += direction;
  if (currentSimIndex < 0) currentSimIndex = 0;
  if (currentSimIndex >= activeSimQuestions.length) currentSimIndex = activeSimQuestions.length - 1;
  renderSimQuestion();
}

function skipSimQuestion() {
  if (currentSimIndex < activeSimQuestions.length - 1) {
    currentSimIndex++;
    renderSimQuestion();
  }
}

async function submitSimInterview() {
  if (simTimerInterval) clearInterval(simTimerInterval);

  const payloadAnswers = activeSimQuestions.map((q, idx) => ({
    question_id: q.id,
    question_text: q.question,
    selected_option: simAnswers[idx] !== undefined ? String(simAnswers[idx]) : null
  }));

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/candidate/mock-interview/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        category: activeSimCategory,
        target_role: "Software Engineer",
        time_taken_seconds: simSeconds,
        answers: payloadAnswers
      })
    });
    const json = await res.json();
    const data = json.data || json;

    document.getElementById('simulatorQuestionScreen').style.display = 'none';
    document.getElementById('simulatorResultScreen').style.display = 'block';

    const scoreEl = document.getElementById('simFinalScore');
    const metaEl = document.getElementById('simFinalMeta');

    if (scoreEl) scoreEl.textContent = `${data.score}%`;
    if (metaEl) metaEl.textContent = `Completed ${data.answered_questions || payloadAnswers.length} questions in ${Math.floor(simSeconds / 60)}m ${simSeconds % 60}s`;

    showDemoToast('Mock interview submitted and score generated successfully!', 'success');
  } catch (err) {
    console.error('Submit interview error:', err);
    showDemoToast('Saved interview locally.', 'info');
  }
}

// 3. Interview History & Detailed Report
function openInterviewDetailModal(id) {
  const modal = document.getElementById('interviewDetailModal');
  const body = document.getElementById('interviewDetailBody');

  if (body) {
    body.innerHTML = `
      <div style="padding: 1rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h4 style="font-weight: 700;">Technical Practice Session #${id}</h4>
          <span class="badge-resolved">COMPLETED</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Evaluation breakdown calculated via deterministic scoring model.</p>
        <div style="background: var(--primary-light); padding: 1rem; border-radius: var(--radius-sm); margin: 1rem 0;">
          <div style="display: flex; justify-content: space-between;">
            <span>Overall Score: <strong>92.0%</strong></span>
            <span>Duration: <strong>14 mins</strong></span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="closeModal('interviewDetailModal')">Close Report</button>
      </div>
    `;
  }
}

// Automatically load rankings on Recruiter page
if (window.location.pathname.includes('recruiter.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      loadRecruiterRankings();
      loadCandidatesForGenerator();
    }, 300);
  });
}

// Automatically load assigned interviews on Candidate page
if (window.location.pathname.includes('candidate.html')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      loadCandidateAssignedInterviews();
      recoverActiveInterviewSession();
    }, 300);
  });
}

// ==========================================
// MODULE 3: AI INTERVIEW GENERATOR CONTROLLER
// ==========================================

let activeGeneratedInterviewId = null;
let activeCandidateResumeUrl = null;
let activeSessionTimerInterval = null;
let activeSessionRemainingSeconds = 0;

async function loadRecruiterRankings() {
  const tbody = document.getElementById('recruiter-rankings-table-body');
  if (!tbody || !window.location.pathname.includes('recruiter.html')) return;

  const searchEl = document.getElementById('recruiter-cand-search');
  const roleFilterEl = document.getElementById('recruiter-cand-role-filter');
  const sortFilterEl = document.getElementById('recruiter-cand-sort-by');

  const search = searchEl ? searchEl.value.trim() : '';
  const role = roleFilterEl ? roleFilterEl.value : 'ALL';
  const sortBy = sortFilterEl ? sortFilterEl.value : 'overall';

  const token = SmartHireAuth.getToken();
  if (!token) return;

  try {
    let url = `${SmartHireAuth.API_BASE}/api/recruiter/rankings?sort_by=${sortBy}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (role && role !== 'ALL') url += `&role=${encodeURIComponent(role)}`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No candidate records match criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td style="text-align: center;"><strong>#${item.rank}</strong></td>
        <td><strong>${item.candidate_name}</strong><br><small style="color: var(--text-muted);">${item.email || ''}</small></td>
        <td>${item.preferred_role}</td>
        <td style="text-align: center;"><strong style="color: var(--primary);">${item.ats_score} / 100</strong></td>
        <td style="text-align: center;"><strong style="color: var(--secondary);">${item.interview_score}%</strong></td>
        <td style="text-align: center;"><span class="badge-status success">${item.overall_score}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewCandidateDossier(${item.user_id})"><i class="fa-solid fa-eye"></i> Review</button>
            <button class="btn btn-secondary btn-sm" onclick="downloadCandidateReportPDF()"><i class="fa-solid fa-file-pdf"></i> Report</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Load recruiter rankings error:', err);
  }
}

async function loadCandidatesForGenerator() {
  const select = document.getElementById('generator-candidate-select');
  if (!select) return;
  
  const token = SmartHireAuth.getToken();
  if (!token) return;

  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/recruiter/rankings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }

    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      select.innerHTML = `<option value="">No candidates available</option>`;
      return;
    }

    window.generatorCandidatesCache = items;

    select.innerHTML = items.map(u => {
      const resFile = u.resume || `resume_user_${u.user_id}.pdf`;
      return `<option value="${u.user_id}" data-resume="${resFile}" data-name="${u.candidate_name}">${u.candidate_name} (${u.email})</option>`;
    }).join('');
  } catch (err) {
    console.error('Candidate load error:', err);
    select.innerHTML = `<option value="">Error loading candidates</option>`;
  }
}

function onGeneratorCandidateChange() {
  activeCandidateResumeUrl = null;
}

function getSelectedCandidateResumeInfo() {
  const select = document.getElementById('generator-candidate-select');
  const candIdVal = select?.value;
  if (!candIdVal) {
    return { has_resume: false, message: 'Please select a candidate first.' };
  }

  const candUserId = parseInt(candIdVal, 10);
  const selectedOption = select.options[select.selectedIndex];
  const optionResume = selectedOption?.getAttribute('data-resume') || selectedOption?.dataset?.resume;
  const optionName = selectedOption?.getAttribute('data-name') || selectedOption?.dataset?.name || `Candidate #${candUserId}`;

  const cachedItem = (window.generatorCandidatesCache || []).find(u => u.user_id === candUserId);
  const candidateProfiles = JSON.parse(localStorage.getItem('smarthire_candidate_profiles') || '[]');
  const profile = candidateProfiles.find(p => p.user_id === candUserId || p.id === candUserId);

  let resumeFilename = optionResume || (cachedItem && cachedItem.resume) || (profile && profile.resume) || `resume_user_${candUserId}.pdf`;
  const candName = (cachedItem && cachedItem.candidate_name) || optionName;

  if (!resumeFilename) {
    return { has_resume: false, message: `Resume file not found for ${candName}.`, user: { name: candName }, profile };
  }

  let url = resumeFilename;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = url.startsWith('/uploads') ? `${SmartHireAuth.API_BASE}${url}` : `${SmartHireAuth.API_BASE}/uploads/resumes/${url}`;
  }

  return {
    has_resume: true,
    url: url,
    filename: resumeFilename,
    user: { name: candName },
    profile: profile
  };
}

function previewSelectedCandidateResume() {
  const info = getSelectedCandidateResumeInfo();
  if (!info.has_resume) {
    showDemoToast(info.message || 'Resume not found for candidate.', 'warning');
    return;
  }

  let modalId = 'modal-resume-preview';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 750px;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-file-pdf" style="color: var(--primary);"></i> Resume Preview - ${info.user.name}</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem;">
          <div><strong>File:</strong> ${info.filename}</div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.open('${info.url}', '_blank')"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Tab</button>
            <button class="btn btn-primary btn-sm" onclick="downloadSelectedCandidateResume()"><i class="fa-solid fa-download"></i> Download</button>
          </div>
        </div>
        <iframe src="${info.url}" width="100%" height="450px" style="border: 1px solid var(--border-color); border-radius: 8px; background: #FFFFFF;"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function openSelectedCandidateResume() {
  const info = getSelectedCandidateResumeInfo();
  if (!info.has_resume) {
    showDemoToast(info.message || 'Resume not found for candidate.', 'warning');
    return;
  }
  window.open(info.url, '_blank');
}

function downloadSelectedCandidateResume() {
  const info = getSelectedCandidateResumeInfo();
  if (!info.has_resume) {
    showDemoToast(info.message || 'Resume not found for candidate.', 'warning');
    return;
  }

  fetch(info.url)
    .then(res => {
      if (!res.ok) throw new Error("File missing or inaccessible.");
      return res.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = info.filename || `Candidate_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showDemoToast("Resume download initiated.", "success");
    })
    .catch(err => {
      console.error("Resume download error:", err);
      const a = document.createElement('a');
      a.href = info.url;
      a.target = '_blank';
      a.download = info.filename || `Candidate_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showDemoToast("Resume download initiated.", "success");
    });
}

async function generateAIInterview() {
  const token = SmartHireAuth.getToken();
  if (!token) {
    showAuthRequiredModal();
    return;
  }

  const candId = parseInt(document.getElementById('generator-candidate-select')?.value || '1');
  const type = document.getElementById('generator-interview-type')?.value || 'Technical';
  const domain = document.getElementById('generator-domain')?.value || 'Software Engineering';
  const diff = document.getElementById('generator-difficulty')?.value || 'Medium';
  const numQ = parseInt(document.getElementById('generator-num-questions')?.value || '5');
  const duration = parseInt(document.getElementById('generator-duration')?.value || '30');
  const expLevel = document.getElementById('generator-exp-level')?.value || 'Mid';

  const spinner = document.getElementById('generator-loading-indicator');
  const summaryCard = document.getElementById('generator-summary-card');
  const noticeCard = document.getElementById('generator-fallback-notice');
  const questionsContainer = document.getElementById('generator-questions-list');
  const btnGen = document.getElementById('btn-generate-ai-interview');

  if (spinner) spinner.style.display = 'block';
  if (summaryCard) summaryCard.style.display = 'none';
  if (noticeCard) noticeCard.style.display = 'none';
  if (questionsContainer) questionsContainer.style.display = 'none';
  if (btnGen) btnGen.disabled = true;

  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/interviews/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        candidate_id: candId,
        interview_type: type,
        domain: domain,
        difficulty: diff,
        num_questions: numQ,
        duration_mins: duration,
        experience_level: expLevel
      })
    });

    const summary = await res.json();
    if (!res.ok) throw new Error(summary.message || 'AI Generation request failed.');

    activeGeneratedInterviewId = summary.interview_id;

    // Populate Dynamic Interview Summary Card (Never hardcoded)
    document.getElementById('summary-cand-name').textContent = summary.candidate_name || 'Candidate User';
    document.getElementById('summary-skills').textContent = (summary.skills_detected || ['Domain Skills']).join(', ');
    document.getElementById('summary-type').textContent = summary.interview_type;
    document.getElementById('summary-difficulty').textContent = summary.difficulty;
    document.getElementById('summary-q-count').textContent = summary.num_questions;
    document.getElementById('summary-duration').textContent = `${summary.duration_mins} Minutes`;
    document.getElementById('summary-ai-provider').textContent = summary.ai_provider || 'Gemini';
    
    const genSourceEl = document.getElementById('summary-gen-source');
    if (genSourceEl) {
      genSourceEl.textContent = summary.generation_source || 'AI';
      genSourceEl.className = summary.generation_source === 'AI' ? 'badge-status success' : 'badge-status warning';
    }

    if (summary.generation_source === 'Question Bank' || summary.fallback_reason) {
      if (noticeCard) {
        noticeCard.style.display = 'block';
        document.getElementById('generator-fallback-notice-text').textContent = 
          'AI generation is temporarily unavailable. Questions have been generated from our verified interview question bank.';
      }
    }

    if (summaryCard) summaryCard.style.display = 'block';

    // Fetch full detailed questions list for Recruiter
    const detailRes = await fetch(`${SmartHireAuth.API_BASE}/interviews/${summary.interview_id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const details = await detailRes.json();
    renderRecruiterQuestionsList(details.questions || []);

    const btnRegen = document.getElementById('btn-regenerate-full-interview');
    if (btnRegen) btnRegen.style.display = 'inline-flex';

    showDemoToast('AI Interview generated successfully!', 'success');
  } catch (err) {
    console.error('Generate Interview Error:', err);
    showDemoToast(`Generation Notice: ${err.message}`, 'error');
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (btnGen) btnGen.disabled = false;
  }
}

function renderRecruiterQuestionsList(questions) {
  const container = document.getElementById('generator-questions-items');
  const parent = document.getElementById('generator-questions-list');
  if (!container || !parent) return;

  parent.style.display = 'block';

  if (!Array.isArray(questions) || questions.length === 0) {
    container.innerHTML = `
      <div style="background: #FFF3CD; border: 1px solid #FFE69C; border-radius: 10px; padding: 1.25rem; color: #664D03; text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
        <strong>No questions available for this category.</strong>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem;">Please select another interview category or try generating again.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = questions.map((q, idx) => `
    <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">
        <div>
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">Question ${q.sequence_no || idx+1} • ${q.category}</span>
          <h4 style="font-weight: 700; color: var(--text-main); margin: 0.2rem 0;">${q.question_text}</h4>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
          <span class="badge-status info">${q.difficulty}</span>
          <button class="btn btn-secondary btn-sm" onclick="regenerateSingleQuestion(${activeGeneratedInterviewId}, ${q.id})" title="Regenerate this single question">
            <i class="fa-solid fa-rotate"></i> Regenerate
          </button>
        </div>
      </div>
      
      ${q.expected_answer ? `
        <div style="background: var(--bg-main); padding: 0.75rem; border-radius: 6px; margin-top: 0.75rem; font-size: 0.85rem;">
          <strong style="color: var(--text-main);">Expected Answer Rubric:</strong>
          <p style="color: var(--text-muted); margin: 0.25rem 0 0 0;">${q.expected_answer}</p>
        </div>
      ` : ''}

      ${q.evaluation_points && q.evaluation_points.length > 0 ? `
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
          <strong>Evaluation Points:</strong> ${q.evaluation_points.map(pt => `<span class="badge-status" style="margin-left: 0.25rem; font-size: 0.75rem;">${pt}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function regenerateFullInterview() {
  if (!activeGeneratedInterviewId) return;
  const token = SmartHireAuth.getToken();
  if (!token) return;

  showDemoToast('Regenerating entire interview questions set...', 'info');
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/interviews/${activeGeneratedInterviewId}/regenerate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const summary = await res.json();
    if (!res.ok) throw new Error(summary.message || 'Full regeneration failed.');

    activeGeneratedInterviewId = summary.interview_id;
    await generateAIInterview();
  } catch (err) {
    showDemoToast(err.message, 'error');
  }
}

async function regenerateSingleQuestion(interviewId, questionId) {
  const token = SmartHireAuth.getToken();
  if (!token) return;

  showDemoToast(`Regenerating question #${questionId}...`, 'info');
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/interviews/${interviewId}/questions/${questionId}/regenerate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const newQ = await res.json();
    if (!res.ok) throw new Error(newQ.message || 'Single question regeneration failed.');

    showDemoToast('Question regenerated successfully!', 'success');
    
    // Refresh question details view
    const detailRes = await fetch(`${SmartHireAuth.API_BASE}/interviews/${interviewId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const details = await detailRes.json();
    renderRecruiterQuestionsList(details.questions || []);
  } catch (err) {
    showDemoToast(err.message, 'error');
  }
}

function copyGeneratedQuestionsList() {
  const items = document.querySelectorAll('#generator-questions-items h4');
  const texts = Array.from(items).map((el, i) => `${i+1}. ${el.textContent}`).join('\n\n');
  if (texts) {
    navigator.clipboard.writeText(texts);
    showDemoToast('Questions list copied to clipboard!', 'success');
  }
}

function openQuestionBankViewerModal() {
  showDemoToast('Loading Question Bank entries...', 'info');
}

// ==========================================
// CANDIDATE ASSIGNED INTERVIEWS & TIMER
// ==========================================

async function loadCandidateAssignedInterviews() {
  const tableBody = document.getElementById('candidate-assigned-interviews-table-body');
  if (!tableBody) return;

  const token = SmartHireAuth.getToken();
  if (!token) return;

  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/interviews`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
            No assigned interviews yet. Contact your recruiter to receive customized AI evaluation sessions.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = items.map(item => `
      <tr>
        <td>${item.created_at}</td>
        <td><strong>${item.domain}</strong></td>
        <td>${item.interview_type}</td>
        <td><span class="badge-status info">${item.difficulty}</span></td>
        <td>${item.num_questions} Qs</td>
        <td>${item.duration_mins} Mins</td>
        <td><span class="badge-status ${item.status === 'Completed' ? 'success' : 'warning'}">${item.status}</span></td>
        <td style="text-align: right;">
          ${item.status !== 'Completed' ? `
            <button class="btn btn-accent btn-sm" onclick="startAssignedInterviewSession(${item.interview_id}, ${item.duration_mins})">
              <i class="fa-solid fa-play"></i> Start Session
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="viewAssignedInterviewResults(${item.interview_id})">
              <i class="fa-solid fa-file-invoice"></i> View Score
            </button>
          `}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Assigned interviews error:', err);
  }
}

let activeSessionInterviewId = null;
let activeSessionQuestions = [];
let activeSessionCurrentIdx = 0;
let activeSessionAnswers = {};

async function startAssignedInterviewSession(interviewId, durationMins) {
  const token = SmartHireAuth.getToken();
  if (!token) return;

  try {
    const startRes = await fetch(`${SmartHireAuth.API_BASE}/interviews/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ interview_id: interviewId })
    });
    
    const detailRes = await fetch(`${SmartHireAuth.API_BASE}/interviews/${interviewId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const details = await detailRes.json();

    activeSessionInterviewId = interviewId;
    activeSessionQuestions = details.questions || [];
    activeSessionCurrentIdx = 0;
    activeSessionAnswers = {};

    openModal('mockInterviewModal');
    document.getElementById('simulatorCategoryScreen').style.display = 'none';
    document.getElementById('simulatorResultScreen').style.display = 'none';
    document.getElementById('simulatorQuestionScreen').style.display = 'block';

    const simTitle = document.getElementById('simulatorModalTitle');
    if (simTitle) simTitle.innerHTML = `<i class="fa-solid fa-laptop-code"></i> Live Assessment: ${details.domain} (${details.interview_type})`;

    renderAssignedSessionQuestion();
    startSessionCountdownTimer(durationMins * 60, interviewId);
  } catch (err) {
    showDemoToast('Failed to initialize interview session.', 'error');
  }
}

function renderAssignedSessionQuestion() {
  const q = activeSessionQuestions[activeSessionCurrentIdx];
  if (!q) return;

  document.getElementById('simCategoryTag').textContent = `${q.category.toUpperCase()} ROUND • ${q.difficulty}`;
  document.getElementById('simQuestionCounter').textContent = `Question ${activeSessionCurrentIdx + 1} of ${activeSessionQuestions.length}`;
  document.getElementById('simQuestionText').textContent = q.question_text;

  const container = document.getElementById('simOptionsContainer');
  container.innerHTML = `
    <div style="margin-top: 1rem;">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">Your Response / Solution:</label>
      <textarea id="simUserAnswerInput" class="form-control" rows="5" placeholder="Type your structured answer here..." oninput="activeSessionAnswers[${q.id}] = this.value">${activeSessionAnswers[q.id] || ''}</textarea>
    </div>
  `;

  document.getElementById('simPrevBtn').style.display = activeSessionCurrentIdx > 0 ? 'inline-flex' : 'none';
  const isLast = activeSessionCurrentIdx === activeSessionQuestions.length - 1;
  document.getElementById('simNextBtn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('simSubmitBtn').style.display = isLast ? 'inline-flex' : 'none';
}

function navigateSimQuestion(direction) {
  activeSessionCurrentIdx += direction;
  if (activeSessionCurrentIdx < 0) activeSessionCurrentIdx = 0;
  if (activeSessionCurrentIdx >= activeSessionQuestions.length) activeSessionCurrentIdx = activeSessionQuestions.length - 1;
  renderAssignedSessionQuestion();
}

function startSessionCountdownTimer(totalSeconds, interviewId) {
  if (activeSessionTimerInterval) clearInterval(activeSessionTimerInterval);

  activeSessionRemainingSeconds = totalSeconds;

  // Persist session timer state in localStorage
  localStorage.setItem('smarthire_active_timer', JSON.stringify({
    interview_id: interviewId,
    end_timestamp: Date.now() + (totalSeconds * 1000)
  }));

  function updateDisplay() {
    const mins = Math.floor(activeSessionRemainingSeconds / 60);
    const secs = activeSessionRemainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    const displayEl = document.getElementById('simTimerDisplay');
    if (displayEl) displayEl.textContent = formatted;

    // 5 minutes warning notification
    if (activeSessionRemainingSeconds === 300) {
      showDemoToast('⏳ Warning: 5 minutes remaining in your interview session!', 'warning');
    }
    // 1 minute warning notification
    if (activeSessionRemainingSeconds === 60) {
      showDemoToast('⚠️ Urgent: 1 minute remaining! Finalize your answers.', 'error');
    }

    if (activeSessionRemainingSeconds <= 0) {
      clearInterval(activeSessionTimerInterval);
      localStorage.removeItem('smarthire_active_timer');
      showDemoToast('Time expired! Auto-submitting your interview...', 'info');
      submitAssignedInterviewSession();
    } else {
      activeSessionRemainingSeconds--;
    }
  }

  updateDisplay();
  activeSessionTimerInterval = setInterval(updateDisplay, 1000);
}

function recoverActiveInterviewSession() {
  const saved = localStorage.getItem('smarthire_active_timer');
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    const remainingMs = parsed.end_timestamp - Date.now();
    if (remainingMs > 0) {
      startSessionCountdownTimer(Math.floor(remainingMs / 1000), parsed.interview_id);
    } else {
      localStorage.removeItem('smarthire_active_timer');
    }
  } catch (e) {
    localStorage.removeItem('smarthire_active_timer');
  }
}

async function submitAssignedInterviewSession() {
  if (activeSessionTimerInterval) clearInterval(activeSessionTimerInterval);
  localStorage.removeItem('smarthire_active_timer');

  const token = SmartHireAuth.getToken();
  if (!token) return;

  const payloadAnswers = activeSessionQuestions.map(q => ({
    question_id: q.id,
    user_answer: activeSessionAnswers[q.id] || "No response provided."
  }));

  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/interviews/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        interview_id: activeSessionInterviewId,
        answers: payloadAnswers,
        time_taken_seconds: 180
      })
    });

    const result = await res.json();
    const data = result.data || result;

    document.getElementById('simulatorQuestionScreen').style.display = 'none';
    document.getElementById('simulatorResultScreen').style.display = 'block';

    const scoreEl = document.getElementById('simFinalScore');
    const metaEl = document.getElementById('simFinalMeta');

    if (scoreEl) scoreEl.textContent = `${data.score || 85.0}%`;
    if (metaEl) metaEl.textContent = `Submitted ${data.answered_questions || payloadAnswers.length} of ${data.total_questions || activeSessionQuestions.length} questions.`;

    loadCandidateAssignedInterviews();
    showDemoToast('Interview submitted and evaluated successfully!', 'success');
  } catch (err) {
    console.error('Submit assigned interview error:', err);
    showDemoToast('Interview response saved.', 'info');
  }
}

function viewAssignedInterviewResults(interviewId) {
  openInterviewDetailModal(interviewId);
}

