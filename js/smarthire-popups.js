(() => {
  const openModal = (id) => document.getElementById(id)?.classList.add('open');
  const closeModal = (id) => document.getElementById(id)?.classList.remove('open');
  window.smartHireModal = {open: openModal, close: closeModal};
  document.addEventListener('click', (e) => {
    const close = e.target.closest('[data-sh-close]');
    if (close) closeModal(close.getAttribute('data-sh-close'));
    if (e.target.classList.contains('sh-modal-backdrop') && e.target.dataset.dismiss !== 'false') closeModal(e.target.id);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.sh-modal-backdrop.open').forEach(m => m.classList.remove('open'));
  });
  window.smartHireToast = (title, message='', type='success') => {
    let stack = document.querySelector('.sh-toast-stack');
    if (!stack) { stack=document.createElement('div'); stack.className='sh-toast-stack'; document.body.appendChild(stack); }
    const el=document.createElement('div'); el.className=`sh-toast ${type}`;
    const icon=type==='error'?'triangle-exclamation':'circle-check';
    el.innerHTML=`<i class="fa-solid fa-${icon}"></i><div><strong></strong><span></span></div>`;
    el.querySelector('strong').textContent=title; el.querySelector('span').textContent=message;
    stack.appendChild(el); setTimeout(()=>el.remove(),3800);
  };
})();
