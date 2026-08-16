(() => {
  const q = (s, r=document) => r.querySelector(s);
  const all = (s, r=document) => [...r.querySelectorAll(s)];

  // Mobile navigation menu
  const mobileToggle = q('.lp-mobile-menu-toggle');
  const mobileMenu = q('.lp-mobile-menu');
  const mobileLogin = q('.lp-mobile-login');
  const mobileStart = q('.lp-mobile-start');
  const setMobileOpen = (open) => {
    if (!mobileMenu || !mobileToggle) return;
    mobileMenu.hidden = !open;
    mobileToggle.setAttribute('aria-expanded', String(open));
    mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    const icon = q('i', mobileToggle);
    if (icon) icon.className = `fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`;
  };
  mobileToggle?.addEventListener('click', () => setMobileOpen(mobileMenu?.hidden !== false));
  mobileMenu?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMobileOpen(false);
  });
  mobileLogin?.addEventListener('click', () => { setMobileOpen(false); q('#openLogin')?.click(); });
  mobileStart?.addEventListener('click', () => { setMobileOpen(false); q('#openLogin')?.click(); });

  // Active section state for the desktop navigation.
  const navLinks = all('.navbar nav a[href^="#"]');
  const trackedSections = navLinks
    .map(a => a.getAttribute('href'))
    .filter(href => href && href.length > 1) // skip bare "#" links (invalid selector, no target section)
    .map(href => {
      try { return document.querySelector(href); } catch (e) { return null; }
    })
    .filter(Boolean);
  if ('IntersectionObserver' in window && trackedSections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle('active-link', a.getAttribute('href') === `#${entry.target.id}`));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0.01 });
    trackedSections.forEach(section => navObserver.observe(section));
  }

  const setHomeActive = () => {
    if (window.scrollY < 220) navLinks.forEach(a => a.classList.toggle('active-link', a.getAttribute('href') === '#'));
  };
  window.addEventListener('scroll', setHomeActive, {passive:true});
  setHomeActive();

  const roleButtons = all('.sh-role-btn');
  roleButtons.forEach(btn => btn.addEventListener('click', () => {
    const role = btn.dataset.role;
    if (role) localStorage.setItem('selectedRole', role);
    const openLogin = q('#openLogin');
    if (openLogin) openLogin.click();
  }));

  all('.hero-buttons .primary-btn, .cta button, .nav-buttons .start-btn').forEach(btn => {
    btn.addEventListener('click', () => q('#openLogin')?.click());
  });
  q('.hero-buttons .secondary-btn')?.addEventListener('click', () => q('#openAiDemo')?.click());

  // Improve role preselection whenever the login modal opens.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#openLogin, .sh-role-btn');
    if (!trigger) return;
    setTimeout(() => {
      const role = localStorage.getItem('selectedRole');
      const select = q('#roleSelect');
      if (role && select) select.value = role;
    }, 40);
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMobileOpen(false); });

  const modal = document.createElement('div');
  modal.className = 'sh-demo-modal';
  modal.innerHTML = `
    <div class="sh-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="shDemoTitle">
      <div class="sh-demo-dialog-head">
        <h3 id="shDemoTitle"><i class="fa-solid fa-robot" style="color:#6d35e8;margin-right:8px"></i>SmartHire AI Interview Demo</h3>
        <button class="sh-demo-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="sh-demo-dialog-body">
        <div class="sh-modal-question">Tell me about a challenging project you worked on and how you solved the problem.</div>
        <textarea class="sh-modal-answer" placeholder="Type a sample answer here..."></textarea>
        <div class="sh-modal-actions">
          <button class="sh-modal-secondary sh-demo-cancel" type="button">Close</button>
          <button class="sh-modal-primary sh-evaluate" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> Evaluate Answer</button>
        </div>
        <div class="sh-eval-result">
          <strong style="color:#6d35e8">AI Evaluation</strong>
          <p style="margin:7px 0;color:#756e83;font-size:12px">Good structure. Add one measurable result to make your answer stronger.</p>
          <div class="sh-eval-grid">
            <div><strong>88%</strong><span>Technical</span></div>
            <div><strong>76%</strong><span>Communication</span></div>
            <div><strong>91%</strong><span>Relevance</span></div>
            <div><strong>84%</strong><span>Overall</span></div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const open = () => modal.classList.add('open');
  const close = () => modal.classList.remove('open');
  q('#openAiDemo')?.addEventListener('click', open);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.sh-demo-close,.sh-demo-cancel')) close();
    const evalBtn = e.target.closest('.sh-evaluate');
    if (evalBtn) {
      const result = q('.sh-eval-result', modal);
      result.style.display = 'block';
      evalBtn.textContent = '✓ Evaluated';
      evalBtn.disabled = true;
      window.smartHireToast?.('AI evaluation complete', 'Sample feedback generated for the demo answer.', 'success');
    }
  });
})();
