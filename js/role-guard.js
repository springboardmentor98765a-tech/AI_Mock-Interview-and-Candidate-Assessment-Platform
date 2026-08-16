(function(){
  'use strict';
  const path=(location.pathname.split('/').pop()||'').toLowerCase();
  const rules={
    'admin.html':['admin'], 'recruiter.html':['recruiter','admin'], 'recruiter-candidate-detail.html':['recruiter','admin'],
    'candidate.html':['candidate'], 'resume.html':['candidate'], 'interview-setup.html':['candidate'], 'live-interview.html':['candidate'],
    'interview-history.html':['candidate'], 'interview-report.html':['candidate','recruiter','admin'], 'reports.html':['candidate','recruiter','admin'],
    'performance-analytics.html':['candidate'], 'progress-reports.html':['candidate'], 'improvement-progress.html':['candidate'],
    'practice-assessment.html':['candidate'], 'settings.html':['candidate','recruiter','admin']
  };
  const allowed=rules[path]; if(!allowed) return;
  const token=localStorage.getItem('authToken');
  if(!token){ location.href='../index.html?authRequired=1'; return; }
  const base=(window.smartHireApi&&window.smartHireApi.baseUrl)||'http://localhost:8080';
  fetch(base+'/api/profile/me',{headers:{Authorization:'Bearer '+token}}).then(async r=>{
    if(!r.ok) throw new Error('unauthorized');
    return r.json();
  }).then(me=>{
    const role=String(me.role||'').toLowerCase();
    localStorage.setItem('userRole',role); localStorage.setItem('userName',me.name||''); localStorage.setItem('userEmail',me.email||''); localStorage.setItem('userId',String(me.userId||me.id||''));
    if(!allowed.includes(role)){ location.href='../index.html?roleDenied=1'; return; }
    window.smartHireRoleGuard={role,allowed,verified:true};
  }).catch(()=>{
    localStorage.removeItem('authToken'); localStorage.removeItem('userRole');
    location.href='../index.html?authRequired=1';
  });
})();
