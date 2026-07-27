/* 
   AI Interview Management Platform*/

(function () {
  'use strict';

  /* ---------- Toast helper ---------- */
  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }
  window.__toast = toast;

  /* ---------- Landing nav toggle ---------- */
  function initLandingNav() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
    }
  }

  /* ---------- Login page ---------- */
  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const role = document.getElementById('role');
    const email = document.getElementById('email');
    const password = document.getElementById('password');

    const routes = {
      candidate: 'candidate.html',
      recruiter: 'recruiter.html',
      admin: 'admin.html'
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const selected = role ? role.value : 'candidate';
      if (!email.value || !password.value) {
        toast('Please enter your email and password');
        return;
      }
      const dest = routes[selected] || routes.candidate;
      toast('Signing in as ' + capitalize(selected) + '...');
      setTimeout(() => { window.location.href = dest; }, 700);
    });

    document.querySelectorAll('[data-social]').forEach(btn => {
      btn.addEventListener('click', function () {
        const provider = this.getAttribute('data-social');
        const selected = role ? role.value : 'candidate';
        const dest = routes[selected] || routes.candidate;
        toast('Continuing with ' + provider + '...');
        setTimeout(() => { window.location.href = dest; }, 700);
      });
    });
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- Dashboard shared ---------- */
  function initDashboard() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const role = document.body.getAttribute('data-role') || 'user';
    const userName = document.body.getAttribute('data-name') || 'User';

    /* populate user chip */
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = userName;
    });
    document.querySelectorAll('[data-user-role]').forEach(el => {
      el.textContent = capitalize(role);
    });
    document.querySelectorAll('[data-user-initials]').forEach(el => {
      el.textContent = getInitials(userName);
    });

    /* sidebar navigation (SPA-style page switching) */
    const navItems = document.querySelectorAll('.sidebar-menu .nav-item[data-page]');
    const pages = document.querySelectorAll('.page');
    const topbarTitle = document.querySelector('[data-topbar-title]');

    navItems.forEach(item => {
      item.addEventListener('click', function () {
        const pageId = this.getAttribute('data-page');
        const isLogout = this.getAttribute('data-logout') === 'true';

        if (isLogout) {
          toast('Logging out...');
          setTimeout(() => { window.location.href = 'login.html'; }, 600);
          return;
        }

        navItems.forEach(n => n.classList.remove('active'));
        this.classList.add('active');

        pages.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(pageId);
        if (target) target.classList.add('active');

        const label = this.querySelector('.label') ? this.querySelector('.label').textContent : '';
        if (topbarTitle) topbarTitle.textContent = label;
        if (sidebar.classList.contains('open')) closeSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    /* mobile sidebar toggle */
    const menuBtn = document.querySelector('[data-menu-toggle]');
    const backdrop = document.querySelector('.backdrop');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (backdrop) backdrop.classList.toggle('show');
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    function closeSidebar() {
      sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
    }

    /* toggles */
    document.querySelectorAll('.toggle').forEach(t => {
      t.addEventListener('click', () => t.classList.toggle('on'));
    });

    /* animate progress bars on first reveal */
    animateProgress();
    animateBars();

    /* upload zone */
    const uploadZone = document.querySelector('[data-upload]');
    if (uploadZone) {
      const fileInput = uploadZone.querySelector('input[type="file"]');
      const preview = document.getElementById('uploadPreview');
      uploadZone.addEventListener('click', () => fileInput && fileInput.click());
      uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag'); });
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
      uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag');
        if (preview) showFilePreview(preview, e.dataTransfer.files[0]);
      });
      if (fileInput) {
        fileInput.addEventListener('change', () => {
          if (preview) showFilePreview(preview, fileInput.files[0]);
        });
      }
    }

    /* generic action buttons */
    document.querySelectorAll('[data-action="toast"]').forEach(btn => {
      btn.addEventListener('click', () => toast(btn.getAttribute('data-message') || 'Action completed'));
    });
  }

  function getInitials(name) {
    return name.split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  }

  function animateProgress() {
    document.querySelectorAll('.progress-bar .fill').forEach(fill => {
      const w = fill.getAttribute('data-width') || fill.style.width;
      fill.style.width = '0%';
      requestAnimationFrame(() => { fill.style.width = w; });
    });
  }

  function animateBars() {
    document.querySelectorAll('.bar-col .bar').forEach(bar => {
      const h = bar.getAttribute('data-height');
      if (!h) return;
      bar.style.height = '0';
      requestAnimationFrame(() => { bar.style.height = h; });
    });
  }

  function showFilePreview(container, file) {
    if (!file) return;
    const sizeKb = (file.size / 1024).toFixed(1);
    container.innerHTML =
      '<div class="uploaded-file">' +
        '<div class="f-icon">📄</div>' +
        '<div class="f-info"><div class="f-name">' + escapeHtml(file.name) + '</div>' +
        '<div class="f-meta">' + sizeKb + ' KB · uploaded just now</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-action="toast" data-message="Resume removed">Remove</button>' +
      '</div>';
    toast('Resume uploaded successfully');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  /* ---------- Contact form (landing) ---------- */
  function initContact() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      toast('Thanks! We will get back to you shortly.');
      form.reset();
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initLandingNav();
    initLogin();
    initDashboard();
    initContact();
  });
})();
