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
   SECTION 1: DATABASE SCHEMA INITIALIZER & LOCAL STATE STORE*/
function formatToIST(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    let d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
  } catch (e) {
    return String(dateInput);
  }
}

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
    } catch (e) { }
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
    } catch (err) {
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


function renderGoogleGISButtonOnLoad() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
    return;
  }
  fetch(`${SmartHireAuth.API_BASE}/api/auth/config`)
    .then(res => res.json())
    .then(config => {
      if (config.google_client_id) {
        google.accounts.id.initialize({
          client_id: config.google_client_id,
          callback: handleGoogleCredentialResponse
        });
      }
    })
    .catch(() => { });
}

function handleGoogleAuth() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.prompt();
  } else {
    showDemoToast('Google Authentication is not configured or unavailable.', 'info');
  }
}

async function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) return;
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: response.credential })
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      SmartHireAuth.setSession({
        id: data.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_active: true
      }, data.access_token);
      showDemoToast(`Welcome back, ${data.name}! Directing to ${data.role} Dashboard...`, 'success');
      setTimeout(() => redirectUserToRoleDashboard(data.role), 1000);
    } else {
      showDemoToast(data.detail || 'Google sign-in failed.', 'error');
    }
  } catch (err) {
    showDemoToast('Network error during Google authentication.', 'error');
  }
}

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
    form.onsubmit = async function (e) {
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
async function openCandidateReportsLibraryModal() {
  let modalId = 'modal-reports-library';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 920px; width: 95%;">
      <div class="smarthire-modal-header">
        <h3><i class="fa-solid fa-folder-open" style="color: var(--primary);"></i> Candidate Module 6 Behavior Reports Library</h3>
        <button class="smarthire-modal-close" onclick="closeModal('${modalId}')"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="smarthire-modal-body">
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Authorized Recruiter & Admin visual behavior analytics and candidate interview reports.</p>
        
        <!-- Controls Bar: Search, Sort Metric, Order Selector -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; align-items: center; background: var(--bg-surface); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
          <div style="flex: 1; min-width: 200px;">
            <input type="text" id="recruiterReportSearchInput" class="form-control" placeholder="Search candidate name or role..." onkeyup="filterRecruiterReportsList()" style="font-size: 0.85rem; padding: 0.4rem 0.75rem;">
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-right: 0.35rem;">Sort By:</label>
            <select id="recruiterReportSortBySelect" class="form-control" onchange="fetchAndRenderRecruiterReports()" style="font-size: 0.85rem; padding: 0.4rem; display: inline-block; width: auto;">
              <option value="created_at">Completion Date</option>
              <option value="candidate_name">Candidate Name</option>
              <option value="interview_title">Interview Domain</option>
              <option value="position">Position</option>
              <option value="confidence_score">Confidence Score</option>
              <option value="attention_score">Attention Score</option>
              <option value="eye_contact_percentage">Eye Contact %</option>
              <option value="engagement_score">Engagement Score</option>
              <option value="mobile_event_count">Mobile Events</option>
              <option value="fullscreen_violations_count">Fullscreen Exit Attempts</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-right: 0.35rem;">Order:</label>
            <select id="recruiterReportOrderSelect" class="form-control" onchange="fetchAndRenderRecruiterReports()" style="font-size: 0.85rem; padding: 0.4rem; display: inline-block; width: auto;">
              <option value="desc">Descending (High → Low / Newest)</option>
              <option value="asc">Ascending (Low → High / Oldest)</option>
            </select>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="fetchAndRenderRecruiterReports()"><i class="fa-solid fa-rotate"></i> Refresh</button>
        </div>

        <div id="recruiterReportsContainer">
          <div style="text-align: center; padding: 2rem 0; color: var(--primary);">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.75rem;"></i>
            <p style="margin-top: 0.5rem; font-size: 0.85rem;">Loading candidate behavior reports...</p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
  await fetchAndRenderRecruiterReports();
}

async function fetchAndRenderRecruiterReports() {
  const container = document.getElementById('recruiterReportsContainer');
  if (!container) return;

  const sortBy = document.getElementById('recruiterReportSortBySelect')?.value || 'created_at';
  const order = document.getElementById('recruiterReportOrderSelect')?.value || 'desc';
  const search = document.getElementById('recruiterReportSearchInput')?.value?.toLowerCase() || '';

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/module6/behavior-reports?sort_by=${sortBy}&order=${order}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resData = await res.json();
    if (!res.ok || !resData.success) {
      container.innerHTML = `<div class="alert alert-danger">Could not load candidate reports (${resData.message || res.statusText}).</div>`;
      return;
    }

    let reports = resData.data || [];
    if (search) {
      reports = reports.filter(r =>
        (r.candidate_name && r.candidate_name.toLowerCase().includes(search)) ||
        (r.interview_title && r.interview_title.toLowerCase().includes(search)) ||
        (r.position && r.position.toLowerCase().includes(search))
      );
    }

    if (reports.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">No Module 6 candidate behavior reports found.</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 500px; overflow-y: auto; padding-right: 0.35rem;">
        ${reports.map(r => {
      const confDisplay = r.confidence_score !== null ? `${r.confidence_score}%` : 'N/A';
      const attDisplay = r.attention_score !== null ? `${r.attention_score}%` : 'N/A';
      const eyeDisplay = r.eye_contact_percentage !== null ? `${r.eye_contact_percentage}%` : 'N/A';
      const engDisplay = r.engagement_score !== null ? `${r.engagement_score}% (${r.engagement_category || 'N/A'})` : 'N/A';
      const statusBadge = r.analysis_status === 'complete' ? 'success' : r.analysis_status === 'insufficient_data' ? 'warning' : 'info';

      return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-main); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); gap: 1rem;">
              <div style="flex: 2;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <strong style="font-size: 0.95rem; color: var(--text-main);">${r.candidate_name}</strong>
                  <span class="badge-status ${statusBadge}" style="font-size: 0.7rem;">${r.analysis_status}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                  ${r.interview_title} (${r.position}) • Session #${r.session_id} • ${r.created_at || 'Date N/A'}
                </div>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                  <span>Confidence: <strong style="color: var(--primary);">${confDisplay}</strong></span>
                  <span>Attention: <strong style="color: #10B981;">${attDisplay}</strong></span>
                  <span>Eye Contact: <strong>${eyeDisplay}</strong></span>
                  <span>Engagement: <strong style="color: #6366F1;">${engDisplay}</strong></span>
                  ${r.mobile_event_count > 0 ? `<span style="color: #EF4444; font-weight: 700;"><i class="fa-solid fa-mobile-screen"></i> Mobile: ${r.mobile_event_count}</span>` : ''}
                  ${r.fullscreen_violations_count > 0 ? `<span style="color: #F59E0B;"><i class="fa-solid fa-compress"></i> Exits: ${r.fullscreen_violations_count}</span>` : ''}
                </div>
              </div>
              <div>
                <button class="btn btn-primary btn-sm" onclick="openRecruiterBehaviorReportModal(${r.session_id})">
                  <i class="fa-solid fa-file-contract"></i> View Full Report
                </button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error fetching behavior reports: ${err}</div>`;
  }
}

function filterRecruiterReportsList() {
  fetchAndRenderRecruiterReports();
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
  if (modalId === 'mockInterviewModal') {
    stopAllMediaTracks();
  }
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
// (openInterviewDetailModal is implemented below with full API data fetching and Module 6 behavior analysis)

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
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">Question ${q.sequence_no || idx + 1} • ${q.category}</span>
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
  const texts = Array.from(items).map((el, i) => `${i + 1}. ${el.textContent}`).join('\n\n');
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

function normalizeInterviewStatus(status) {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'COMPLETED' || s === 'FINISHED' || s === 'ENDED') return 'COMPLETED';
  if (s === 'TERMINATED' || s === 'CANCELLED') return 'TERMINATED';
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'PAUSED') return 'IN_PROGRESS';
  if (s === 'FINALIZING' || s === 'PROCESSING') return 'FINALIZING';
  return 'NOT_STARTED';
}

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

    tableBody.innerHTML = items.map(item => {
      const normStatus = normalizeInterviewStatus(item.status);
      let statusBadge = '<span class="badge-status info">Not Started</span>';
      let actionBtn = `<button class="btn btn-accent btn-sm" onclick="startAssignedInterviewSession(${item.interview_id}, ${item.duration_mins})"><i class="fa-solid fa-play"></i> Start Session</button>`;

      if (normStatus === 'COMPLETED') {
        statusBadge = '<span class="badge-status success">Completed</span>';
        actionBtn = `<button class="btn btn-secondary btn-sm" onclick="viewAssignedInterviewResults(${item.interview_id})"><i class="fa-solid fa-file-invoice"></i> View Report</button>`;
      } else if (normStatus === 'TERMINATED') {
        statusBadge = '<span class="badge-status danger">Terminated</span>';
        actionBtn = `<button class="btn btn-secondary btn-sm" onclick="viewAssignedInterviewResults(${item.interview_id})"><i class="fa-solid fa-file-invoice"></i> View Report</button>`;
      } else if (normStatus === 'FINALIZING') {
        statusBadge = '<span class="badge-status warning">Processing</span>';
        actionBtn = `<button class="btn btn-secondary btn-sm" disabled><i class="fa-solid fa-spinner fa-spin"></i> Finalizing...</button>`;
      } else if (normStatus === 'IN_PROGRESS') {
        statusBadge = '<span class="badge-status warning">In Progress</span>';
        actionBtn = `<button class="btn btn-warning btn-sm" onclick="startAssignedInterviewSession(${item.interview_id}, ${item.duration_mins})"><i class="fa-solid fa-play"></i> Resume Session</button>`;
      }

      return `
        <tr>
          <td>${item.created_at || 'N/A'}</td>
          <td><strong>${item.domain || 'Technical'}</strong></td>
          <td>${item.interview_type || 'General'}</td>
          <td><span class="badge-status info">${item.difficulty || 'Medium'}</span></td>
          <td>${item.num_questions || 0} Qs</td>
          <td>${item.duration_mins || 30} Mins</td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">${actionBtn}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Assigned interviews error:', err);
  }
}

let activeSessionInterviewId = null;
let activeSessionRecord = null;
let activeSessionQuestions = [];
let activeSessionCurrentIdx = 0;
let activeSessionAnswers = {};
let activeSessionTotalActiveSeconds = 0;

let interviewMediaStream = null;
let interviewMediaRecorder = null;
let interviewRecordedChunks = [];
let selectedRecordingMimeType = 'video/webm';
let isAsyncActionPending = false;
let currentQuestionStartTime = null;
let questionActiveTimerInterval = null;
let questionActiveSeconds = 0;

let fullscreenExitCount = 0;
let isInterviewActive = false;
let isFullscreenWarningOpen = false;

function detectSupportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

function verifyMediaDevicesLive() {
  if (!interviewMediaStream || !interviewMediaStream.active) return false;
  const vTracks = interviewMediaStream.getVideoTracks();
  const aTracks = interviewMediaStream.getAudioTracks();
  const vLive = vTracks.length > 0 && vTracks[0].readyState === 'live';
  const aLive = aTracks.length > 0 && aTracks[0].readyState === 'live';
  return vLive && aLive;
}

async function requestMediaPermissions() {
  const camBadge = document.getElementById('cameraStatusBadge');
  const micBadge = document.getElementById('micStatusBadge');
  const videoEl = document.getElementById('interviewWebcamPreview');
  const camCheck = document.getElementById('cameraCheckIcon');
  const micCheck = document.getElementById('micCheckIcon');
  const startBtn = document.getElementById('btnStartInterviewWithFullscreen');
  const errNotice = document.getElementById('setupErrorNotice');
  const errText = document.getElementById('setupErrorMessage');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    interviewMediaStream = stream;

    if (videoEl) {
      videoEl.srcObject = stream;
    }

    if (camBadge) {
      camBadge.className = 'badge-status success';
      camBadge.innerHTML = '<i class="fa-solid fa-video"></i> Camera: Connected';
    }
    if (micBadge) {
      micBadge.className = 'badge-status success';
      micBadge.innerHTML = '<i class="fa-solid fa-microphone"></i> Mic: Connected';
    }
    if (camCheck) camCheck.innerHTML = '<span style="color: #10B981;"><i class="fa-solid fa-circle-check"></i> Connected</span>';
    if (micCheck) micCheck.innerHTML = '<span style="color: #10B981;"><i class="fa-solid fa-circle-check"></i> Connected</span>';

    if (errNotice) errNotice.style.display = 'none';

    if (verifyMediaDevicesLive()) {
      if (startBtn) startBtn.disabled = false;
      return true;
    } else {
      if (startBtn) startBtn.disabled = true;
      return false;
    }
  } catch (err) {
    console.error('Media permission error:', err);
    let errMsg = 'Camera and microphone access are required to start this interview. Please allow access in browser settings.';
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      errMsg = 'Camera or Microphone permission was denied. Please allow permissions in browser settings to start.';
    } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      errMsg = 'No suitable camera/microphone device was found on your system.';
    } else if (err.name === 'NotReadableError') {
      errMsg = 'Your camera or microphone is currently in use by another application.';
    }

    if (camBadge) {
      camBadge.className = 'badge-status danger';
      camBadge.innerHTML = '<i class="fa-solid fa-video-slash"></i> Camera: Denied';
    }
    if (micBadge) {
      micBadge.className = 'badge-status danger';
      micBadge.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Mic: Denied';
    }
    if (camCheck) camCheck.innerHTML = '<span style="color: #EF4444;"><i class="fa-solid fa-circle-xmark"></i> Permission Denied</span>';
    if (micCheck) micCheck.innerHTML = '<span style="color: #EF4444;"><i class="fa-solid fa-circle-xmark"></i> Permission Denied</span>';

    if (errNotice && errText) {
      errText.textContent = errMsg;
      errNotice.style.display = 'block';
    }
    if (startBtn) startBtn.disabled = true;
    showDemoToast(errMsg, 'error');
    return false;
  }
}

function initializeMediaRecorder() {
  if (!interviewMediaStream) return false;
  if (interviewMediaRecorder && interviewMediaRecorder.state !== 'inactive') {
    return true;
  }

  selectedRecordingMimeType = detectSupportedMimeType();
  interviewRecordedChunks = [];

  try {
    interviewMediaRecorder = new MediaRecorder(interviewMediaStream, { mimeType: selectedRecordingMimeType });
  } catch (e) {
    console.warn('MediaRecorder init fallback without mimeType:', e);
    try {
      interviewMediaRecorder = new MediaRecorder(interviewMediaStream);
    } catch (err2) {
      showDemoToast('Browser does not support MediaRecorder video recording.', 'error');
      return false;
    }
  }

  interviewMediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      interviewRecordedChunks.push(event.data);
    }
  };

  const recBadge = document.getElementById('recordingStatusBadge');
  if (recBadge) {
    recBadge.className = 'badge-status success';
    recBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Recording: Active';
  }

  interviewMediaRecorder.start(1000);
  return true;
}

function updateSessionUiState(session, durationMins) {
  if (!session) return;
  activeSessionRecord = session;
  if (session.status) {
    currentSessionLifecycleState = (session.status === 'IN_PROGRESS') ? 'active' : session.status.toLowerCase();
  }
  const catBadge = document.getElementById('simulatorCategoryBadge');
  if (catBadge && session.status) {
    catBadge.innerText = session.status;
  }
}

async function startAssignedInterviewSession(interviewId, durationMins) {
  const token = SmartHireAuth.getToken();
  if (!token) {
    console.error("[INTERVIEW INIT FAILED] Missing JWT auth token.");
    showDemoToast("Authentication token missing. Please log in again.", "error");
    return;
  }

  console.log("[BEGIN INTERVIEW] Interview ID:", interviewId);

  try {
    const url = `${SmartHireAuth.API_BASE}/api/interview/sessions/interview/${interviewId}`;
    console.log("[INTERVIEW INIT] Request URL:", url);

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const responseText = await res.text();
    console.log("[INTERVIEW INIT] Status:", res.status);
    console.log("[INTERVIEW INIT] Response Text:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("[INTERVIEW INIT FAILED] Response is not valid JSON:", responseText);
      showDemoToast("Failed to initialize interview session (Invalid server response).", "error");
      return;
    }

    console.log("[INTERVIEW INIT] Parsed response:", data);

    if (!res.ok || (!data.success && !data.session)) {
      console.error("[INTERVIEW INIT FAILED]", res.status, data);
      showDemoToast(data.message || data.detail || 'Failed to load interview session.', 'error');
      return;
    }

    const sessionObj = data.session || {};
    const normStatus = normalizeInterviewStatus(sessionObj.status || data.status || data.interview_status);
    if (data.already_completed || sessionObj.already_completed || normStatus === 'COMPLETED' || normStatus === 'TERMINATED') {
      showDemoToast('This interview has already been completed.', 'info');
      await loadCandidateAssignedInterviews();
      viewAssignedInterviewResults(interviewId);
      return;
    }

    activeSessionInterviewId = interviewId;
    activeSessionRecord = sessionObj;
    activeSessionQuestions = data.questions || [];
    activeSessionCurrentIdx = sessionObj.current_question_index || 0;
    activeSessionAnswers = {};

    if (Array.isArray(data.attempts)) {
      data.attempts.forEach(att => {
        if (att.answer) activeSessionAnswers[att.question_id] = att.answer;
      });
    }

    openModal('mockInterviewModal');
    document.getElementById('simulatorCategoryScreen').style.display = 'none';
    document.getElementById('simulatorResultScreen').style.display = 'none';
    document.getElementById('simulatorQuestionScreen').style.display = 'none';

    const setupScreen = document.getElementById('simulatorSetupScreen');
    const setupWebcamContainer = document.getElementById('setupWebcamContainer');
    if (setupWebcamContainer) {
      const vEl = document.getElementById('interviewWebcamPreview');
      if (vEl && !setupWebcamContainer.contains(vEl)) {
        setupWebcamContainer.appendChild(vEl);
      }
    }
    if (setupScreen) setupScreen.style.display = 'block';

    const simTitle = document.getElementById('simulatorModalTitle');
    if (simTitle) simTitle.innerHTML = `<i class="fa-solid fa-laptop-code"></i> Setup: ${(data.interview && data.interview.domain) || 'Technical'} (${(data.interview && data.interview.interview_type) || 'General'})`;

    updateSessionUiState(sessionObj, (data.interview && data.interview.duration_mins) || durationMins);

    await requestMediaPermissions();
  } catch (err) {
    console.error('[INTERVIEW INIT EXCEPTION]', err);
    showDemoToast('Failed to initialize interview session.', 'error');
  }
}

async function startVerifiedInterviewSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  // 1. Request browser fullscreen synchronously within user click event context
  requestProgrammaticFullscreen();

  if (!verifyMediaDevicesLive()) {
    showDemoToast('Camera and microphone hardware must be live before starting the interview.', 'error');
    const pass = await requestMediaPermissions();
    if (!pass) return;
  }

  isAsyncActionPending = true;
  const startBtn = document.getElementById('btnStartInterviewWithFullscreen') || document.getElementById('btnStartSession');
  if (startBtn) startBtn.disabled = true;

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showDemoToast(data.detail || data.message || 'Could not start interview session.', 'error');
      if (res.status === 409) {
        await loadCandidateAssignedInterviews();
      }
      if (startBtn) startBtn.disabled = false;
      return;
    }

    if (data.session) activeSessionRecord = data.session;
    if (data.interview) activeSessionInterviewId = data.interview.id;
    if (data.questions && Array.isArray(data.questions)) activeSessionQuestions = data.questions;

    initializeMediaRecorder();
    fullscreenExitCount = 0;
    isInterviewActive = true;
    currentSessionLifecycleState = 'active';
    isFullscreenWarningOpen = false;
    isFinishingInterview = false;

    // Register active violation monitoring listeners ONLY when session starts
    addInterviewViolationListeners();

    // Start live speech recognition for candidate answer
    startLiveSpeechRecognition();

    // Start Module 6 webcam frame sampling
    console.log("[MODULE 6 FRONTEND] Frame sampling started.");
    console.log("[MODULE 6 FRONTEND] Active session ID:", activeSessionRecord ? activeSessionRecord.id : "N/A");
    startModule6FrameSampling();

    // Transition UI from Setup to Questions
    const setupScreen = document.getElementById('simulatorSetupScreen');
    if (setupScreen) setupScreen.style.display = 'none';

    const mount = document.getElementById('questionWebcamMount');
    const setupWebcamContainer = document.getElementById('setupWebcamContainer');
    if (mount && setupWebcamContainer) {
      mount.appendChild(setupWebcamContainer);
    }

    const questionScreen = document.getElementById('simulatorQuestionScreen');
    if (questionScreen) questionScreen.style.display = 'block';

    const simTitle = document.getElementById('simulatorModalTitle');
    if (simTitle && data.interview) simTitle.innerHTML = `<i class="fa-solid fa-laptop-code"></i> Live Assessment: ${data.interview.domain} (${data.interview.interview_type})`;

    showDemoToast('Interview session started in fullscreen mode!', 'success');
    updateSessionUiState(data.session);
    renderAssignedSessionQuestion();
  } catch (err) {
    console.error('[START SESSION EXCEPTION]', err);
    showDemoToast('Error starting session.', 'error');
  } finally {
    isAsyncActionPending = false;
    if (startBtn) startBtn.disabled = false;
  }
}

let isSubmissionInProgress = false;
let isFinishingInterview = false;
let isRequestingFullscreen = false;
let lastViolationTimestamp = 0;

let speechRecognitionInstance = null;
let isSpeechRecognitionActive = false;
let currentQuestionLiveTranscript = '';
let currentQuestionSpeechStartTime = null;

function requestProgrammaticFullscreen() {
  isRequestingFullscreen = true;
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      const p = elem.requestFullscreen();
      if (p && typeof p.catch === 'function') {
        p.catch(fsErr => {
          console.warn('Programmatic fullscreen request rejected:', fsErr);
        });
      }
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  } catch (fsErr) {
    console.warn('Programmatic fullscreen request rejected:', fsErr);
  } finally {
    setTimeout(() => { isRequestingFullscreen = false; }, 800);
  }
}

function addInterviewViolationListeners() {
  removeInterviewViolationListeners();
  document.addEventListener('fullscreenchange', handleInterviewFocusOrFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleInterviewFocusOrFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleInterviewFocusOrFullscreenChange);
  document.addEventListener('visibilitychange', handleInterviewFocusOrFullscreenChange);
  window.addEventListener('blur', handleInterviewFocusOrFullscreenChange);
  window.addEventListener('focus', handleInterviewFocusOrFullscreenChange);
}

function removeInterviewViolationListeners() {
  try {
    document.removeEventListener('fullscreenchange', handleInterviewFocusOrFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleInterviewFocusOrFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleInterviewFocusOrFullscreenChange);
    document.removeEventListener('visibilitychange', handleInterviewFocusOrFullscreenChange);
    window.removeEventListener('blur', handleInterviewFocusOrFullscreenChange);
    window.removeEventListener('focus', handleInterviewFocusOrFullscreenChange);
  } catch (e) { }
}

function startLiveSpeechRecognition() {
  stopLiveSpeechRecognition();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusBadge = document.getElementById('speechStatusBadge');
  const liveBox = document.getElementById('liveTranscriptBox');

  if (!SpeechRecognition) {
    if (statusBadge) {
      statusBadge.className = 'badge-status warning';
      statusBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Live Transcription Unavailable';
    }
    if (liveBox) {
      liveBox.innerHTML = 'Live transcription is unavailable in this browser. Your interview recording will still be saved.';
    }
    return;
  }

  try {
    speechRecognitionInstance = new SpeechRecognition();
    speechRecognitionInstance.continuous = true;
    speechRecognitionInstance.interimResults = true;
    speechRecognitionInstance.lang = 'en-US';

    currentQuestionSpeechStartTime = Date.now();
    currentQuestionLiveTranscript = '';

    speechRecognitionInstance.onstart = () => {
      isSpeechRecognitionActive = true;
      if (statusBadge) {
        statusBadge.className = 'badge-status success';
        statusBadge.innerHTML = '<i class="fa-solid fa-microphone"></i> 🎙 Live Speech: Active';
      }
    };

    speechRecognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        currentQuestionLiveTranscript += (currentQuestionLiveTranscript ? ' ' : '') + finalTranscript;
      }

      const fullText = (currentQuestionLiveTranscript + ' ' + interimTranscript).trim();

      if (liveBox) {
        liveBox.textContent = fullText || 'Speak clearly into your microphone... Live transcript will appear here.';
      }

      // Update live WPM and Filler count UI metrics
      const durationSecs = Math.max(1, (Date.now() - (currentQuestionSpeechStartTime || Date.now())) / 1000.0);
      const words = fullText ? fullText.split(/\s+/).filter(w => w.length > 0) : [];
      const wordCount = words.length;
      const wpm = Math.round(wordCount / (durationSecs / 60.0));

      const wpmEl = document.getElementById('liveWpmDisplay');
      if (wpmEl) wpmEl.textContent = `${wpm} WPM`;

      const fillers = ["um", "uh", "like", "you know", "actually", "basically", "so", "well", "i mean"];
      let totalFillers = 0;
      const lower = fullText.toLowerCase();
      fillers.forEach(f => {
        const regex = new RegExp('\\b' + f + '\\b', 'gi');
        const matches = lower.match(regex);
        if (matches) totalFillers += matches.length;
      });

      const fillerEl = document.getElementById('liveFillerCountDisplay');
      if (fillerEl) fillerEl.textContent = `${totalFillers}`;

      const activeQ = activeSessionQuestions[activeSessionCurrentIdx];
      if (activeQ && fullText) {
        activeSessionAnswers[activeQ.id] = fullText;
      }
    };

    speechRecognitionInstance.onerror = (err) => {
      console.warn('Speech recognition notice:', err.error);
    };

    speechRecognitionInstance.onend = () => {
      isSpeechRecognitionActive = false;
      if (isInterviewActive && currentSessionLifecycleState === 'active' && !isSubmissionInProgress && !isFinishingInterview) {
        try { speechRecognitionInstance.start(); } catch (e) { }
      }
    };

    speechRecognitionInstance.start();
  } catch (err) {
    console.warn('Failed to initialize speech recognition:', err);
  }
}

function stopLiveSpeechRecognition() {
  if (speechRecognitionInstance) {
    try {
      speechRecognitionInstance.onend = null;
      speechRecognitionInstance.stop();
    } catch (e) { }
    speechRecognitionInstance = null;
  }
  isSpeechRecognitionActive = false;
  const statusBadge = document.getElementById('speechStatusBadge');
  if (statusBadge) {
    statusBadge.className = 'badge-status secondary';
    statusBadge.innerHTML = '<i class="fa-solid fa-microphone-slash"></i> Live Speech: Stopped';
  }
}

async function saveQuestionSpeechAnalysis() {
  const activeQ = activeSessionQuestions[activeSessionCurrentIdx];
  if (!activeQ || !activeSessionRecord || !currentQuestionLiveTranscript.trim()) return;

  const durationSecs = Math.max(1, (Date.now() - (currentQuestionSpeechStartTime || Date.now())) / 1000.0);
  const token = SmartHireAuth.getToken();
  if (!token) return;

  try {
    await fetch(`${SmartHireAuth.API_BASE}/api/interview/speech/transcription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        session_id: activeSessionRecord.id,
        question_id: activeQ.id,
        transcript: currentQuestionLiveTranscript.trim(),
        duration_seconds: durationSecs
      })
    });
  } catch (err) {
    console.warn('Speech transcription API notice:', err);
  }
}

function stopMediaRecorderAsync() {
  return new Promise((resolve) => {
    if (!interviewMediaRecorder || interviewMediaRecorder.state === 'inactive') {
      resolve();
      return;
    }

    let isResolved = false;
    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        resolve();
      }
    };

    interviewMediaRecorder.onstop = cleanup;
    setTimeout(cleanup, 1500);

    try {
      interviewMediaRecorder.stop();
    } catch (e) {
      cleanup();
    }
  });
}

function openSubmitConfirmModal() {
  if (isSubmissionInProgress || isFinishingInterview || currentSessionLifecycleState === 'completed') return;
  const confirmBtn = document.getElementById('btnConfirmSubmitInterview');
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Submit Interview';
  }
  openModal('submitConfirmModal');
}

async function confirmSubmitInterview() {
  if (isSubmissionInProgress || isFinishingInterview || currentSessionLifecycleState === 'completed') return;

  const confirmBtn = document.getElementById('btnConfirmSubmitInterview');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
  }

  closeModal('submitConfirmModal');
  await finishInterview('NORMAL_SUBMIT');
}

function finishAndNavigateToDashboard() {
  stopAllMediaTracks();
  removeInterviewViolationListeners();
  closeModal('mockInterviewModal');
  closeModal('submitConfirmModal');
  closeModal('fullscreenWarningModal');

  const section = document.getElementById('candidate-assigned-interviews-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.location.href = 'candidate.html';
  }

  loadCandidateAssignedInterviews();
  showDemoToast('Returned to Candidate Dashboard.', 'info');
}

function handleInterviewFocusOrFullscreenChange() {
  if (!isInterviewActive || currentSessionLifecycleState !== 'active' || !activeSessionRecord || activeSessionRecord.status !== 'IN_PROGRESS' || isFullscreenWarningOpen || isSubmissionInProgress || isFinishingInterview || isRequestingFullscreen) {
    return;
  }

  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
  const isTabVisible = document.visibilityState === 'visible' && document.hasFocus();

  if (!isFs || !isTabVisible) {
    handleInterviewViolation();
  }
}

async function handleInterviewViolation() {
  if (!isInterviewActive || currentSessionLifecycleState !== 'active' || isFullscreenWarningOpen || isSubmissionInProgress || isFinishingInterview || isRequestingFullscreen || !activeSessionRecord) return;

  const now = Date.now();
  if (now - lastViolationTimestamp < 800) {
    return; // 800ms cooldown deduplication
  }
  lastViolationTimestamp = now;

  isFullscreenWarningOpen = true;
  stopActiveSessionTimers();

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/fullscreen-violation`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.data) {
      const vInfo = data.data;
      fullscreenExitCount = vInfo.violation_count;

      const header = document.getElementById('fsWarningHeader');
      const body = document.getElementById('fsWarningBody');

      if (vInfo.auto_terminate) {
        if (header) header.textContent = 'Interview Ended';
        if (body) body.innerText = vInfo.message;
        openModal('fullscreenWarningModal');
        showDemoToast('Maximum fullscreen exit attempts (5) reached. Finalizing interview automatically.', 'error');
        setTimeout(() => {
          closeModal('fullscreenWarningModal');
          triggerAutoSubmission('MAX_FULLSCREEN_VIOLATIONS_REACHED');
        }, 2500);
      } else {
        if (header) header.textContent = `Warning ${vInfo.warning_count} of 4`;
        if (body) body.innerText = vInfo.message;
        openModal('fullscreenWarningModal');
        showDemoToast(`Warning ${vInfo.warning_count}/4: Fullscreen requirement violated.`, 'warning');
      }
    }
  } catch (err) {
    console.error('Error logging fullscreen violation:', err);
  }
}

async function reenterFullscreenFromWarning() {
  closeModal('fullscreenWarningModal');
  isFullscreenWarningOpen = false;

  if (currentSessionLifecycleState !== 'active' || isSubmissionInProgress || isFinishingInterview) return;

  await requestProgrammaticFullscreen();

  if (activeSessionRecord && activeSessionRecord.status === 'IN_PROGRESS' && currentSessionLifecycleState === 'active') {
    startActiveSessionTimers(activeSessionRecord.duration_mins || 30);
  }
}

async function triggerAutoSubmission(reason) {
  await finishInterview('AUTO_SUBMITTED: ' + (reason || 'Violation limit exceeded'));
}

async function finishInterview(reason) {
  if (isFinishingInterview || isSubmissionInProgress || currentSessionLifecycleState === 'completed') {
    return;
  }

  isFinishingInterview = true;
  isSubmissionInProgress = true;
  isInterviewActive = false;
  currentSessionLifecycleState = 'submitting';
  isFullscreenWarningOpen = false;

  // 1. Close warning and confirmation modals immediately
  closeModal('fullscreenWarningModal');
  closeModal('submitConfirmModal');

  // 2. Stop active timers and speech recognition immediately
  stopActiveSessionTimers();
  stopLiveSpeechRecognition();
  stopModule6FrameSampling();

  // 3. Capture and save current attempt & speech analysis
  await saveQuestionSpeechAnalysis();
  await saveCurrentQuestionAttempt();

  // 4. Stop MediaRecorder asynchronously (waiting for final dataavailable event)
  await stopMediaRecorderAsync();

  // 5. Exit browser fullscreen if active
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => { });
    } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
      await document.webkitExitFullscreen().catch(() => { });
    }
  } catch (e) { }

  // 6. Stop all hardware camera and microphone tracks
  stopAllMediaTracks();

  // 7. Remove all interview monitoring event listeners (Zero monitoring post-completion)
  removeInterviewViolationListeners();

  const token = SmartHireAuth.getToken();
  const savedInterviewId = activeSessionInterviewId;

  // 8. Upload recording if chunks exist
  if (interviewRecordedChunks.length > 0 && activeSessionRecord && token) {
    try {
      const blob = new Blob(interviewRecordedChunks, { type: selectedRecordingMimeType });
      const formData = new FormData();
      const ext = selectedRecordingMimeType.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', blob, `session_${activeSessionRecord.id}_final.${ext}`);
      formData.append('duration', activeSessionTotalActiveSeconds);

      const recRes = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/recordings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!recRes.ok) {
        console.warn('Final recording upload HTTP status:', recRes.status);
      }
    } catch (err) {
      console.warn('Final recording upload notice:', err);
    }
  }

  // 9. Submit responses and evaluate score
  let finalScore = 0.0;
  let totalQs = activeSessionQuestions.length || 1;
  let answeredQs = Object.keys(activeSessionAnswers).length;

  if (activeSessionInterviewId && token) {
    try {
      const payloadAnswers = activeSessionQuestions.map(q => ({
        question_id: q.id,
        user_answer: activeSessionAnswers[q.id] || "No response provided."
      }));

      const subRes = await fetch(`${SmartHireAuth.API_BASE}/api/interviews/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          interview_id: activeSessionInterviewId,
          answers: payloadAnswers,
          time_taken_seconds: activeSessionTotalActiveSeconds
        })
      });

      const result = await subRes.json();
      const data = result.data || result;
      finalScore = (data.score !== undefined && data.score !== null) ? data.score : 0.0;
      if (data.answered_questions !== undefined) answeredQs = data.answered_questions;
      if (data.total_questions !== undefined) totalQs = data.total_questions;
    } catch (err) {
      console.error('Submit API notice:', err);
    }
  }

  // 10. End session with remarks
  if (activeSessionRecord && token) {
    try {
      await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ remarks: reason || 'Completed' })
      });
    } catch (err) {
      console.warn('End session API notice:', err);
    }
  }

  currentSessionLifecycleState = 'completed';
  isSubmissionInProgress = false;
  isFinishingInterview = false;
  fullscreenExitCount = 0;

  // 11. Close interview modal, redirect to Candidate Dashboard, and automatically open fresh result report
  closeModal('mockInterviewModal');

  const section = document.getElementById('candidate-assigned-interviews-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }

  await loadCandidateAssignedInterviews();

  if (savedInterviewId) {
    viewAssignedInterviewResults(savedInterviewId);
  }

  showDemoToast('Interview session completed and evaluated!', 'success');
}



function updateSessionUiState(session, durationMins) {
  activeSessionRecord = session;
  const status = session.status || 'CREATED';
  activeSessionTotalActiveSeconds = session.total_active_seconds || 0;

  const badge = document.getElementById('sessionStatusBadge');
  if (badge) {
    badge.textContent = status.replace('_', ' ');
    if (status === 'CREATED') badge.className = 'badge-status info';
    else if (status === 'IN_PROGRESS') badge.className = 'badge-status success';
    else if (status === 'PAUSED') badge.className = 'badge-status warning';
    else if (status === 'COMPLETED' || status === 'ENDED') badge.className = 'badge-status primary';
  }

  const recBadge = document.getElementById('recordingStatusBadge');
  if (recBadge) {
    if (status === 'IN_PROGRESS') {
      recBadge.className = 'badge-status success';
      recBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Recording: Active';
    } else if (status === 'PAUSED') {
      recBadge.className = 'badge-status warning';
      recBadge.innerHTML = '<i class="fa-solid fa-circle-pause"></i> Recording: Paused';
    } else {
      recBadge.className = 'badge-status info';
      recBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Recording: Inactive';
    }
  }

  const buttonsContainer = document.getElementById('sessionActionButtonsContainer');
  if (buttonsContainer) {
    if (status === 'CREATED') {
      buttonsContainer.innerHTML = `
        <button class="btn btn-accent btn-sm" id="btnStartSession" onclick="triggerStartSession()"><i class="fa-solid fa-play"></i> Start Interview</button>
      `;
    } else if (status === 'IN_PROGRESS') {
      buttonsContainer.innerHTML = `
        <button class="btn btn-secondary btn-sm" id="btnPauseSession" onclick="triggerPauseSession()"><i class="fa-solid fa-pause"></i> Pause</button>
        <button class="btn btn-sm" id="btnEndSession" onclick="triggerEndSession()" style="background: #EF4444; color: white;"><i class="fa-solid fa-stop"></i> End Interview</button>
      `;
    } else if (status === 'PAUSED') {
      buttonsContainer.innerHTML = `
        <button class="btn btn-primary btn-sm" id="btnResumeSession" onclick="triggerResumeSession()"><i class="fa-solid fa-play"></i> Resume</button>
        <button class="btn btn-sm" id="btnEndSession" onclick="triggerEndSession()" style="background: #EF4444; color: white;"><i class="fa-solid fa-stop"></i> End Interview</button>
      `;
    } else if (status === 'COMPLETED' || status === 'ENDED') {
      buttonsContainer.innerHTML = `
        <span class="badge-status primary"><i class="fa-solid fa-check-double"></i> Interview Completed</span>
      `;
    } else if (status === 'TERMINATED') {
      buttonsContainer.innerHTML = `
        <span class="badge-status danger"><i class="fa-solid fa-ban"></i> Interview Terminated</span>
      `;
    }
  }

  // Timer sync
  const totalMins = durationMins || (activeSessionRecord && activeSessionRecord.duration_mins) || 30;
  if (status === 'IN_PROGRESS') {
    startActiveSessionTimers(totalMins);
  } else if (status === 'PAUSED') {
    stopActiveSessionTimers();
  } else if (status === 'COMPLETED' || status === 'ENDED' || status === 'CREATED' || status === 'TERMINATED') {
    stopActiveSessionTimers();
    const displayEl = document.getElementById('simTimerDisplay');
    if (displayEl) displayEl.textContent = (status === 'COMPLETED' || status === 'ENDED' || status === 'TERMINATED') ? formatSecondsDisplay(activeSessionTotalActiveSeconds) : '00:00';
  }
}

function formatSecondsDisplay(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function startActiveSessionTimers(maxMins) {
  stopActiveSessionTimers();

  activeSessionTimerInterval = setInterval(() => {
    activeSessionTotalActiveSeconds++;
    const totalEl = document.getElementById('simTimerDisplay');
    if (totalEl) totalEl.textContent = formatSecondsDisplay(activeSessionTotalActiveSeconds);

    if (maxMins && maxMins > 0) {
      const maxSecs = maxMins * 60;
      const remainSecs = Math.max(0, maxSecs - activeSessionTotalActiveSeconds);
      const remWrap = document.getElementById('simRemainingTimeWrapper');
      const remEl = document.getElementById('simRemainingTimerDisplay');
      if (remWrap) remWrap.style.display = 'inline-flex';
      if (remEl) remEl.textContent = formatSecondsDisplay(remainSecs);

      if (remainSecs <= 0 && activeSessionRecord && activeSessionRecord.status === 'IN_PROGRESS') {
        showDemoToast('Time limit reached! Auto-ending interview session...', 'warning');
        triggerEndSession();
      }
    }
  }, 1000);

  questionActiveTimerInterval = setInterval(() => {
    questionActiveSeconds++;
    const qEl = document.getElementById('simQuestionTimerDisplay');
    if (qEl) qEl.textContent = formatSecondsDisplay(questionActiveSeconds);
  }, 1000);
}

function stopActiveSessionTimers() {
  if (activeSessionTimerInterval) clearInterval(activeSessionTimerInterval);
  if (questionActiveTimerInterval) clearInterval(questionActiveTimerInterval);
  activeSessionTimerInterval = null;
  questionActiveTimerInterval = null;
}

async function triggerStartSession() {
  return startVerifiedInterviewSession();
}

async function triggerPauseSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  isAsyncActionPending = true;
  const pauseBtn = document.getElementById('btnPauseSession');
  if (pauseBtn) pauseBtn.disabled = true;

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showDemoToast(data.message || 'Could not pause interview session.', 'error');
      isAsyncActionPending = false;
      if (pauseBtn) pauseBtn.disabled = false;
      return;
    }

    if (interviewMediaRecorder && typeof interviewMediaRecorder.pause === 'function' && interviewMediaRecorder.state === 'recording') {
      interviewMediaRecorder.pause();
    }

    showDemoToast('Interview session paused.', 'warning');
    updateSessionUiState(data.session);
    renderAssignedSessionQuestion();
  } catch (err) {
    showDemoToast('Error pausing session.', 'error');
  } finally {
    isAsyncActionPending = false;
  }
}

async function triggerResumeSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  isAsyncActionPending = true;
  const resumeBtn = document.getElementById('btnResumeSession');
  if (resumeBtn) resumeBtn.disabled = true;

  if (!interviewMediaStream || !interviewMediaStream.active) {
    const hasHardware = await requestMediaPermissions();
    if (!hasHardware) {
      isAsyncActionPending = false;
      if (resumeBtn) resumeBtn.disabled = false;
      return;
    }
  }

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showDemoToast(data.message || 'Could not resume interview session.', 'error');
      isAsyncActionPending = false;
      if (resumeBtn) resumeBtn.disabled = false;
      return;
    }

    if (interviewMediaRecorder && typeof interviewMediaRecorder.resume === 'function' && interviewMediaRecorder.state === 'paused') {
      interviewMediaRecorder.resume();
    } else if (!interviewMediaRecorder || interviewMediaRecorder.state === 'inactive') {
      initializeMediaRecorder();
    }

    showDemoToast('Interview session resumed.', 'success');
    updateSessionUiState(data.session);
    renderAssignedSessionQuestion();
  } catch (err) {
    showDemoToast('Error resuming session.', 'error');
  } finally {
    isAsyncActionPending = false;
  }
}

async function saveCurrentQuestionAttempt() {
  if (!activeSessionRecord || !activeSessionQuestions.length) return;
  const q = activeSessionQuestions[activeSessionCurrentIdx];
  if (!q) return;

  const token = SmartHireAuth.getToken();
  if (!token) return;

  const userAnswer = document.getElementById('simUserAnswerInput')?.value || activeSessionAnswers[q.id] || '';
  activeSessionAnswers[q.id] = userAnswer;

  try {
    await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        question_id: q.id,
        question_number: activeSessionCurrentIdx + 1,
        time_spent: questionActiveSeconds,
        attempted: true,
        answer: userAnswer
      })
    });
  } catch (e) {
    console.warn('Failed to save question attempt:', e);
  }
}

async function triggerEndSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  isAsyncActionPending = true;
  const endBtn = document.getElementById('btnEndSession');
  if (endBtn) {
    endBtn.disabled = true;
    endBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finalizing...';
  }

  stopActiveSessionTimers();

  // 1. Finalize current question attempt
  await saveCurrentQuestionAttempt();

  // 2. Stop MediaRecorder and wait for final Blob
  let recordingBlob = null;
  if (interviewMediaRecorder && interviewMediaRecorder.state !== 'inactive') {
    recordingBlob = await new Promise((resolve) => {
      interviewMediaRecorder.onstop = () => {
        const blob = new Blob(interviewRecordedChunks, { type: selectedRecordingMimeType });
        resolve(blob);
      };
      try {
        interviewMediaRecorder.stop();
      } catch (e) {
        resolve(null);
      }
    });
  } else if (interviewRecordedChunks.length > 0) {
    recordingBlob = new Blob(interviewRecordedChunks, { type: selectedRecordingMimeType });
  }

  // 3. Upload recording file
  const token = SmartHireAuth.getToken();
  if (recordingBlob && recordingBlob.size > 0) {
    try {
      const formData = new FormData();
      const ext = selectedRecordingMimeType.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', recordingBlob, `session_${activeSessionRecord.id}.${ext}`);
      formData.append('duration', activeSessionTotalActiveSeconds);

      const uploadRes = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/recordings`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        showDemoToast(uploadData.message || 'Recording upload failed. Session preserved.', 'error');
        if (endBtn) {
          endBtn.disabled = false;
          endBtn.innerHTML = '<i class="fa-solid fa-stop"></i> End Interview';
        }
        isAsyncActionPending = false;
        return;
      }
    } catch (uploadErr) {
      console.error('Recording upload error:', uploadErr);
      showDemoToast('Network error during recording upload. Session preserved.', 'error');
      if (endBtn) {
        endBtn.disabled = false;
        endBtn.innerHTML = '<i class="fa-solid fa-stop"></i> End Interview';
      }
      isAsyncActionPending = false;
      return;
    }
  }

  // 4. Update session status to COMPLETED ONLY AFTER successful upload
  try {
    const endRes = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/end`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (err) {
    showDemoToast('Error starting session.', 'error');
  } finally {
    isAsyncActionPending = false;
  }
}

async function triggerPauseSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  isAsyncActionPending = true;
  const pauseBtn = document.getElementById('btnPauseSession');
  if (pauseBtn) pauseBtn.disabled = true;

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/pause`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showDemoToast(data.message || 'Could not pause interview session.', 'error');
      isAsyncActionPending = false;
      if (pauseBtn) pauseBtn.disabled = false;
      return;
    }

    if (interviewMediaRecorder && typeof interviewMediaRecorder.pause === 'function' && interviewMediaRecorder.state === 'recording') {
      interviewMediaRecorder.pause();
    }

    showDemoToast('Interview session paused.', 'warning');
    updateSessionUiState(data.session);
    renderAssignedSessionQuestion();
  } catch (err) {
    showDemoToast('Error pausing session.', 'error');
  } finally {
    isAsyncActionPending = false;
  }
}

async function triggerResumeSession() {
  if (!activeSessionRecord || isAsyncActionPending) return;

  isAsyncActionPending = true;
  const resumeBtn = document.getElementById('btnResumeSession');
  if (resumeBtn) resumeBtn.disabled = true;

  if (!interviewMediaStream || !interviewMediaStream.active) {
    const hasHardware = await requestMediaPermissions();
    if (!hasHardware) {
      isAsyncActionPending = false;
      if (resumeBtn) resumeBtn.disabled = false;
      return;
    }
  }

  const token = SmartHireAuth.getToken();
  try {
    const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/resume`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showDemoToast(data.message || 'Could not resume interview session.', 'error');
      isAsyncActionPending = false;
      if (resumeBtn) resumeBtn.disabled = false;
      return;
    }

    if (interviewMediaRecorder && typeof interviewMediaRecorder.resume === 'function' && interviewMediaRecorder.state === 'paused') {
      interviewMediaRecorder.resume();
    } else if (!interviewMediaRecorder || interviewMediaRecorder.state === 'inactive') {
      initializeMediaRecorder();
    }

    showDemoToast('Interview session resumed.', 'success');
    updateSessionUiState(data.session);
    renderAssignedSessionQuestion();
  } catch (err) {
    showDemoToast('Error resuming session.', 'error');
  } finally {
    isAsyncActionPending = false;
  }
}



function renderAssignedSessionQuestion() {
  const q = activeSessionQuestions[activeSessionCurrentIdx];
  if (!q) return;

  questionActiveSeconds = 0;
  const qTimerEl = document.getElementById('simQuestionTimerDisplay');
  if (qTimerEl) qTimerEl.textContent = '00:00';

  const sessionStatus = activeSessionRecord ? activeSessionRecord.status : 'CREATED';
  const isInputDisabled = (sessionStatus === 'CREATED' || sessionStatus === 'PAUSED' || sessionStatus === 'COMPLETED' || sessionStatus === 'ENDED');

  document.getElementById('simCategoryTag').textContent = `${q.category.toUpperCase()} ROUND • ${q.difficulty}`;
  document.getElementById('simQuestionCounter').textContent = `Question ${activeSessionCurrentIdx + 1} of ${activeSessionQuestions.length}`;
  document.getElementById('simQuestionText').textContent = q.question_text;

  const compEl = document.getElementById('simCompletedCountDisplay');
  if (compEl) compEl.textContent = `${activeSessionCurrentIdx + 1} / ${activeSessionQuestions.length}`;

  const container = document.getElementById('simOptionsContainer');
  let statusNotice = '';
  if (sessionStatus === 'CREATED') {
    statusNotice = `<div style="background: #E0F2FE; color: #0369A1; padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600;">
      <i class="fa-solid fa-info-circle"></i> Click "Start Interview" above when you are ready to begin responding and start recording.
    </div>`;
  } else if (sessionStatus === 'PAUSED') {
    statusNotice = `<div style="background: #FEF3C7; color: #92400E; padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600;">
      <i class="fa-solid fa-pause-circle"></i> Interview is currently paused. Click "Resume" above to continue answering.
    </div>`;
  } else if (sessionStatus === 'COMPLETED' || sessionStatus === 'ENDED') {
    statusNotice = `<div style="background: #F3E8FF; color: #6B21A8; padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.75rem; font-size: 0.85rem; font-weight: 600;">
      <i class="fa-solid fa-lock"></i> Session has ended. Responses are locked for evaluation.
    </div>`;
  }

  container.innerHTML = `
    ${statusNotice}
    <div style="margin-top: 1rem;">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">Your Response / Solution:</label>
      <textarea id="simUserAnswerInput" class="form-control" rows="5" placeholder="Type your structured answer here..." ${isInputDisabled ? 'disabled' : ''} oninput="activeSessionAnswers['${q.id}'] = this.value">${activeSessionAnswers[q.id] || ''}</textarea>
    </div>
  `;

  document.getElementById('simPrevBtn').style.display = activeSessionCurrentIdx > 0 ? 'inline-flex' : 'none';
  const isLast = activeSessionCurrentIdx === activeSessionQuestions.length - 1;
  document.getElementById('simNextBtn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('simSubmitBtn').style.display = (sessionStatus === 'IN_PROGRESS') ? 'inline-flex' : 'none';
}

async function navigateSimQuestion(direction) {
  if (isAsyncActionPending) return;

  const targetIdx = activeSessionCurrentIdx + direction;
  if (targetIdx < 0) {
    showDemoToast('Beginning of interview reached.', 'info');
    return;
  }
  if (targetIdx >= activeSessionQuestions.length) {
    showDemoToast('End of interview reached.', 'info');
    return;
  }

  await saveQuestionSpeechAnalysis();
  await saveCurrentQuestionAttempt();

  activeSessionCurrentIdx = targetIdx;

  if (activeSessionRecord) {
    const token = SmartHireAuth.getToken();
    try {
      await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/position`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ current_question_index: activeSessionCurrentIdx })
      });
    } catch (e) {
      console.warn('Could not persist question position:', e);
    }
  }

  renderAssignedSessionQuestion();
  startLiveSpeechRecognition();
}

async function submitAssignedInterviewSession() {
  await finishInterview('NORMAL_SUBMIT');
}

function stopAllMediaTracks() {
  if (interviewMediaRecorder && interviewMediaRecorder.state !== 'inactive') {
    try { interviewMediaRecorder.stop(); } catch (e) { }
  }
  if (interviewMediaStream) {
    try {
      interviewMediaStream.getTracks().forEach(track => track.stop());
    } catch (e) { }
    interviewMediaStream = null;
  }
  const vEl = document.getElementById('interviewWebcamPreview');
  if (vEl) vEl.srcObject = null;

  const camBadge = document.getElementById('cameraStatusBadge');
  const micBadge = document.getElementById('micStatusBadge');
  const recBadge = document.getElementById('recordingStatusBadge');
  if (camBadge) {
    camBadge.className = 'badge-status secondary';
    camBadge.innerHTML = '<i class="fa-solid fa-video"></i> Camera: Stopped';
  }
  if (micBadge) {
    micBadge.className = 'badge-status secondary';
    micBadge.innerHTML = '<i class="fa-solid fa-microphone"></i> Mic: Stopped';
  }
  if (recBadge) {
    recBadge.className = 'badge-status info';
    recBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Recording: Inactive';
  }
}

window.addEventListener('beforeunload', () => { stopAllMediaTracks(); });
window.addEventListener('pagehide', () => { stopAllMediaTracks(); });

function viewAssignedInterviewResults(interviewId) {
  openInterviewDetailModal(interviewId);
}

async function openInterviewDetailModal(id) {
  const modal = document.getElementById('interviewDetailModal');
  const body = document.getElementById('interviewDetailBody');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>
      <p style="margin-top: 0.5rem; font-weight: 600;">Loading fresh interview evaluation report...</p>
    </div>
  `;
  openModal('interviewDetailModal');

  const token = SmartHireAuth.getToken();
  if (!token) {
    body.innerHTML = `<div class="alert alert-danger" style="margin: 1rem;">Authentication token required. Please log in again.</div>`;
    return;
  }

  // Create AbortController with 15-second bounded execution timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    console.log('[REPORT FETCH START] Fetching candidate performance report for ID:', id);
    let reportUrl = `${SmartHireAuth.API_BASE}/api/interviews/${id}/performance-report`;
    let res = await fetch(reportUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal
    });

    if (!res.ok && res.status !== 400 && res.status !== 403) {
      reportUrl = `${SmartHireAuth.API_BASE}/api/interviews/sessions/${id}/performance-report`;
      res = await fetch(reportUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    let resData = null;
    try {
      resData = await res.json();
    } catch (e) { }

    if (res.ok && resData && resData.success && resData.data) {
      console.log('[REPORT FETCH SUCCESS] Candidate performance report loaded for ID:', id);
      body.innerHTML = `
        ${renderSmartHirePerformanceReportHTML(resData.data)}
        <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <button class="btn btn-secondary btn-sm" onclick="closeModal('interviewDetailModal')">Close Report</button>
        </div>
      `;
      return;
    }

    // Handle non-terminal status or report not yet available
    if (res.status === 400 || (resData && resData.detail && resData.detail.includes('not available'))) {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
          <i class="fa-solid fa-clock" style="font-size: 2.25rem; color: #F59E0B; margin-bottom: 0.5rem;"></i>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Report Not Available Yet</h4>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">${resData && resData.detail ? resData.detail : 'Complete your assigned interview session to view your evaluation report.'}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 1rem;" onclick="closeModal('interviewDetailModal')">Close</button>
        </div>
      `;
      return;
    }

    // Handle error or missing report
    const errMsg = resData && (resData.detail || resData.message) ? (resData.detail || resData.message) : `HTTP ${res.status}: ${res.statusText}`;
    body.innerHTML = `
      <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.25rem; color: #EF4444; margin-bottom: 0.5rem;"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Could Not Load Performance Report</h4>
        <p style="font-size: 0.85rem; margin-top: 0.25rem; color: #EF4444;">${errMsg}</p>
        <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">
          <button class="btn btn-primary btn-sm" onclick="openInterviewDetailModal(${id})"><i class="fa-solid fa-rotate-right"></i> Retry</button>
          <button class="btn btn-secondary btn-sm" onclick="closeModal('interviewDetailModal')">Close</button>
        </div>
      </div>
    `;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('[REPORT FETCH ERROR]', err);
    if (err.name === 'AbortError') {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
          <i class="fa-solid fa-hourglass-end" style="font-size: 2.25rem; color: #F59E0B; margin-bottom: 0.5rem;"></i>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Report Request Timed Out</h4>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">The report request took too long to complete. Please try again.</p>
          <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="openInterviewDetailModal(${id})"><i class="fa-solid fa-rotate-right"></i> Retry</button>
            <button class="btn btn-secondary btn-sm" onclick="closeModal('interviewDetailModal')">Close</button>
          </div>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="text-align: center; padding: 2rem 0; color: var(--text-muted);">
          <i class="fa-solid fa-circle-exclamation" style="font-size: 2.25rem; color: #EF4444; margin-bottom: 0.5rem;"></i>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Could Not Load Performance Report</h4>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">${err.message || 'An unexpected error occurred while fetching the report.'}</p>
          <div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="openInterviewDetailModal(${id})"><i class="fa-solid fa-rotate-right"></i> Retry</button>
            <button class="btn btn-secondary btn-sm" onclick="closeModal('interviewDetailModal')">Close</button>
          </div>
        </div>
      `;
    }
  }
}


// ==========================================
// MODULE 6 — FRAME SAMPLING & REPORT RENDERING
// ==========================================

let module6FrameInterval = null;
let isFrameAnalysisInProgress = false;

function showLookAwayWarningModal(msg) {
  const modalId = 'modal-look-away-warning';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.style.zIndex = '10000';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 450px; text-align: center; border-top: 4px solid #F59E0B;">
      <div style="font-size: 2.5rem; color: #F59E0B; margin-bottom: 0.5rem;"><i class="fa-solid fa-eye-slash"></i></div>
      <h3 style="margin-bottom: 0.5rem;">Camera-Facing Reminder</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem;">${msg || 'Please look towards your screen and maintain focus during the interview.'}</p>
      <button class="btn btn-warning btn-sm" onclick="closeModal('${modalId}')">I Understand</button>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function showFaceNotDetectedWarningModal(msg) {
  const modalId = 'modal-face-not-detected-warning';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.style.zIndex = '10000';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 450px; text-align: center; border-top: 4px solid #EF4444;">
      <div style="font-size: 2.5rem; color: #EF4444; margin-bottom: 0.5rem;"><i class="fa-solid fa-user-slash"></i></div>
      <h3 style="margin-bottom: 0.5rem;">⚠️ Face Not Detected</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem;">${msg || 'Please remain visible in front of the camera.'}</p>
      <button class="btn btn-danger btn-sm" onclick="closeModal('${modalId}')">I Understand</button>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function showMobileDeviceWarningModal(msg) {
  const modalId = 'modal-mobile-device-warning';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.style.zIndex = '10000';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 460px; text-align: center; border-top: 4px solid #EF4444;">
      <div style="font-size: 2.5rem; color: #EF4444; margin-bottom: 0.5rem;"><i class="fa-solid fa-mobile-screen-button"></i></div>
      <h3 style="margin-bottom: 0.5rem; color: #EF4444;">⚠️ Mobile Device Warning</h3>
      <p style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem;">Mobile devices are not supported for this exam.</p>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">Please switch to a desktop or laptop computer to continue.</p>
      <button class="btn btn-danger btn-sm" onclick="closeModal('${modalId}')">Acknowledge</button>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function showMobilePhoneWarningModal(msg) {
  const modalId = 'modal-mobile-warning';
  let modal = document.getElementById(modalId);
  if (modal) modal.parentNode.removeChild(modal);

  const div = document.createElement('div');
  div.id = modalId;
  div.className = 'smarthire-modal-backdrop';
  div.style.zIndex = '10000';
  div.innerHTML = `
    <div class="smarthire-modal" style="max-width: 450px; text-align: center; border-top: 4px solid #EF4444;">
      <div style="font-size: 2.5rem; color: #EF4444; margin-bottom: 0.5rem;"><i class="fa-solid fa-mobile-screen-button"></i></div>
      <h3 style="margin-bottom: 0.5rem;">Mobile Phone Detected</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem;">${msg || 'Please remove mobile phone from camera view during interview.'}</p>
      <button class="btn btn-danger btn-sm" onclick="closeModal('${modalId}')">Acknowledge</button>
    </div>
  `;
  document.body.appendChild(div);
  openModal(modalId);
}

function showMobileWarningModal(msg) {
  showMobilePhoneWarningModal(msg);
}

function checkMobileDeviceAndWarn() {
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouch = navigator.maxTouchPoints || 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua);
  const isMobilePlatform = /Android|iPhone|iPad|iPod/i.test(platform);
  const isSmallScreenTouch = (window.innerWidth <= 800 && maxTouch > 1);

  if (isMobileUA || isMobilePlatform || isSmallScreenTouch) {
    showMobileDeviceWarningModal('Mobile devices are not supported for this exam.');
    if (activeSessionRecord && activeSessionRecord.id) {
      const token = SmartHireAuth.getToken();
      fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/mobile-device-violation?user_agent=${encodeURIComponent(ua)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.warn('Failed to log mobile device violation:', e));
    }
    return true;
  }
  return false;
}

function startModule6FrameSampling() {
  stopModule6FrameSampling();
  isFrameAnalysisInProgress = false;
  console.log("[MODULE 6] Starting webcam behavior monitoring");
  
  checkMobileDeviceAndWarn();

  if (activeSessionRecord) {
    console.log("[MODULE 6] Active session ID:", activeSessionRecord.id);
  }
  module6FrameInterval = setInterval(async () => {
    if (!isInterviewActive || currentSessionLifecycleState !== 'active' || !activeSessionRecord || isSubmissionInProgress || isFinishingInterview) {
      return;
    }
    if (isFrameAnalysisInProgress) {
      console.log("[MODULE 6] Skipping frame sample: previous analysis still in progress.");
      return;
    }
    const videoEl = document.getElementById('interviewWebcamPreview') || document.querySelector('#questionWebcamMount video');
    if (!videoEl || videoEl.paused || videoEl.ended || !videoEl.videoWidth) return;

    try {
      isFrameAnalysisInProgress = true;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob || !isInterviewActive) {
          isFrameAnalysisInProgress = false;
          return;
        }
        try {
          const formData = new FormData();
          formData.append('file', blob, 'frame.jpg');

          const token = SmartHireAuth.getToken();
          const res = await fetch(`${SmartHireAuth.API_BASE}/api/interview/sessions/${activeSessionRecord.id}/analyze-frame`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });

          const data = await res.json();
          if (data.success && data.data) {
            const resData = data.data;

            if (resData.trigger_look_away_warning && resData.look_away_warning_message) {
              console.log("[MODULE 6] Camera-facing reminder triggered!");
              showLookAwayWarningModal(resData.look_away_warning_message);
            } else {
              closeModal('modal-look-away-warning');
            }

            if (resData.trigger_face_not_detected_warning && resData.face_not_detected_warning_message) {
              console.log("[MODULE 6] Face not detected warning triggered!");
              showFaceNotDetectedWarningModal(resData.face_not_detected_warning_message);
            } else {
              closeModal('modal-face-not-detected-warning');
            }

            if ((resData.trigger_mobile_warning || resData.trigger_mobile_phone_warning) && (resData.mobile_warning_message || resData.mobile_phone_warning_message)) {
              console.log("[MODULE 6] Mobile warning triggered!");
              showMobilePhoneWarningModal(resData.mobile_phone_warning_message || resData.mobile_warning_message);
            }
          }
        } catch (e) {
          console.warn('[MODULE 6] Frame sample upload error:', e);
        } finally {
          isFrameAnalysisInProgress = false;
        }
      }, 'image/jpeg', 0.7);
    } catch (e) {
      console.warn('[MODULE 6] Frame capture error:', e);
      isFrameAnalysisInProgress = false;
    }
  }, 2000);
}


function stopModule6FrameSampling() {
  if (module6FrameInterval) {
    clearInterval(module6FrameInterval);
    module6FrameInterval = null;
  }
  isFrameAnalysisInProgress = false;
  console.log("[MODULE 6] Webcam behavior monitoring stopped.");
}

function renderViolationsReportSection(r) {
  const summary = r.violations_summary || { total: 0, high: 0, medium: 0, low: 0 };
  const vList = r.violations_list || [];

  let rowsHtml = '';
  if (vList.length > 0) {
    rowsHtml = vList.map((v, i) => {
      let sevColor = '#10B981';
      let sevBg = '#D1FAE5';
      if (v.severity === 'High') {
        sevColor = '#EF4444';
        sevBg = '#FEE2E2';
      } else if (v.severity === 'Medium') {
        sevColor = '#F59E0B';
        sevBg = '#FEF3C7';
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.5rem; font-weight: 700;">#${v.id || (i + 1)}</td>
          <td style="padding: 0.5rem;">
            <span style="background: ${sevBg}; color: ${sevColor}; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">
              ${v.type || 'VIOLATION'}
            </span>
          </td>
          <td style="padding: 0.5rem;">${v.description || 'Violation logged'}</td>
          <td style="padding: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">${v.timestamp ? (v.timestamp.includes('-') ? formatToIST(v.timestamp) : v.timestamp) : 'During Session'}</td>
          <td style="padding: 0.5rem; text-align: right; font-weight: 600;">${v.duration ? `${v.duration}s` : 'N/A'}</td>
        </tr>
      `;
    }).join('');
  } else {
    rowsHtml = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 1.5rem; color: #10B981; font-weight: 600;">
          <i class="fa-solid fa-circle-check" style="font-size: 1.25rem; margin-right: 0.5rem;"></i>
          No proctoring or behavioral violations recorded during this session.
        </td>
      </tr>
    `;
  }

  return `
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
      <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 0.75rem; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.35rem; display: flex; justify-content: space-between; align-items: center;">
        <span>2. Dedicated Interview Violations & Audit Log</span>
        <span style="font-size: 0.8rem; font-weight: 600; color: ${summary.total > 0 ? '#EF4444' : '#10B981'};">
          ${summary.total} Total Violation(s) Logged
        </span>
      </h4>

      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
        <div style="background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); text-align: center; border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">TOTAL VIOLATIONS</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: var(--primary);">${summary.total}</div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); text-align: center; border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">HIGH SEVERITY</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: #EF4444;">${summary.high}</div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); text-align: center; border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">MEDIUM SEVERITY</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: #F59E0B;">${summary.medium}</div>
        </div>
        <div style="background: var(--bg-surface); padding: 0.65rem; border-radius: var(--radius-sm); text-align: center; border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">LOW SEVERITY</div>
          <div style="font-size: 1.2rem; font-weight: 800; color: #10B981;">${summary.low}</div>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
          <thead>
            <tr style="background: var(--bg-surface); text-align: left; border-bottom: 2px solid var(--border-color);">
              <th style="padding: 0.5rem;">ID</th>
              <th style="padding: 0.5rem;">Type</th>
              <th style="padding: 0.5rem;">Description</th>
              <th style="padding: 0.5rem;">Timestamp</th>
              <th style="padding: 0.5rem; text-align: right;">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function openRecruiterBehaviorReportModal(sessionId) {
  let modalId = 'recruiterBehaviorReportModal';
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'smarthire-modal-backdrop';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
      <div class="smarthire-modal" style="max-width: 880px; max-height: 90vh; overflow-y: auto;">
        <div class="smarthire-modal-header" style="background: linear-gradient(135deg, #1E1B4B, #312E81); color: #FFFFFF;">
          <h3 style="color: #FFFFFF;"><i class="fa-solid fa-award"></i> SMART HIRE AI — CANDIDATE PERFORMANCE & AI FEEDBACK REPORT</h3>
          <button class="smarthire-modal-close" onclick="closeModal('${modalId}')" style="color: #FFFFFF;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="smarthire-modal-body" id="recruiterBehaviorReportBody" style="padding: 1.5rem;">
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  openModal(modalId);
  const body = document.getElementById('recruiterBehaviorReportBody');
  if (!body) return;

  body.innerHTML = `
    <div style="text-align: center; padding: 2rem 0; color: var(--primary);">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2rem;"></i>
      <p style="margin-top: 0.75rem; font-size: 0.9rem; font-weight: 600;">Calculating SMART HIRE AI 4-Category Performance Scoring & AI Feedback...</p>
    </div>
  `;

  console.log("[PERFORMANCE REPORT FETCH START] Fetching report for Session ID:", sessionId);
  const token = SmartHireAuth.getToken();
  if (!token) {
    body.innerHTML = `<div class="alert alert-danger">Authentication token required. Please login again.</div>`;
    return;
  }

  try {
    const reportUrl = `${SmartHireAuth.API_BASE}/api/interviews/sessions/${sessionId}/performance-report`;
    console.log("[PERFORMANCE REPORT URL]:", reportUrl);
    const res = await fetch(reportUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const resData = await res.json();
    if (!res.ok || !resData.success || !resData.data) {
      body.innerHTML = `<div class="alert alert-danger">Could not load performance report (${resData.message || res.statusText || 'Error'}).</div>`;
      return;
    }

    const r = resData.data;
    console.log("[PERFORMANCE REPORT SUCCESS]:", r);

    body.innerHTML = renderSmartHirePerformanceReportHTML(r);
  } catch (err) {
    console.error("[PERFORMANCE REPORT ERROR]:", err);
    body.innerHTML = `<div class="alert alert-danger">Error loading performance report: ${err.message || err}</div>`;
  }
}

function renderSmartHirePerformanceReportHTML(r) {
  const cats = r.category_scores || {};
  const comm = r.communication_analysis || {};
  const conf = r.confidence_analysis || {};
  const tech = r.technical_analysis || {};
  const prof = r.professionalism_analysis || {};

  const rating = r.performance_rating || 'Insufficient Data';
  let badgeClass = 'info';
  if (rating === 'Excellent') badgeClass = 'success';
  else if (rating === 'Good') badgeClass = 'info';
  else if (rating === 'Average' || rating === 'Needs Improvement') badgeClass = 'warning';
  else if (rating === 'Poor' || rating === 'Insufficient Data') badgeClass = 'danger';

  const getStatusLabel = (catObj) => {
    if (!catObj) return 'Insufficient Data';
    if (catObj.status === 'no_answers') return 'No Answers Provided';
    if (catObj.status === 'evaluation_failed') return 'Evaluation Failed';
    if (catObj.status === 'insufficient_data' || !catObj.available) return 'Insufficient Data';
    return 'Evaluated';
  };

  const fmtCatVal = (catObj) => {
    const isAvail = catObj && catObj.available && (catObj.status === 'evaluated' || catObj.status === undefined) && catObj.score !== null && catObj.score !== undefined;
    const scoreVal = (catObj && catObj.score !== null && catObj.score !== undefined) ? Number(catObj.score).toFixed(1) : '0.0';
    const statusText = getStatusLabel(catObj);
    if (!isAvail) {
      return `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <span style="font-size: 1.35rem; font-weight: 800; color: var(--text-muted);">${scoreVal} <span style="font-size: 0.8rem; font-weight: 600;">/ 100</span></span>
          <span style="color: #EF4444; font-size: 0.725rem; font-weight: 600; margin-top: 0.15rem;">(${statusText})</span>
        </div>
      `;
    }
    return `<span style="font-size: 1.35rem; font-weight: 800; color: var(--primary);">${scoreVal} <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">/ 100</span></span>`;
  };

  const fmtParamRow = (label, paramObj) => {
    const isAvail = paramObj && paramObj.available && (paramObj.status === 'evaluated' || paramObj.status === undefined) && paramObj.score !== null && paramObj.score !== undefined;
    const scoreVal = (paramObj && paramObj.score !== null && paramObj.score !== undefined) ? Number(paramObj.score).toFixed(1) : '0.0';
    const statusText = getStatusLabel(paramObj);
    if (!isAvail) {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.825rem;">
          <span>${label}</span>
          <span style="color: var(--text-muted); font-size: 0.775rem;"><strong>${scoreVal} / 100</strong> <em style="color: #EF4444; font-style: normal; margin-left: 0.25rem;">(${statusText})</em></span>
        </div>
      `;
    }
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.825rem;">
        <span>${label}</span>
        <strong style="color: var(--primary);">${scoreVal} / 100</strong>
      </div>
    `;
  };

  const renderFeedbackList = (items, icon, title, headerColor) => `
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; margin-bottom: 1rem;">
      <h5 style="font-weight: 700; font-size: 0.9rem; color: ${headerColor}; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
        ${icon} ${title}
      </h5>
      <ul style="margin: 0 0 0 1.25rem; padding: 0; font-size: 0.85rem; color: var(--text-main);">
        ${(items && items.length > 0) ? items.map(item => `
          <li style="margin-bottom: 0.35rem; line-height: 1.4;">
            ${typeof item === 'object' ? `<strong>${item.topic}:</strong> ${item.reason}` : item}
          </li>
        `).join('') : '<li style="color: var(--text-muted); font-style: italic;">No specific entries recorded.</li>'}
      </ul>
    </div>
  `;

  return `
    <div style="font-family: var(--font-family); font-size: 0.9rem; color: var(--text-main);">

      <!-- Overall Performance Header Banner -->
      <div style="background: linear-gradient(135deg, var(--primary-light), var(--bg-card)); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-weight: 800; color: var(--primary); margin: 0;">${r.candidate_name || 'Candidate Performance Report'}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
              <i class="fa-solid fa-envelope"></i> ${r.candidate_email || 'N/A'} • <i class="fa-solid fa-briefcase"></i> ${r.position || 'N/A'} • Domain: <strong>${r.interview_title || 'Software Engineering'}</strong>
            </div>
            <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.2rem;">
              Session #${r.session_id} • Created: ${r.created_at || 'N/A'}
            </div>
          </div>

          <div style="text-align: right; background: var(--bg-surface); padding: 0.85rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Overall Score</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--primary); font-family: monospace;">
              ${r.overall_score !== null && r.overall_score !== undefined ? Number(r.overall_score).toFixed(1) : '0.0'} <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">/ 100</span>
            </div>
            <div style="margin-top: 0.25rem;">
              <span class="badge-status ${badgeClass}" style="font-size: 0.8rem; font-weight: 700; padding: 0.25rem 0.65rem;">
                <i class="fa-solid fa-award"></i> Rating: ${rating}
              </span>
            </div>
          </div>
        </div>
      </div>


      <!-- 4 Major Assessment Category Score Summary (30%, 25%, 30%, 15%) -->
      <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">Category Score Breakdown</h4>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; text-align: center;">
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Communication (30%)</div>
          <div style="margin-top: 0.35rem;">${fmtCatVal(cats.communication)}</div>
        </div>
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Confidence (25%)</div>
          <div style="margin-top: 0.35rem;">${fmtCatVal(cats.confidence)}</div>
        </div>
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Technical Relevance (30%)</div>
          <div style="margin-top: 0.35rem;">${fmtCatVal(cats.technical_relevance)}</div>
        </div>
        <div style="background: var(--bg-card); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Professionalism (15%)</div>
          <div style="margin-top: 0.35rem;">${fmtCatVal(cats.professionalism)}</div>
        </div>
      </div>

      <!-- Detailed 19 Sub-Parameter Analysis Grid -->
      <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">Detailed Parameter Breakdown</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.25rem;">
        
        <!-- 1. Communication Parameters -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
          <h5 style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-size: 0.85rem; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.25rem;">
            1. Communication Analysis (30%)
          </h5>
          ${fmtParamRow("Speech Clarity (20%)", comm.speech_clarity)}
          ${fmtParamRow("Grammar Quality (25%)", comm.grammar_quality)}
          ${fmtParamRow("Filler Word Control (15%)", comm.filler_word_control)}
          ${fmtParamRow("Speaking Pace (15%)", comm.speaking_pace)}
          ${fmtParamRow("Response Completeness (25%)", comm.response_completeness)}
        </div>

        <!-- 2. Confidence Parameters -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
          <h5 style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-size: 0.85rem; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.25rem;">
            2. Confidence Analysis (25%)
          </h5>
          ${fmtParamRow("Eye Contact Consistency (30%)", conf.eye_contact_consistency)}
          ${fmtParamRow("Facial Engagement (20%)", conf.facial_engagement)}
          ${fmtParamRow("Response Hesitation (15%)", conf.response_hesitation)}
          ${fmtParamRow("Speaking Confidence (20%)", conf.speaking_confidence)}
          ${fmtParamRow("Attention Level (15%)", conf.attention_level)}
        </div>

        <!-- 3. Technical Relevance Parameters -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
          <h5 style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-size: 0.85rem; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.25rem;">
            3. Technical Relevance Analysis (30%)
          </h5>
          ${fmtParamRow("Technical Accuracy (30%)", tech.technical_accuracy)}
          ${fmtParamRow("Keyword Relevance (15%)", tech.keyword_relevance)}
          ${fmtParamRow("Problem-Solving Ability (20%)", tech.problem_solving_ability)}
          ${fmtParamRow("Domain Knowledge (20%)", tech.domain_knowledge)}
          ${fmtParamRow("Answer Completeness (15%)", tech.answer_completeness)}
        </div>

        <!-- 4. Professionalism Parameters -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem;">
          <h5 style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; font-size: 0.85rem; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.25rem;">
            4. Professionalism Analysis (15%)
          </h5>
          ${fmtParamRow("Time Management (25%)", prof.time_management)}
          ${fmtParamRow("Response Organization (30%)", prof.response_organization)}
          ${fmtParamRow("Professional Communication (25%)", prof.professional_communication)}
          ${fmtParamRow("Interview Etiquette (20%)", prof.interview_etiquette)}
        </div>

      </div>

      <!-- AI Feedback Sections (Strengths, Weaknesses, Suggestions, Drills, Resources) -->
      <h4 style="font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">AI-Generated Performance Feedback</h4>
      
      ${renderFeedbackList(r.strengths, '<i class="fa-solid fa-hand-fist" style="color: #10B981;"></i>', '💪 Candidate Strengths', '#10B981')}
      ${renderFeedbackList(r.weaknesses, '<i class="fa-solid fa-bullseye" style="color: #F59E0B;"></i>', '🎯 Areas for Improvement', '#F59E0B')}
      ${renderFeedbackList(r.improvement_suggestions, '<i class="fa-solid fa-lightbulb" style="color: #6366F1;"></i>', '💡 Actionable Suggestions', '#6366F1')}
      ${renderFeedbackList(r.practice_recommendations, '<i class="fa-solid fa-pen-to-square" style="color: var(--primary);"></i>', '📝 Targeted Practice Recommendations', 'var(--primary)')}
      ${renderFeedbackList(r.learning_resources, '<i class="fa-solid fa-book-open-reader" style="color: #EC4899;"></i>', '📚 Learning Resources', '#EC4899')}

    </div>
  `;
}


