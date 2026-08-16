(() => {
  'use strict';
  const KEY = 'smarthire.theme';
  const getTheme = () => localStorage.getItem(KEY) || 'light';

  if (typeof window.smartHireToast !== 'function') {
    window.smartHireToast = (title, message = '', type = 'success') => {
      let stack = document.querySelector('.sh-toast-stack');
      if (!stack) { stack = document.createElement('div'); stack.className = 'sh-toast-stack'; document.body.appendChild(stack); }
      const el = document.createElement('div');
      el.className = `sh-toast ${type}`;
      const icon = type === 'error' ? 'triangle-exclamation' : type === 'warning' ? 'triangle-exclamation' : 'circle-check';
      el.innerHTML = `<i class="fa-solid fa-${icon}"></i><div><strong></strong><span></span></div>`;
      el.querySelector('strong').textContent = title;
      el.querySelector('span').textContent = message;
      stack.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    };
  }
  const isDark = () => getTheme() === 'dark';

  const updateButtons = () => {
    const dark = isDark();
    document.querySelectorAll('#candidateThemeToggle,#themeToggle,.sh-theme-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', String(dark));
      if (btn.id === 'candidateThemeToggle' || btn.id === 'themeToggle' || btn.classList.contains('sh-theme-toggle')) {
        const icon = dark ? 'fa-sun' : 'fa-moon';
        const label = dark ? 'Light' : 'Dark';
        if (btn.querySelector('i')) btn.querySelector('i').className = `fa-solid ${icon}`;
        const span = btn.querySelector('span');
        if (span) span.textContent = label; else if (!btn.querySelector('i')) btn.textContent = label;
        if (btn.id === 'themeToggle' && !btn.querySelector('i')) btn.textContent = dark ? '☀️' : '🌙';
      }
    });
    const settingsBtn = document.getElementById('settingsTheme');
    if (settingsBtn) settingsBtn.textContent = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  };

  const apply = (theme, announce = false) => {
    const dark = theme === 'dark';
    document.body.classList.toggle('dark-mode', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    updateButtons();
    if (announce && typeof window.smartHireToast === 'function') {
      window.smartHireToast(dark ? 'Dark mode enabled' : 'Light mode enabled', 'Your SmartHire theme is saved across candidate pages.');
    }
  };

  const setTheme = (theme, announce = true) => {
    localStorage.setItem(KEY, theme === 'dark' ? 'dark' : 'light');
    apply(getTheme(), announce);
  };

  window.smartHireTheme = { get: getTheme, set: setTheme, apply: () => apply(getTheme(), false) };

  // Apply before the page becomes interactive so every candidate page uses the same theme.
  apply(getTheme(), false);

  document.addEventListener('click', (event) => {
    const logout = event.target.closest('[data-sh-logout],#shLogoutBtn');
    if (logout) {
      event.preventDefault();
      ['authToken','userRole','userEmail','userName','userId'].forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      window.location.href = '../index.html';
      return;
    }

    const btn = event.target.closest('#candidateThemeToggle,#themeToggle,#settingsTheme,.sh-theme-toggle');
    if (!btn) return;
    event.preventDefault();
    setTheme(isDark() ? 'light' : 'dark', true);
  });

  window.addEventListener('storage', (event) => {
    if (event.key === KEY) apply(event.newValue === 'dark' ? 'dark' : 'light', false);
  });
})();
