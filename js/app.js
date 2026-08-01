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
    return;
  }

  var navItems, content;
  var username = state.user ? state.user.name : 'User';
  var avatar = username.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

  if (state.page === 'candidate') {
    navItems = [
      { key: 'overview', label: 'Overview', icon: icon('layout') },
      { key: 'interviews', label: 'Mock Interviews', icon: icon('monitorPlay') },
      { key: 'analytics', label: 'Analytics', icon: icon('barChart2') },
      { key: 'resume', label: 'Resume & Skills', icon: icon('fileText') },
      { key: 'history', label: 'Interview History', icon: icon('clock') },
      { key: 'reports', label: 'Reports', icon: icon('downloadLg') },
      { key: 'settings', label: 'Settings', icon: icon('settings') },
    ];
    var sections = {
      overview: candidateOverview,
      interviews: candidateInterviews,
      analytics: candidateAnalytics,
      resume: candidateResume,
      history: candidateHistory,
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
  bindDashboardEvents();
  drawCharts();
}

/* ── Auth helpers ── */
function handleAuthSuccess(data) {
  localStorage.setItem('smarthire_token', data.token);
  state.token = data.token;
  state.user = data.user;
  state.page = data.user.role;
  state.section = 'overview';
  state.authError = '';
  state.email = '';
  state.password = '';
  state.name = '';
  state.org = '';
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
  render();
}

async function checkAuth() {
  var token = localStorage.getItem('smarthire_token');
  if (!token) {
    render();
    return;
  }
  try {
    var data = await api.getMe();
    state.token = token;
    state.user = data.user;
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
      var tempVal = document.getElementById('temp-val');
      if (tempVal) tempVal.textContent = state.temp.toFixed(1);
    });
  }
}

/* ── Chart drawing after render ── */
function drawCharts() {
  var labels = perfData.map(function(d) { return d.week; });

  if (document.getElementById('chart-perf-area')) {
    drawAreaChart('chart-perf-area', [
      { label: 'Confidence', data: perfData.map(function(d) { return d.confidence; }), color: INDIGO },
      { label: 'Fluency', data: perfData.map(function(d) { return d.fluency; }), color: CYAN },
      { label: 'Technical', data: perfData.map(function(d) { return d.technical; }), color: EMERALD },
    ], labels);
  }

  if (document.getElementById('chart-cat-bar')) {
    var scoreData = [
      { name: 'Technical', score: 79 }, { name: 'HR', score: 84 }, { name: 'Behavioural', score: 72 }, { name: 'Aptitude', score: 91 },
    ];
    drawBarChart('chart-cat-bar', scoreData.map(function(d) { return d.score; }), scoreData.map(function(d) { return d.name; }), [INDIGO, CYAN, EMERALD, AMBER]);
  }

  if (document.getElementById('chart-weekly-line')) {
    drawLineChart('chart-weekly-line', [
      { label: 'Confidence', data: perfData.map(function(d) { return d.confidence; }), color: INDIGO },
      { label: 'Fluency', data: perfData.map(function(d) { return d.fluency; }), color: CYAN },
    ], labels);
  }

  if (document.getElementById('chart-funnel')) {
    drawHorizontalBarChart('chart-funnel', funnelData.map(function(d) { return d.count; }), funnelData.map(function(d) { return d.stage; }), CYAN);
  }

  if (document.getElementById('chart-compare')) {
    var compareData = [
      { metric: 'Technical', Emeka: 88, Amina: 82, Ngozi: 79 },
      { metric: 'Communication', Emeka: 75, Amina: 91, Ngozi: 83 },
      { metric: 'Confidence', Emeka: 80, Amina: 88, Ngozi: 76 },
      { metric: 'Aptitude', Emeka: 85, Amina: 78, Ngozi: 90 },
      { metric: 'Behavioural', Emeka: 72, Amina: 94, Ngozi: 81 },
    ];
    drawGroupedBarChart('chart-compare', [
      { label: 'Emeka', data: compareData.map(function(d) { return d.Emeka; }), color: CYAN },
      { label: 'Amina', data: compareData.map(function(d) { return d.Amina; }), color: EMERALD },
      { label: 'Ngozi', data: compareData.map(function(d) { return d.Ngozi; }), color: INDIGO },
    ], compareData.map(function(d) { return d.metric; }));
  }

  if (document.getElementById('chart-growth')) {
    drawAreaChart('chart-growth', [
      { label: 'Users', data: platformData.map(function(d) { return d.users; }), color: EMERALD },
      { label: 'Sessions', data: platformData.map(function(d) { return d.sessions; }), color: INDIGO },
      { label: 'Reports', data: platformData.map(function(d) { return d.reports; }), color: CYAN },
    ], platformData.map(function(d) { return d.month; }));
  }

  if (document.getElementById('chart-monthly-sessions')) {
    drawBarChart('chart-monthly-sessions', platformData.map(function(d) { return d.sessions; }), platformData.map(function(d) { return d.month; }), [INDIGO]);
  }

  if (document.getElementById('chart-pie')) {
    drawPieChart('chart-pie', [2340, 84, 12], ['Candidates', 'Recruiters', 'Admins'], [EMERALD, CYAN, INDIGO]);
  }
}

/* ── Initialize ── */
checkAuth();
