var GOOGLE_CLIENT_ID = '319418471257-p38pt2u09403hv57u75dg1ti5tcu1h21.apps.googleusercontent.com';
var googleInitialized = false;

function initGoogleSignIn() {
  if (typeof google === 'undefined' || !google.accounts) {
    setTimeout(initGoogleSignIn, 500);
    return;
  }
  try {
    if (!googleInitialized) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      googleInitialized = true;
    }

    var container = document.getElementById('google-signin-button');
    if (container) {
      container.innerHTML = '';
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: container.offsetWidth || 180,
      });
    }
  } catch (e) {
    console.error('Google init error:', e);
  }
}

function handleGoogleCredential(response) {
  var container = document.getElementById('google-signin-button');
  if (container) {
    container.style.pointerEvents = 'none';
    container.style.opacity = '0.65';
  }
  api.googleLogin(response.credential).then(function(data) {
    handleAuthSuccess(data);
  }).catch(function(err) {
    state.authError = err.message;
    render();
  });
}

function renderLoginPage() {
  var roles = [
    { key: 'candidate', label: 'Candidate', desc: 'Practice & get assessed', icon: icon('user', 18), color: INDIGO },
    { key: 'recruiter', label: 'Recruiter', desc: 'Evaluate & compare talent', icon: icon('briefcase', 18), color: CYAN },
    { key: 'admin', label: 'Admin', desc: 'Manage the platform', icon: icon('shield', 18), color: EMERALD },
  ];

  var errorMsg = state.authError ? `<div class="auth-error">${state.authError}</div>` : '';

  return `<div class="flex min-h-screen" style="background:#06070f">
    <div class="login-left hidden lg:flex flex-col justify-between p-12 relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-20" style="background:${INDIGO}"></div>
        <div class="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15" style="background:${CYAN}"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-10" style="background:${EMERALD}"></div>
      </div>
      <div class="relative">
        <div class="flex items-center gap-2 mb-2">
          <div class="logo-icon">${icon('brain', 18)}</div>
          <span class="logo-text">SmartHire AI</span>
        </div>
      </div>
      <div class="relative space-y-8">
        <div>
          <h1 class="login-title">Ace Every<br><span style="color:${INDIGO}">Interview</span><br>With AI</h1>
          <p class="login-subtitle">AI-powered mock interviews, real-time speech analysis, and personalized feedback to accelerate your career.</p>
        </div>
        <div class="grid grid-cols-3 gap-4">
          ${[{ v: '94%', l: 'Placement Rate' }, { v: '12K+', l: 'Candidates' }, { v: '4.9★', l: 'Avg Rating' }].map(function(s) {
            return `<div class="login-stat"><p class="login-stat-value">${s.v}</p><p class="login-stat-label">${s.l}</p></div>`;
          }).join('')}
        </div>
        <div class="login-feature">
          <div class="login-feature-icon">${icon('mic', 16)}</div>
          <div>
            <p class="text-white/80 text-sm font-medium">AI Speech Analysis</p>
            <p class="text-white/40 text-xs mt-0.5">Real-time confidence scoring, filler word detection, and pacing feedback during your interview.</p>
          </div>
        </div>
      </div>
      <p class="relative text-white/20 text-xs">&copy; 2025 SmartHire AI. All rights reserved.</p>
    </div>
    <div class="flex-1 flex items-center justify-center p-8" style="background:#09091a">
      <div class="w-full max-w-md">
        <div class="flex items-center gap-2 mb-8 lg:hidden">
          ${icon('brain', 20)}
          <span class="logo-text">SmartHire AI</span>
        </div>
        <div class="mb-8">
          <h2 class="text-2xl font-bold text-white mb-1" style="font-family:'Outfit',sans-serif">${state.authMode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p class="text-white/40 text-sm">${state.authMode === 'login' ? 'Sign in to your account to continue' : 'Get started with AI-powered interviews'}</p>
        </div>
        ${errorMsg}
        <div class="auth-toggle flex rounded-lg p-1 mb-6" style="background:#141627">
          <button class="auth-toggle-btn flex-1 py-2 rounded-md text-sm font-medium transition-all ${state.authMode === 'login' ? 'active' : ''}" data-mode="login" style="${state.authMode === 'login' ? 'background:' + INDIGO + ';color:#fff' : 'color:rgba(255,255,255,0.4)'}">Sign In</button>
          <button class="auth-toggle-btn flex-1 py-2 rounded-md text-sm font-medium transition-all ${state.authMode === 'signup' ? 'active' : ''}" data-mode="signup" style="${state.authMode === 'signup' ? 'background:' + INDIGO + ';color:#fff' : 'color:rgba(255,255,255,0.4)'}">Sign Up</button>
        </div>
        <div class="mb-5">
          <p class="text-xs text-white/40 mb-2 font-medium uppercase tracking-wider">Continue as</p>
          <div class="grid grid-cols-3 gap-2">
            ${roles.map(function(r) {
              var sel = state.role === r.key;
              return `<button class="role-btn p-3 rounded-xl border text-left transition-all" data-role="${r.key}" style="${sel ? 'background:' + r.color + '18;border-color:' + r.color + '60' : 'background:#141627;border-color:rgba(255,255,255,0.07)'}">
                <span style="color:${sel ? r.color : 'rgba(255,255,255,0.3)'}">${r.icon}</span>
                <p class="text-xs font-semibold mt-1.5 ${sel ? 'text-white' : 'text-white/50'}">${r.label}</p>
                <p class="text-xs text-white/30 mt-0.5 leading-tight">${r.desc}</p>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="space-y-3 mb-5">
          ${state.authMode === 'signup' ? `<div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Full Name</label>
            <div class="input-wrap">${icon('user', 15)}<input id="inp-name" value="${state.name}" placeholder="John Doe" class="form-input" /></div>
          </div>` : ''}
          ${state.authMode === 'signup' && state.role !== 'candidate' ? `<div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Organization</label>
            <div class="input-wrap">${icon('building', 15)}<input id="inp-org" value="${state.org}" placeholder="Company / Institution" class="form-input" /></div>
          </div>` : ''}
          <div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Email</label>
            <div class="input-wrap">${icon('mail', 15)}<input id="inp-email" value="${state.email}" placeholder="you@example.com" class="form-input" /></div>
          </div>
          <div>
            <label class="block text-xs text-white/40 mb-1.5 font-medium">Password</label>
            <div class="input-wrap"><span class="input-icon" aria-hidden="true">${icon('lock', 15)}</span><input id="inp-pass" type="${state.showPassword ? 'text' : 'password'}" value="${state.password}" placeholder="••••••••" class="form-input password-input" /><button type="button" id="toggle-pass" class="pass-toggle-btn" aria-label="${state.showPassword ? 'Hide password' : 'Show password'}" aria-pressed="${state.showPassword}" title="${state.showPassword ? 'Hide password' : 'Show password'}">${state.showPassword ? icon('eyeOff') : icon('eye')}</button></div>
          </div>
        </div>
        ${state.authMode === 'login' ? `<div class="flex justify-end mb-4"><button class="text-xs font-medium" style="color:${INDIGO}">Forgot password?</button></div>` : ''}
        <button id="btn-auth" class="auth-btn w-full py-3 rounded-lg text-white text-sm font-semibold mb-4">${state.authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        <div id="auth-loading" class="text-center text-xs text-white/40 mb-4" style="display:none">Please wait...</div>
        <div class="relative flex items-center gap-3 mb-4"><div class="flex-1 h-px" style="background:rgba(255,255,255,0.08)"></div><span class="text-xs text-white/30">or continue with</span><div class="flex-1 h-px" style="background:rgba(255,255,255,0.08)"></div></div>
        <div class="grid grid-cols-1 gap-3 mb-6">
          <div id="google-signin-button" class="min-h-10 flex items-center justify-center"></div>
        </div>
        <p class="text-center text-xs text-white/30">
          ${state.authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button id="toggle-auth" class="font-semibold" style="color:${INDIGO}">${state.authMode === 'login' ? 'Sign up' : 'Sign in'}</button>
        </p>
      </div>
    </div>
  </div>`;
}
