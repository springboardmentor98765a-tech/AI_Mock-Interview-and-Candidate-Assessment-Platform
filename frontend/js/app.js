function render() {
  destroyCharts();
  var app = document.getElementById('app');

  if (state.page === 'login') {
    app.innerHTML = renderLoginPage();
    bindLoginEvents();
    initGoogleSignIn();
    var p = document.getElementById('global-video-modal-portal');
    if (p) p.innerHTML = '';
    document.body.style.overflow = '';
    return;
  }

  var navItems, content;
  var username = state.user ? state.user.name : 'User';
  var avatar = username.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

  if (state.page === 'candidate') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'jobs', label: 'Explore Jobs', icon: icon('briefcase') },
      { key: 'interviews', label: 'Mock Interviews', icon: icon('monitorPlay') },
      { key: 'assessment', label: 'Practice Assessment', icon: icon('clipboard') },
      { key: 'analytics', label: 'Analytics', icon: icon('barChart2') },
      { key: 'resume', label: 'Resume Analyzer', icon: icon('fileText') },
      { key: 'history', label: 'Interview History', icon: icon('clock') },
      { key: 'recordings', label: 'Interview Recordings', icon: icon('film') },
      { key: 'reports', label: 'Reports', icon: icon('downloadLg') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var sections = {
      overview: candidateOverview,
      jobs: typeof candidateJobs === 'function' ? candidateJobs : function() { return ''; },
      interviews: candidateInterviews,
      session: candidateSession,
      assessment: candidateAssessment,
      'assessment-session': candidateAssessmentSession,
      'assessment-result': candidateAssessmentResult,
      analytics: candidateAnalytics,
      resume: candidateResume,
      history: candidateHistory,
      recordings: candidateRecordings,
      reports: candidateReports,
      settings: typeof renderCandidateSettings === 'function' ? renderCandidateSettings : function() { return placeholderSection('Settings', 'Manage your account preferences, notifications, and privacy settings.', icon('settings', 32)); },
    };
    content = (sections[state.section] || sections.overview)();

  } else if (state.page === 'recruiter') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'jobs', label: 'Job Postings & ATS', icon: icon('briefcase') },
      { key: 'candidates', label: 'Candidates', icon: icon('users') },
      { key: 'compare', label: 'Compare', icon: icon('barChart2') },
      { key: 'templates', label: 'Templates', icon: icon('layers') },
      { key: 'sessions', label: 'Sessions', icon: icon('monitorPlay') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var rSections = {
      overview: recruiterOverview,
      jobs: typeof recruiterJobs === 'function' ? recruiterJobs : function() { return ''; },
      candidates: recruiterCandidates,
      compare: recruiterCompare,
      templates: recruiterTemplates,
      sessions: recruiterSessions,
      settings: typeof renderRecruiterSettings === 'function' ? renderRecruiterSettings : function() { return placeholderSection('Settings', 'Configure your recruiter preferences and notification settings.', icon('settings', 32)); },
    };
    content = (rSections[state.section] || rSections.overview)();
  } else if (state.page === 'admin') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'users', label: 'Users', icon: icon('users') },
      { key: 'interviews', label: 'Interview Activity', icon: icon('monitorPlay') },
      { key: 'analytics', label: 'Platform Analytics', icon: icon('barChart2') },
      { key: 'ai', label: 'AI Config', icon: icon('brain') },
      { key: 'activity', label: 'Activity Log', icon: icon('activity') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var aSections = {
      overview: adminOverview,
      users: adminUsers,
      interviews: adminInterviews,
      analytics: adminAnalytics,
      ai: adminAI,
      activity: adminActivity,
      settings: typeof renderAdminSettings === 'function' ? renderAdminSettings : function() { return placeholderSection('Platform Settings', 'Configure global platform behaviour, integrations, and security policies.', icon('settings', 32)); },
    };
    content = (aSections[state.section] || aSections.overview)();
  }

  app.innerHTML = renderDashboardLayout(navItems, content, username, avatar);

  if (state.activeReportModal && typeof renderReportModal === 'function') {
    app.innerHTML += renderReportModal(state.activeReportModal);
  }

  if (state.showEndConfirmModal && typeof renderEndConfirmModal === 'function') {
    app.innerHTML += renderEndConfirmModal();
  }

  if (state.showProfileModal && typeof renderProfileModal === 'function') {
    app.innerHTML += renderProfileModal();
  }

  if (state.adminShowAddUserModal && typeof renderAddUserModal === 'function') {
    app.innerHTML += renderAddUserModal();
  }

  bindDashboardEvents();
  drawCharts();

  // Mount/update video modal portal directly on document.body outside #app
  var portal = document.getElementById('global-video-modal-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'global-video-modal-portal';
    document.body.appendChild(portal);
  }

  if (state.activeVideoModal && typeof renderVideoPlayerModal === 'function') {
    portal.innerHTML = renderVideoPlayerModal(state.activeVideoModal);
    document.body.style.overflow = 'hidden';
  } else {
    portal.innerHTML = '';
    document.body.style.overflow = '';
  }
}

function handleAuthSuccess(data) {
  localStorage.setItem('smarthire_token', data.token);
  state.token = data.token;
  state.user = data.user;
  state.role = data.user.role;
  state.page = data.user.role;
  state.section = 'overview';
  state.authError = '';
  state.email = '';
  state.password = '';
  state.name = '';
  state.org = '';
  state.analyticsData = null;
  state.historyData = null;
  state.reportsData = null;
  state.activeReportModal = null;
  state.notificationsData = null;
  state.unreadNotifCount = 0;
  state.isNotifDropdownOpen = false;
  fetchUnreadNotifCount();
  fetchNotifications();
  if (data.user && data.user.role === 'candidate') {
    startInterviewReminderScheduler();
  }
  render();
}

function handleLogout() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.cancel();
    google.accounts.id.disableAutoSelect();
  }
  stopInterviewReminderScheduler();
  localStorage.removeItem('smarthire_token');
  state.token = null;
  state.user = null;
  state.page = 'login';
  state.section = 'overview';
  state.authError = '';
  state.analyticsData = null;
  state.activeReportModal = null;
  state.historyData = null;
  state.reportsData = null;
  state.currentInterview = null;
  state.notificationsData = null;
  state.unreadNotifCount = 0;
  state.isNotifDropdownOpen = false;
  render();
}

var INTERVIEW_REMINDER_MIN_MS = 20 * 60 * 1000; // 20 minutes
var INTERVIEW_REMINDER_MAX_MS = 25 * 60 * 1000; // 25 minutes

function getRandomReminderIntervalMs() {
  return Math.floor(INTERVIEW_REMINDER_MIN_MS + Math.random() * (INTERVIEW_REMINDER_MAX_MS - INTERVIEW_REMINDER_MIN_MS));
}

var PRACTICE_REMINDER_PROMPTS = [
  {
    title: "Interview Practice Reminder",
    message: "Sharpen your articulation and coding communication! Jump into a 15-minute mock interview session to keep your skills peak-ready.",
    domain: "Software Engineering"
  },
  {
    title: "Behavioral Readiness Sprint",
    message: "Practice makes confident! Review your situational and leadership stories using the STAR methodology in a quick mock round.",
    domain: "Behavioral & Leadership"
  },
  {
    title: "System Design & Architecture Practice",
    message: "Take 15 minutes to practice scaling, caching, and database design questions under real-time AI evaluation pressure.",
    domain: "System Design"
  },
  {
    title: "Speech Cadence & Filler Word Control",
    message: "Consistent practice increases interview offer rates by 70%! Tune up your camera eye-contact, pacing, and confidence score now.",
    domain: "Software Engineering"
  },
  {
    title: "Technical Mock Interview Challenge",
    message: "Keep your interview momentum strong! Practice answering complex technical follow-up questions with live AI feedback.",
    domain: "Full-Stack Development"
  }
];

function playNotificationChime() {
  try {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    var ctx = new AudioCtx();
    var now = ctx.currentTime;
    
    var osc1 = ctx.createOscillator();
    var gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1);
    gain2.gain.setValueAtTime(0.06, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (_) {}
}

function showPracticeReminderToast(prompt) {
  var container = document.getElementById('global-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-toast-container';
    container.className = 'sh-toast-container';
    document.body.appendChild(container);
  }

  var existing = document.getElementById('sh-practice-reminder-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'sh-practice-reminder-toast';
  toast.className = 'sh-toast sh-toast-warning sh-practice-toast';
  toast.style.cssText = 'background:#0f1124;border:1px solid rgba(245,158,11,0.35);box-shadow:0 12px 36px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.15);max-width:420px;padding:16px 18px;border-radius:16px;';

  toast.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:12px;width:100%;">
      <div style="width:36px;height:36px;border-radius:10px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;color:#fbbf24;flex-shrink:0;">
        ${icon('clock', 20)}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:#fbbf24;background:rgba(245,158,11,0.12);padding:2px 8px;border-radius:12px;border:1px solid rgba(245,158,11,0.25);">
            Practice Reminder (20–25m)
          </span>
          <button type="button" class="toast-dismiss-x" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;line-height:1;padding:0;">&times;</button>
        </div>
        <h4 style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#ffffff;font-family:'Outfit',sans-serif;">${prompt.title}</h4>
        <p style="margin:0 0 12px 0;font-size:11.5px;line-height:1.5;color:rgba(255,255,255,0.7);">${prompt.message}</p>
        <div style="display:flex;align-items:center;gap:8px;">
          <button type="button" id="btn-toast-start-practice" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff;border:none;padding:7px 14px;border-radius:9px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(245,158,11,0.35);">
            ${icon('play', 12)} Start Practice Now
          </button>
          <button type="button" class="toast-dismiss-later" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.1);padding:6px 12px;border-radius:9px;font-size:11px;font-weight:600;cursor:pointer;">
            Later
          </button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(function() {
    toast.classList.add('sh-toast-visible');
  });

  function closeToast() {
    toast.classList.remove('sh-toast-visible');
    setTimeout(function() { toast.remove(); }, 300);
  }

  var btnStart = toast.querySelector('#btn-toast-start-practice');
  if (btnStart) {
    btnStart.addEventListener('click', function() {
      closeToast();
      state.section = 'interviews';
      state.isNotifDropdownOpen = false;
      render();
    });
  }

  var btnDismiss = toast.querySelector('.toast-dismiss-x');
  if (btnDismiss) btnDismiss.addEventListener('click', closeToast);

  var btnLater = toast.querySelector('.toast-dismiss-later');
  if (btnLater) btnLater.addEventListener('click', closeToast);

  setTimeout(function() {
    if (toast.parentElement) closeToast();
  }, 16000);
}

async function checkAndTriggerInterviewReminder(force) {
  if (!state.token || !state.user || state.user.role !== 'candidate') return;

  if (!force && (state.section === 'session' || state.section === 'assessment-session')) {
    return;
  }

  var candSettings = typeof getCandidateSettings === 'function' ? getCandidateSettings() : {};
  if (!force && candSettings.notifReminders === false) {
    return;
  }

  var now = Date.now();
  var lastAt = parseInt(localStorage.getItem('smarthire_last_reminder_at') || '0', 10);
  var intervalMs = parseInt(localStorage.getItem('smarthire_reminder_interval_ms') || '0', 10);

  if (!intervalMs || intervalMs < INTERVIEW_REMINDER_MIN_MS || intervalMs > INTERVIEW_REMINDER_MAX_MS) {
    intervalMs = getRandomReminderIntervalMs();
    localStorage.setItem('smarthire_reminder_interval_ms', intervalMs.toString());
  }

  if (!lastAt) {
    localStorage.setItem('smarthire_last_reminder_at', now.toString());
    return;
  }

  var elapsed = now - lastAt;
  if (!force && elapsed < intervalMs) {
    return;
  }

  var promptIdx = Math.floor(Math.random() * PRACTICE_REMINDER_PROMPTS.length);
  var prompt = PRACTICE_REMINDER_PROMPTS[promptIdx];
  var sendEmail = candSettings.notifEmailDispatch !== false;

  localStorage.setItem('smarthire_last_reminder_at', now.toString());
  localStorage.setItem('smarthire_reminder_interval_ms', getRandomReminderIntervalMs().toString());

  if (candSettings.soundEffects !== false) {
    playNotificationChime();
  }
  showPracticeReminderToast(prompt);

  try {
    await api.sendNotifReminder({
      title: prompt.title,
      message: prompt.message,
      domain: prompt.domain,
      send_email: sendEmail
    });
    fetchUnreadNotifCount();
    if (state.isNotifDropdownOpen) {
      fetchNotifications();
    }
  } catch (err) {
    console.warn('Practice reminder sync error:', err);
  }
}

function startInterviewReminderScheduler() {
  if (window._practiceReminderTimer) {
    clearInterval(window._practiceReminderTimer);
  }

  var lastAt = localStorage.getItem('smarthire_last_reminder_at');
  if (!lastAt) {
    localStorage.setItem('smarthire_last_reminder_at', Date.now().toString());
  }
  var intervalMs = localStorage.getItem('smarthire_reminder_interval_ms');
  if (!intervalMs) {
    localStorage.setItem('smarthire_reminder_interval_ms', getRandomReminderIntervalMs().toString());
  }

  window._practiceReminderTimer = setInterval(function() {
    checkAndTriggerInterviewReminder(false);
  }, 30000);
}

function stopInterviewReminderScheduler() {
  if (window._practiceReminderTimer) {
    clearInterval(window._practiceReminderTimer);
    window._practiceReminderTimer = null;
  }
}

async function checkAuth() {
  var resetToken = new URLSearchParams(window.location.search).get('reset_token');
  if (resetToken) {
    state.authMode = 'reset';
    state.resetToken = resetToken;
    state.authError = '';
    state.authMessage = '';
    render();
    return;
  }
  var token = localStorage.getItem('smarthire_token');
  if (!token) {
    render();
    return;
  }
  try {
    var data = await api.getMe();
    state.token = token;
    state.user = data.user;
    state.role = data.user.role;
    state.page = data.user.role;
    state.section = 'overview';
    fetchUnreadNotifCount();
    fetchNotifications();
    if (data.user && data.user.role === 'candidate') {
      startInterviewReminderScheduler();
    }
    render();
  } catch (e) {
    localStorage.removeItem('smarthire_token');
    stopInterviewReminderScheduler();
    render();
  }
}

async function fetchNotifications(tab) {
  if (!state.token) return;
  state.notifLoading = true;
  try {
    var res = await api.getNotifications(tab || state.notifActiveTab || 'all');
    state.notificationsData = res.notifications || [];
    state.unreadNotifCount = res.unread_count || 0;
  } catch (err) {
    console.error('Failed to load notifications:', err);
  } finally {
    state.notifLoading = false;
    if (state.isNotifDropdownOpen) {
      render();
    }
  }
}

async function fetchUnreadNotifCount() {
  if (!state.token) return;
  try {
    var res = await api.getUnreadNotifCount();
    state.unreadNotifCount = res.unread_count || 0;
    var badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = state.unreadNotifCount > 99 ? '99+' : state.unreadNotifCount;
      badge.style.display = state.unreadNotifCount > 0 ? 'inline-flex' : 'none';
    }
  } catch (_) {}
}

function bindLoginEvents() {
  document.querySelectorAll('.auth-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.authMode = this.dataset.mode;
      state.authError = '';
      state.authMessage = '';
      render();
    });
  });
  document.querySelectorAll('.role-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.role = this.dataset.role;
      render();
    });
  });
  var toggleAuth = document.getElementById('toggle-auth');
  if (toggleAuth) {
    toggleAuth.addEventListener('click', function() {
      state.authMode = state.authMode === 'login' ? 'signup' : 'login';
      state.authError = '';
      state.authMessage = '';
      render();
    });
  }
  var forgotPassword = document.getElementById('forgot-password');
  if (forgotPassword) {
    forgotPassword.addEventListener('click', function() {
      state.authMode = 'forgot';
      state.authError = '';
      state.authMessage = '';
      render();
    });
  }
  var backToLogin = document.getElementById('back-to-login');
  if (backToLogin) {
    backToLogin.addEventListener('click', function() {
      state.authMode = 'login';
      state.authError = '';
      state.authMessage = '';
      state.password = '';
      state.resetPasswordConfirmation = '';
      state.resetToken = '';
      window.history.replaceState({}, '', window.location.pathname);
      render();
    });
  }
  var btnAuth = document.getElementById('btn-auth');
  if (btnAuth) {
    btnAuth.addEventListener('click', async function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Please wait...';
      state.authError = '';
      try {
        var data;
        if (state.authMode === 'forgot') {
          data = await api.requestPasswordReset(state.email);
          state.authMessage = data.message;
          render();
          return;
        }
        if (state.authMode === 'reset') {
          if (state.password !== state.resetPasswordConfirmation) {
            throw new Error('The passwords do not match.');
          }
          data = await api.resetPassword(state.resetToken, state.password);
          state.authMode = 'login';
          state.authMessage = data.message;
          state.password = '';
          state.resetPasswordConfirmation = '';
          state.resetToken = '';
          window.history.replaceState({}, '', window.location.pathname);
          render();
          return;
        }
        if (state.authMode === 'login') {
          data = await api.login(state.email, state.password);
        } else {
          data = await api.register(state.name, state.email, state.password, state.role);
        }
        handleAuthSuccess(data);
      } catch (err) {
        state.authError = err.message;
        btn.disabled = false;
        btn.textContent = state.authMode === 'login' ? 'Sign In' : 'Create Account';
        var errEl = document.querySelector('.auth-error');
        if (!errEl) render();
        else errEl.textContent = err.message;
      }
    });
  }
  var inpEmail = document.getElementById('inp-email');
  if (inpEmail) inpEmail.addEventListener('input', function() { state.email = this.value; });
  var inpPass = document.getElementById('inp-pass');
  if (inpPass) inpPass.addEventListener('input', function() { state.password = this.value; });
  var inpPassConfirm = document.getElementById('inp-pass-confirm');
  if (inpPassConfirm) inpPassConfirm.addEventListener('input', function() { state.resetPasswordConfirmation = this.value; });
  var inpName = document.getElementById('inp-name');
  if (inpName) inpName.addEventListener('input', function() { state.name = this.value; });
  var inpOrg = document.getElementById('inp-org');
  if (inpOrg) inpOrg.addEventListener('input', function() { state.org = this.value; });
  var togglePass = document.getElementById('toggle-pass');
  if (togglePass && inpPass) {
    togglePass.addEventListener('click', function() {
      state.showPassword = !state.showPassword;
      inpPass.type = state.showPassword ? 'text' : 'password';
      togglePass.innerHTML = state.showPassword ? icon('eyeOff') : icon('eye');
      togglePass.setAttribute('aria-label', state.showPassword ? 'Hide password' : 'Show password');
      togglePass.setAttribute('aria-pressed', String(state.showPassword));
      togglePass.setAttribute('title', state.showPassword ? 'Hide password' : 'Show password');
      inpPass.focus();
    });
  }
}

function bindDashboardEvents() {
  document.querySelectorAll('.sidebar-link').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.section = this.dataset.section;
      if (state.section === 'recordings') {
        state.recordingsData = null;
      } else if (state.section === 'jobs') {
        state.candidateJobsData = null;
        state.candidateMyApplicationsData = null;
        state.recruiterJobsData = null;
      } else if (state.section === 'overview') {
        state.recruiterSummaryData = null;
        state.adminOverviewData = null;
      } else if (state.section === 'candidates') {
        state.recruiterCandidatesData = null;
      } else if (state.section === 'compare') {
        state.recruiterCompareData = null;
      } else if (state.section === 'sessions') {
        state.recruiterLiveSessionsData = null;
      } else if (state.section === 'users') {
        state.adminUsersData = null;
      } else if (state.section === 'interviews') {
        state.adminInterviewsData = null;
      } else if (state.section === 'analytics') {
        state.adminOverviewData = null;
      } else if (state.section === 'ai') {
        state.adminAIPerfData = null;
      } else if (state.section === 'activity') {
        state.adminSystemHealthData = null;
        state.adminActivityLogData = null;
      }
      render();
    });
  });
  var logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      handleLogout();
    });
  }
  var searchInput = document.getElementById('inp-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() { state.search = this.value; });
  }
  var tempSlider = document.getElementById('temp-slider');
  if (tempSlider) {
    tempSlider.addEventListener('input', function() {
      state.temp = parseFloat(this.value);
      var valEl = document.getElementById('temp-val');
      if (valEl) valEl.textContent = this.value;
    });
  }

  var profileTrigger = document.getElementById('btn-user-profile-trigger');
  if (profileTrigger) {
    profileTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      state.isProfileDropdownOpen = !state.isProfileDropdownOpen;
      state.isNotifDropdownOpen = false;
      render();
    });
  }

  var sidebarProfileBtn = document.getElementById('btn-sidebar-user-profile');
  if (sidebarProfileBtn) {
    sidebarProfileBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openProfileModal();
    });
  }

  if (typeof bindSettingsEvents === 'function') {
    bindSettingsEvents();
  }

  var btnRefreshRecruiter = document.getElementById('btn-refresh-recruiter');
  if (btnRefreshRecruiter) {
    btnRefreshRecruiter.addEventListener('click', function() {
      state.recruiterSummaryData = null;
      render();
    });
  }

  var btnGotoCandidates = document.getElementById('btn-goto-candidates');
  if (btnGotoCandidates) {
    btnGotoCandidates.addEventListener('click', function() {
      state.section = 'candidates';
      state.recruiterCandidatesData = null;
      render();
    });
  }

  var inpCandidateSearch = document.getElementById('inp-candidate-search');
  if (inpCandidateSearch) {
    inpCandidateSearch.addEventListener('input', function() {
      state.recruiterCandidatesSearch = this.value;
      state.recruiterCandidatesData = null;
      render();
    });
  }

  var selCandidateFilter = document.getElementById('sel-candidate-status-filter');
  if (selCandidateFilter) {
    selCandidateFilter.addEventListener('change', function() {
      state.recruiterCandidatesStatusFilter = this.value;
      state.recruiterCandidatesData = null;
      render();
    });
  }

  document.querySelectorAll('.btn-shortlist-candidate').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var candId = parseInt(this.dataset.id, 10);
      var status = this.dataset.status;
      if (!candId || !status) return;
      try {
        await api.updateCandidateStatus(candId, status);
        state.recruiterCandidatesData = null;
        state.recruiterSummaryData = null;
        state.recruiterCompareData = null;
        render();
      } catch (err) {
        window.alert('Failed to update candidate status: ' + (err.message || 'Error'));
      }
    });
  });

  document.querySelectorAll('.chk-compare-candidate, .chk-compare-select').forEach(function(chk) {
    chk.addEventListener('change', function() {
      var candId = parseInt(this.dataset.id, 10);
      if (!candId) return;
      var selected = state.recruiterCompareSelectedIds || [];
      if (this.checked) {
        if (!selected.includes(candId)) selected.push(candId);
      } else {
        selected = selected.filter(function(id) { return id !== candId; });
      }
      state.recruiterCompareSelectedIds = selected;
      state.recruiterCompareData = null;
      render();
    });
  });

  var btnClearCompare = document.getElementById('btn-clear-compare');
  if (btnClearCompare) {
    btnClearCompare.addEventListener('click', function() {
      state.recruiterCompareSelectedIds = [];
      state.recruiterCompareData = null;
      render();
    });
  }

  var btnRefreshLive = document.getElementById('btn-refresh-live-sessions');
  if (btnRefreshLive) {
    btnRefreshLive.addEventListener('click', function() {
      state.recruiterLiveSessionsData = null;
      state.recruiterSessionsData = null;
      render();
    });
  }

  var btnRefreshSessions = document.getElementById('btn-refresh-sessions');
  if (btnRefreshSessions) {
    btnRefreshSessions.addEventListener('click', function() {
      state.recruiterSessionsData = null;
      render();
    });
  }

  var selSessionsFilter = document.getElementById('sel-sessions-status-filter');
  if (selSessionsFilter) {
    selSessionsFilter.addEventListener('change', function() {
      state.recruiterSessionsStatusFilter = this.value;
      state.recruiterSessionsData = null;
      render();
    });
  }

  var btnOpenCreateTpl = document.getElementById('btn-open-create-template');
  if (btnOpenCreateTpl) {
    btnOpenCreateTpl.addEventListener('click', function() {
      state.showCreateTemplateModal = true;
      render();
    });
  }

  var btnCloseTplModal = document.getElementById('btn-close-template-modal');
  if (btnCloseTplModal) {
    btnCloseTplModal.addEventListener('click', function() {
      state.showCreateTemplateModal = false;
      render();
    });
  }

  var btnCancelTpl = document.getElementById('btn-cancel-template');
  if (btnCancelTpl) {
    btnCancelTpl.addEventListener('click', function() {
      state.showCreateTemplateModal = false;
      render();
    });
  }

  var btnSubmitCreateTpl = document.getElementById('btn-submit-create-template');
  if (btnSubmitCreateTpl) {
    btnSubmitCreateTpl.addEventListener('click', async function() {
      var titleEl = document.getElementById('inp-tpl-title');
      var typeEl = document.getElementById('sel-tpl-type');
      var domainEl = document.getElementById('inp-tpl-domain');
      var diffEl = document.getElementById('sel-tpl-difficulty');
      var durEl = document.getElementById('inp-tpl-duration');
      var numEl = document.getElementById('inp-tpl-questions');
      var topicsEl = document.getElementById('inp-tpl-topics');
      var descEl = document.getElementById('inp-tpl-desc');

      if (!titleEl || !titleEl.value.trim()) {
        window.alert('Please enter a template title.');
        return;
      }

      var topicsArr = topicsEl && topicsEl.value ? topicsEl.value.split(',').map(function(t) { return t.strip ? t.strip() : t.trim(); }).filter(Boolean) : [];

      var payload = {
        title: titleEl.value.trim(),
        interview_type: typeEl ? typeEl.value : 'Technical Interview',
        domain: domainEl && domainEl.value.trim() ? domainEl.value.trim() : 'Software Engineering',
        difficulty: diffEl ? diffEl.value : 'medium',
        duration_minutes: durEl ? parseInt(durEl.value, 10) || 15 : 15,
        num_questions: numEl ? parseInt(numEl.value, 10) || 5 : 5,
        topics: topicsArr,
        description: descEl ? descEl.value.trim() : ''
      };

      try {
        await api.createInterviewTemplate(payload);
        state.showCreateTemplateModal = false;
        state.recruiterTemplatesData = null;
        render();
      } catch (err) {
        window.alert('Failed to create template: ' + (err.message || 'Error'));
      }
    });
  }

  document.querySelectorAll('.btn-delete-template').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var tplId = parseInt(this.dataset.id, 10);
      if (!tplId) return;
      if (!window.confirm('Are you sure you want to delete this interview template?')) return;
      try {
        await api.deleteInterviewTemplate(tplId);
        state.recruiterTemplatesData = null;
        render();
      } catch (err) {
        window.alert('Failed to delete template: ' + (err.message || 'Error'));
      }
    });
  });

  document.querySelectorAll('.btn-view-report, .history-report-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = this.dataset.id || this.dataset.reportId;
      if (!id) return;
      try {
        var report = await api.getInterviewReport(id);
        state.activeReportModal = report;
        render();
      } catch (err) {
        window.alert('Unable to load report: ' + (err.message || 'Report not found'));
      }
    });
  });

  document.querySelectorAll('.btn-play-video').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var sessionId = this.dataset.sessionId;
      var recId = this.dataset.recId;
      try {
        var res = await api.getAllRecordings();
        var list = res.recordings || [];
        var found = list.find(function(r) { return String(r.id) === String(recId) || String(r.session_id) === String(sessionId); });
        if (!found) {
          found = {
            id: recId || sessionId,
            session_id: sessionId,
            recording_type: 'video',
            file_path: '/api/interviews/recordings/file/' + (recId || sessionId),
            duration: 0,
            mime_type: 'video/mp4'
          };
        }
        state.activeVideoModal = found;
        render();
      } catch (err) {
        window.alert('Unable to load recording: ' + (err.message || 'Error'));
      }
    });
  });

  var btnNotifBell = document.getElementById('btn-notif-bell');
  if (btnNotifBell) {
    btnNotifBell.addEventListener('click', async function(e) {
      e.stopPropagation();
      state.isNotifDropdownOpen = !state.isNotifDropdownOpen;
      if (state.isNotifDropdownOpen && (!state.notificationsData || state.notificationsData.length === 0)) {
        await fetchNotifications();
      } else {
        render();
      }
    });
  }

  document.querySelectorAll('.sh-notif-tab').forEach(function(tabBtn) {
    tabBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var tab = this.dataset.tab;
      state.notifActiveTab = tab;
      await fetchNotifications(tab);
      render();
    });
  });

  var btnNotifMarkAll = document.getElementById('btn-notif-mark-all');
  if (btnNotifMarkAll) {
    btnNotifMarkAll.addEventListener('click', async function(e) {
      e.stopPropagation();
      try {
        await api.markAllNotifsRead();
        if (state.notificationsData) {
          state.notificationsData.forEach(function(n) { n.is_read = true; });
        }
        state.unreadNotifCount = 0;
        render();
      } catch (err) {
        console.error('Mark all read error:', err);
      }
    });
  }

  var btnNotifClearAll = document.getElementById('btn-notif-clear-all');
  if (btnNotifClearAll) {
    btnNotifClearAll.addEventListener('click', async function(e) {
      e.stopPropagation();
      if (!window.confirm('Clear all notifications?')) return;
      try {
        await api.clearAllNotifs();
        state.notificationsData = [];
        state.unreadNotifCount = 0;
        render();
      } catch (err) {
        console.error('Clear all notifs error:', err);
      }
    });
  }

  document.querySelectorAll('.sh-notif-dismiss-btn').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var notifId = parseInt(this.dataset.id, 10);
      if (!notifId) return;
      try {
        await api.deleteNotif(notifId);
        var removed = (state.notificationsData || []).find(function(n) { return n.id === notifId; });
        state.notificationsData = (state.notificationsData || []).filter(function(n) { return n.id !== notifId; });
        if (removed && !removed.is_read && state.unreadNotifCount > 0) {
          state.unreadNotifCount--;
        }
        render();
      } catch (err) {
        console.error('Dismiss notification error:', err);
      }
    });
  });

  document.querySelectorAll('.btn-notif-action-view-report').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var sessId = this.dataset.sessionId;
      if (!sessId) return;
      try {
        var notifCard = this.closest('.sh-notif-card');
        var notifId = notifCard ? parseInt(notifCard.dataset.id, 10) : null;
        if (notifId) {
          api.markNotifRead(notifId).catch(function(){});
          var nObj = (state.notificationsData || []).find(function(n){ return n.id === notifId; });
          if (nObj && !nObj.is_read) {
            nObj.is_read = true;
            if (state.unreadNotifCount > 0) state.unreadNotifCount--;
          }
        }
        state.isNotifDropdownOpen = false;
        var report = await api.getInterviewReport(sessId);
        state.activeReportModal = report;
        render();
      } catch (err) {
        window.alert('Unable to load report: ' + (err.message || 'Report not found'));
      }
    });
  });

  document.querySelectorAll('.btn-notif-action-download').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var sessId = this.dataset.sessionId;
      if (!sessId) return;
      try {
        var report = await api.getInterviewReport(sessId);
        downloadReportAsPDF(report);
      } catch (err) {
        window.alert('Unable to download report: ' + (err.message || 'Error'));
      }
    });
  });

  var btnModalDownloadPdf = document.getElementById('btn-modal-download-pdf');
  if (btnModalDownloadPdf) {
    btnModalDownloadPdf.addEventListener('click', function(e) {
      e.stopPropagation();
      if (state.activeReportModal) {
        downloadReportAsPDF(state.activeReportModal);
      }
    });
  }

  document.querySelectorAll('.btn-direct-download-pdf').forEach(function(btn) {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      var id = this.dataset.id;
      if (!id) return;
      try {
        var report = await api.getInterviewReport(id);
        downloadReportAsPDF(report);
      } catch (err) {
        window.alert('Unable to load report for PDF export: ' + (err.message || 'Error'));
      }
    });
  });

  document.querySelectorAll('.btn-notif-action-practice').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.isNotifDropdownOpen = false;
      state.section = 'interviews';
      render();
    });
  });

  document.querySelectorAll('.btn-notif-action-analytics').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.isNotifDropdownOpen = false;
      state.section = 'analytics';
      render();
    });
  });

  document.querySelectorAll('.btn-notif-action-sessions').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      state.isNotifDropdownOpen = false;
      state.section = 'history';
      render();
    });
  });

  var btnNotifTestReminder = document.getElementById('btn-notif-test-reminder');
  if (btnNotifTestReminder) {
    btnNotifTestReminder.addEventListener('click', async function(e) {
      e.stopPropagation();
      try {
        btnNotifTestReminder.textContent = 'Triggering...';
        await checkAndTriggerInterviewReminder(true);
        btnNotifTestReminder.textContent = '+ Send Practice Reminder';
      } catch (err) {
        btnNotifTestReminder.textContent = '+ Send Practice Reminder';
        window.alert('Failed to trigger reminder: ' + (err.message || 'Error'));
      }
    });
  }

  if (state.page === 'candidate') {
    bindCandidateInterviewEvents();
    bindCandidateAssessmentEvents();
    bindCandidateResumeEvents();
    if (typeof bindCandidateJobEvents === 'function') {
      bindCandidateJobEvents();
    }
  } else if (state.page === 'recruiter') {
    if (typeof bindRecruiterJobEvents === 'function') {
      bindRecruiterJobEvents();
    }
  } else if (state.page === 'admin') {
    if (typeof bindAdminEvents === 'function') {
      bindAdminEvents();
    }
  }
}

if (!window._globalModalClickBound) {
  window._globalModalClickBound = true;

  document.addEventListener('click', function(e) {
    // Notification Dropdown Close on Outside Click
    if (state.isNotifDropdownOpen) {
      var notifWrapper = e.target.closest('#notif-wrapper');
      if (!notifWrapper) {
        state.isNotifDropdownOpen = false;
        render();
        return;
      }
    }

    // Profile Dropdown Close on Outside Click
    if (state.isProfileDropdownOpen) {
      var profileWrapper = e.target.closest('#user-profile-wrapper');
      if (!profileWrapper) {
        state.isProfileDropdownOpen = false;
        render();
        return;
      }
    }

    // Video Modal Close (Header cross & footer Close button)
    var videoCloseBtn = e.target.closest('#video-modal-close, #video-modal-close-btn');
    if (videoCloseBtn) {
      e.preventDefault();
      e.stopPropagation();
      state.activeVideoModal = null;
      render();
      return;
    }

    // Video Modal Overlay Backdrop
    if (e.target.id === 'video-modal-overlay') {
      e.preventDefault();
      e.stopPropagation();
      state.activeVideoModal = null;
      render();
      return;
    }

    // Report Modal Close (Header cross & footer Close button)
    var reportCloseBtn = e.target.closest('#btn-close-report-modal, #report-modal-close, #btn-close-report');
    if (reportCloseBtn) {
      e.preventDefault();
      e.stopPropagation();
      state.activeReportModal = null;
      render();
      return;
    }

    // Report Modal Overlay Backdrop
    if (e.target.id === 'report-modal-overlay') {
      e.preventDefault();
      e.stopPropagation();
      state.activeReportModal = null;
      render();
      return;
    }

    // Candidate Job Apply Modal Backdrop
    if (e.target.id === 'apply-modal-overlay') {
      e.preventDefault();
      e.stopPropagation();
      state.selectedApplyJob = null;
      render();
      return;
    }

    // Recruiter Job Post/Edit Modal Backdrop
    if (e.target.id === 'job-modal-overlay') {
      e.preventDefault();
      e.stopPropagation();
      state.recruiterJobModalOpen = false;
      render();
      return;
    }

    // Admin Add User Modal Close Button & Backdrop
    var adminUserModalClose = e.target.closest('#btn-close-admin-user-modal, #btn-cancel-admin-user');
    if (adminUserModalClose || e.target.id === 'admin-user-modal-overlay') {
      e.preventDefault();
      e.stopPropagation();
      state.adminShowAddUserModal = false;
      render();
      return;
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (state.activeVideoModal) {
        state.activeVideoModal = null;
        render();
      } else if (state.activeReportModal) {
        state.activeReportModal = null;
        render();
      } else if (state.showProfileModal) {
        state.showProfileModal = false;
        render();
      } else if (state.showCreateTemplateModal) {
        state.showCreateTemplateModal = false;
        render();
      } else if (state.selectedApplyJob) {
        state.selectedApplyJob = null;
        render();
      } else if (state.recruiterJobModalOpen) {
        state.recruiterJobModalOpen = false;
        render();
      } else if (state.adminShowAddUserModal) {
        state.adminShowAddUserModal = false;
        render();
      }
    }
  });
}

function bindAdminEvents() {
  // 0. Refresh Admin Overview
  var btnRefreshOverview = document.getElementById('btn-refresh-admin-overview');
  if (btnRefreshOverview) {
    btnRefreshOverview.addEventListener('click', function() {
      state.adminOverviewData = null;
      render();
    });
  }

  // 0.1 Quick Add User from Overview
  var btnQuickAdd = document.getElementById('btn-admin-quick-add-user');
  if (btnQuickAdd) {
    btnQuickAdd.addEventListener('click', function() {
      state.adminShowAddUserModal = true;
      render();
    });
  }

  // 0.2 Goto Section Links in Overview
  document.querySelectorAll('.link-admin-goto-section').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var sec = this.dataset.section;
      if (sec) {
        state.section = sec;
        render();
      }
    });
  });

  // 0.3 View Report in Overview Recent Sessions Table
  document.querySelectorAll('.btn-admin-view-report').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = this.dataset.id;
      if (!id) return;
      try {
        var report = await api.getInterviewReport(id);
        state.activeReportModal = report;
        render();
      } catch (err) {
        window.alert('Unable to load report: ' + (err.message || 'Report not found'));
      }
    });
  });

  // 0.4 Download System Health Report PDF (from Overview or Activity Log)
  var triggerHealthPdf = async function() {
    try {
      var health = state.adminSystemHealthData;
      if (!health) {
        health = await api.getAdminSystemHealth();
        state.adminSystemHealthData = health;
      }
      var logs = state.adminActivityLogData;
      if (!logs || !logs.length) {
        var res = await api.getAdminActivityLog(30);
        logs = res.logs || [];
        state.adminActivityLogData = logs;
      }
      var overview = state.adminOverviewData;
      if (!overview) {
        overview = await api.getAdminOverview();
        state.adminOverviewData = overview;
      }
      downloadSystemHealthReportPDF(health, logs, overview);
    } catch (err) {
      window.alert('Failed to generate health report PDF: ' + (err.message || 'Error'));
    }
  };

  var btnHealthPdf1 = document.getElementById('btn-download-system-health-pdf');
  if (btnHealthPdf1) btnHealthPdf1.addEventListener('click', triggerHealthPdf);

  var btnHealthPdf2 = document.getElementById('btn-overview-download-health-pdf');
  if (btnHealthPdf2) btnHealthPdf2.addEventListener('click', triggerHealthPdf);

  var btnHealthPdf3 = document.getElementById('btn-telemetry-download-health-pdf');
  if (btnHealthPdf3) btnHealthPdf3.addEventListener('click', triggerHealthPdf);

  // 1. Add User Modal Open
  var btnOpenAdd = document.getElementById('btn-admin-open-add-user');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', function() {
      state.adminShowAddUserModal = true;
      render();
    });
  }

  // 2. Add User Form Submit
  var formAddUser = document.getElementById('form-admin-add-user');
  if (formAddUser) {
    formAddUser.addEventListener('submit', async function(e) {
      e.preventDefault();
      var errEl = document.getElementById('admin-add-user-error');
      var btnSubmit = document.getElementById('btn-submit-admin-user');
      if (errEl) errEl.classList.add('hidden');
      if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.textContent = 'Creating...'; }

      var name = document.getElementById('inp-modal-user-name').value.trim();
      var email = document.getElementById('inp-modal-user-email').value.trim();
      var password = document.getElementById('inp-modal-user-pass').value;
      var role = document.getElementById('sel-modal-user-role').value;
      var isSuper = document.getElementById('chk-modal-user-super') ? document.getElementById('chk-modal-user-super').checked : false;

      try {
        await api.createAdminUser({
          name: name,
          email: email,
          password: password,
          role: role,
          is_super_admin: isSuper
        });
        state.adminShowAddUserModal = false;
        state.adminUsersData = null;
        state.adminOverviewData = null;
        render();
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Failed to create user.';
          errEl.classList.remove('hidden');
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = icon('check', 14) + ' Create User';
        }
      }
    });
  }

  // 3. User Filter Pills & Search
  document.querySelectorAll('.btn-admin-filter-role').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var r = this.dataset.role;
      state.adminUsersFilterRole = r;
      state.adminUsersData = null;
      render();
    });
  });

  var inpUserSearch = document.getElementById('inp-admin-user-search');
  if (inpUserSearch) {
    var searchTimer = null;
    inpUserSearch.addEventListener('input', function() {
      var val = this.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        state.adminUsersSearch = val;
        state.adminUsersData = null;
        render();
      }, 350);
    });
  }

  // 4. Update Role Dropdown
  document.querySelectorAll('.sel-admin-user-role').forEach(function(sel) {
    sel.addEventListener('change', async function() {
      var userId = parseInt(this.dataset.id, 10);
      var newRole = this.value;
      if (!userId) return;
      try {
        await api.updateAdminUserRole(userId, { role: newRole });
        state.adminUsersData = null;
        state.adminOverviewData = null;
        render();
      } catch (err) {
        window.alert('Failed to update role: ' + (err.message || 'Error'));
      }
    });
  });

  // 5. Delete User Button
  document.querySelectorAll('.btn-admin-delete-user').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var userId = parseInt(this.dataset.id, 10);
      var userName = this.dataset.name || 'this user';
      if (!userId) return;
      if (!window.confirm('Are you sure you want to permanently delete ' + userName + '? All associated data will be removed.')) return;
      try {
        await api.deleteAdminUser(userId);
        state.adminUsersData = null;
        state.adminOverviewData = null;
        render();
      } catch (err) {
        window.alert('Failed to delete user: ' + (err.message || 'Error'));
      }
    });
  });

  // 6. Interview Activity Filters & Search & Refresh
  var btnRefreshInterviews = document.getElementById('btn-refresh-admin-interviews');
  if (btnRefreshInterviews) {
    btnRefreshInterviews.addEventListener('click', function() {
      state.adminInterviewsData = null;
      render();
    });
  }

  document.querySelectorAll('.btn-admin-filter-interview-status').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var st = this.dataset.status;
      state.adminInterviewsFilterStatus = st;
      state.adminInterviewsData = null;
      render();
    });
  });

  var inpInterviewSearch = document.getElementById('inp-admin-interview-search');
  if (inpInterviewSearch) {
    var interviewSearchTimer = null;
    inpInterviewSearch.addEventListener('input', function() {
      var val = this.value;
      clearTimeout(interviewSearchTimer);
      interviewSearchTimer = setTimeout(function() {
        state.adminInterviewsSearch = val;
        state.adminInterviewsData = null;
        render();
      }, 350);
    });
  }

  // 7. AI Config Controls
  var aiTempSlider = document.getElementById('admin-temp-slider');
  if (aiTempSlider) {
    aiTempSlider.addEventListener('input', function() {
      var valEl = document.getElementById('admin-temp-val');
      if (valEl) valEl.textContent = Number(this.value).toFixed(2);
    });
  }

  var btnSaveAI = document.getElementById('btn-save-admin-ai-config');
  if (btnSaveAI) {
    btnSaveAI.addEventListener('click', async function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      try {
        var temp = parseFloat(document.getElementById('admin-temp-slider').value);
        var maxQ = parseInt(document.getElementById('inp-admin-max-q').value, 10);
        var timeout = parseInt(document.getElementById('inp-admin-timeout').value, 10);
        var cutoff = parseFloat(document.getElementById('inp-admin-cutoff').value);

        await api.updateAdminAIConfig({
          model_temperature: temp,
          max_questions: maxQ,
          session_timeout: timeout,
          confidence_threshold: cutoff
        });
        state.adminAIPerfData = null;
        render();
        window.alert('AI configuration saved successfully.');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = icon('save', 14) + ' Save Configuration';
        window.alert('Failed to save AI config: ' + (err.message || 'Error'));
      }
    });
  }

  // 8. System Health / Audit Refresh
  var btnRefreshAudit = document.getElementById('btn-refresh-admin-activity');
  if (btnRefreshAudit) {
    btnRefreshAudit.addEventListener('click', function() {
      state.adminSystemHealthData = null;
      state.adminActivityLogData = null;
      render();
    });
  }
}

function drawCharts() {
  // Charts will be populated from API data in future implementation
}

checkAuth();
