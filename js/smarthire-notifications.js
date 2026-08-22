(function(){
  'use strict';
  const api=window.smartHireApi;
  if(!api)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const userId=()=>localStorage.getItem('userId');
  let host=null;

  function ensurePanel(button){
    if(host)return host;
    host=document.createElement('div');
    host.className='sh-notification-panel';
    host.setAttribute('role','dialog');
    host.setAttribute('aria-label','Notifications');
    host.innerHTML='<div class="sh-notification-head"><strong>Notifications</strong><button type="button" class="sh-notification-close" aria-label="Close notifications">×</button></div><div class="sh-notification-list"><div class="sh-notification-empty">Loading...</div></div>';
    document.body.appendChild(host);
    const close=host.querySelector('.sh-notification-close');
    close.addEventListener('click',()=>host.classList.remove('open'));
    document.addEventListener('click',e=>{if(host?.classList.contains('open')&&!host.contains(e.target)&&button&&!button.contains(e.target))host.classList.remove('open');});
    return host;
  }

  function setBadge(count){
    document.querySelectorAll('.notification-button').forEach(btn=>{
      let badge=btn.querySelector('[data-notification-count]');
      if(!badge){badge=btn.querySelector('span')||document.createElement('span');badge.dataset.notificationCount='true';if(!badge.parentNode)btn.appendChild(badge);}
      badge.textContent=String(Math.max(0,Number(count)||0));
      badge.setAttribute('aria-label',`${count} notifications`);
    });
  }

  function render(items){
    const list=host?.querySelector('.sh-notification-list'); if(!list)return;
    if(!items.length){list.innerHTML='<div class="sh-notification-empty">No new notifications.</div>';setBadge(0);return;}
    list.innerHTML=items.slice(0,8).map(n=>`<button type="button" class="sh-notification-item"><span class="sh-notification-icon"><i class="fa-${n.iconStyle||'solid'} ${esc(n.icon||'fa-bell')}"></i></span><span class="sh-notification-copy"><strong>${esc(n.title)}</strong><small>${esc(n.message)}</small><time>${esc(n.time||'')}</time></span></button>`).join('');
    setBadge(items.length);
  }

  async function loadCandidate(){
    const id=userId(); if(!id)return;
    try{
      const data=await api.requestJson(`/api/interviews/candidate/${encodeURIComponent(id)}/enhancements`);
      const notifications=Array.isArray(data?.notifications)?data.notifications:[];
      render(notifications.map(n=>({title:n.title||'Notification',message:n.message||n.description||'SmartHire AI update',time:n.createdAt?new Date(n.createdAt).toLocaleString():'Recently',icon:n.type==='INTERVIEW'?'fa-video':n.type==='RESUME'?'fa-file-lines':'fa-bell'})));
    }catch(e){render([]);}
  }

  async function loadRecruiter(){
    try{
      const [candidates, interviews]=await Promise.all([
        api.requestJson('/api/recruiter/candidates'),
        api.requestJson('/api/recruiter/interviews')
      ]);
      const cs=Array.isArray(candidates)?candidates:[], is=Array.isArray(interviews)?interviews:[];
      const items=[];
      if(is.length)items.push({title:`${is.length} interview${is.length===1?'':'s'} scheduled`,message:'Review the interview schedule and stored outcomes.',time:'Live',icon:'fa-calendar-days'});
      if(cs.length)items.push({title:`${cs.length} candidate profile${cs.length===1?'':'s'} available`,message:'Candidate analytics and ranking data are ready for review.',time:'Live',icon:'fa-users'});
      const scored=cs.filter(c=>Number.isFinite(Number(c.interviewScore))||Number.isFinite(Number(c.resumeAtsScore))).length;
      if(scored)items.push({title:`${scored} profile${scored===1?'':'s'} with scoring data`,message:'AI-assisted scoring evidence is available.',time:'Live',icon:'fa-ranking-star'});
      render(items);
    }catch(e){render([]);}
  }

  async function loadAdmin(){
    try{
      const [d,h]=await Promise.all([api.requestJson('/api/admin/dashboard'),api.requestJson('/api/health')]);
      const items=[];
      const stats=Array.isArray(d?.stats)?d.stats:[];
      const stat=(key)=>stats.find(s=>String(s.label||'').toLowerCase().includes(key));
      if(stat('interviews'))items.push({title:'Platform interview activity',message:`${stat('interviews').value||0} interview sessions recorded.`,time:'Live',icon:'fa-video'});
      if(h?.geminiConfigured)items.push({title:'Gemini configuration ready',message:'AI generation is configured on the backend.',time:'Live',icon:'fa-wand-magic-sparkles'});
      if(h?.deepfaceEnabled&&h?.mediapipeEnabled)items.push({title:'AI monitoring services enabled',message:'Emotion and eye-tracking providers are enabled.',time:'Live',icon:'fa-eye'});
      render(items);
    }catch(e){render([]);}
  }

  async function load(){
    const button=document.querySelector('.notification-button'); if(!button)return;
    const panel=ensurePanel(button);
    button.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open')){const role=(localStorage.getItem('userRole')||'').toLowerCase();if(role==='admin')loadAdmin();else if(role==='recruiter')loadRecruiter();else loadCandidate();}});
    const role=(localStorage.getItem('userRole')||'').toLowerCase();
    if(role==='admin')await loadAdmin();else if(role==='recruiter')await loadRecruiter();else await loadCandidate();
  }
  document.addEventListener('DOMContentLoaded',load);
})();
