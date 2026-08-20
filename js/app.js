/* ══════════════════════════════════════════════════
   MAIN RENDER & EVENT BINDING
   ══════════════════════════════════════════════════ */

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
      { key: 'interviews', label: 'Mock Interviews', icon: icon('monitorPlay') },
      { key: 'assessment', label: 'Practice Assessment', icon: icon('clipboard') },
      { key: 'analytics', label: 'Analytics', icon: icon('barChart2') },
      { key: 'resume', label: 'Resume & Skills', icon: icon('fileText') },
      { key: 'history', label: 'Interview History', icon: icon('clock') },
      { key: 'recordings', label: 'Interview Recordings', icon: icon('film') },
      { key: 'reports', label: 'Reports', icon: icon('downloadLg') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var sections = {
      overview: candidateOverview,
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
      settings: function() { return placeholderSection('Settings', 'Manage your account preferences, notifications, and privacy settings.', icon('settings', 32)); },
    };
    content = (sections[state.section] || sections.overview)();

  } else if (state.page === 'recruiter') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'candidates', label: 'Candidates', icon: icon('users') },
      { key: 'compare', label: 'Compare', icon: icon('barChart2') },
      { key: 'templates', label: 'Templates', icon: icon('layers') },
      { key: 'sessions', label: 'Sessions', icon: icon('monitorPlay') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var rSections = {
      overview: recruiterOverview,
      candidates: recruiterCandidates,
      compare: recruiterCompare,
      templates: recruiterTemplates,
      sessions: recruiterSessions,
      settings: function() { return placeholderSection('Settings', 'Configure your recruiter preferences and notification settings.', icon('settings', 32)); },
    };
    content = (rSections[state.section] || rSections.overview)();
  } else if (state.page === 'admin') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'users', label: 'Users', icon: icon('users') },
      { key: 'analytics', label: 'Platform Analytics', icon: icon('barChart2') },
      { key: 'ai', label: 'AI Config', icon: icon('brain') },
      { key: 'activity', label: 'Activity Log', icon: icon('activity') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var aSections = {
      overview: adminOverview,
      users: adminUsers,
      analytics: adminAnalytics,
      ai: adminAI,
      activity: adminActivity,
      settings: function() { return placeholderSection('Platform Settings', 'Configure global platform behaviour, integrations, and security policies.', icon('settings', 32)); },
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

/* ── Auth helpers ── */
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
  render();
}

function handleLogout() {
  if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
    google.accounts.id.cancel();
    google.accounts.id.disableAutoSelect();
  }
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
  render();
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
    render();
  } catch (e) {
    localStorage.removeItem('smarthire_token');
    render();
  }
}

/* ── Event binding: Login ── */
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

/* ── Event binding: Dashboard ── */
function bindDashboardEvents() {
  document.querySelectorAll('.sidebar-link').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.section = this.dataset.section;
      if (state.section === 'recordings') {
        state.recordingsData = null;
      } else if (state.section === 'overview') {
        state.recruiterSummaryData = null;
      } else if (state.section === 'candidates') {
        state.recruiterCandidatesData = null;
      } else if (state.section === 'compare') {
        state.recruiterCompareData = null;
      } else if (state.section === 'sessions') {
        state.recruiterLiveSessionsData = null;
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

  /* ── Recruiter Dashboard Events ── */
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

  /* ── Template CRUD Events ── */
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

  /* ── Global View Report & Play Video Modal Handlers ── */
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

  if (state.page === 'candidate') {
    bindCandidateInterviewEvents();
    bindCandidateAssessmentEvents();
  }
}

/* ── Global Delegated Modal Close & Keyboard Dismissal Handlers ── */
if (!window._globalModalClickBound) {
  window._globalModalClickBound = true;

  document.addEventListener('click', function(e) {
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
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (state.activeVideoModal) {
        state.activeVideoModal = null;
        render();
      } else if (state.activeReportModal) {
        state.activeReportModal = null;
        render();
      } else if (state.showCreateTemplateModal) {
        state.showCreateTemplateModal = false;
        render();
      }
    }
  });
}


/* ── Chart drawing after render ── */
function drawCharts() {
  // Charts will be populated from API data in future implementation
}

/* ── Initialize ── */
checkAuth();
