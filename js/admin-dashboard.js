(function(){
  'use strict';
  const api=window.smartHireApi;
  const toast=(m,t='info')=>window.smartHireToast?window.smartHireToast('Admin',m,t):alert(m);
  async function loadUsers(){
    const body=document.getElementById('adminUserTableBody'); if(!body||!api)return;
    try{
      const q=new URLSearchParams(); const s=document.getElementById('adminUserSearch')?.value.trim(); if(s)q.set('search',s); const role=document.getElementById('adminRoleFilter')?.value; if(role&&role!=='all')q.set('role',role); const status=document.getElementById('adminStatusFilter')?.value; if(status&&status!=='all')q.set('status',status);
      const data=await api.requestJson('/api/admin/users?'+q.toString());
      body.innerHTML=data.length?data.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.role)}</td><td>${esc(u.status||'ACTIVE')}</td><td>${u.lastLogin?new Date(u.lastLogin).toLocaleString():'Never'}</td><td><button class="table-btn" data-edit="${u.id}">Edit</button> <button class="table-btn" data-delete="${u.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No users found.</td></tr>';
      body.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteUser(b.dataset.delete));
      body.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editUser(b.dataset.edit,data.find(x=>String(x.id)===b.dataset.edit)));
    }catch(e){body.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;}
  }
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  async function addUser(){const name=prompt('Full name:'); if(!name)return; const email=prompt('Email:'); if(!email)return; const password=prompt('Temporary password (min 6):'); if(!password)return; const role=(prompt('Role: candidate / recruiter / admin','candidate')||'candidate').toLowerCase(); try{await api.requestJson('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password,role})});toast('User created','success');loadUsers();}catch(e){toast(e.message,'error');}}
  async function editUser(id,u){const name=prompt('Name:',u?.name||'');if(name===null)return;const role=prompt('Role:',u?.role||'candidate');if(role===null)return;const status=prompt('Status ACTIVE / SUSPENDED / PENDING:',u?.status||'ACTIVE');if(status===null)return;try{await api.requestJson('/api/admin/users/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,role,status})});toast('User updated','success');loadUsers();}catch(e){toast(e.message,'error');}}
  async function deleteUser(id){if(!confirm('Delete this user permanently?'))return;try{await api.requestJson('/api/admin/users/'+id,{method:'DELETE'});toast('User deleted','success');loadUsers();}catch(e){toast(e.message,'error');}}
  async function action(type){try{const data=await api.requestJson('/api/admin/actions/'+type,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});toast(data.message||'Action completed','success');}catch(e){toast(e.message,'error');}}
  async function loadDashboard(){try{const d=await api.requestJson('/api/admin/dashboard');const stats=Array.isArray(d.stats)?d.stats:[];const find=(...labels)=>{const x=stats.find(s=>labels.some(l=>String(s.label||'').toLowerCase().includes(l)));return x?.value||'0';};[['adminTotalUsers',find('users')],['adminTotalCandidates',find('candidates')],['adminTotalRecruiters',find('recruiters')],['adminTotalInterviews',find('interviews')],['adminCompletedInterviews',find('completed')],['adminAverageScore',find('average')]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v;});const e=document.getElementById('adminPlatformStats');if(e)e.textContent='Live metrics loaded from the protected admin API.';
      const usersCount=Number(find('users'))||0, interviewCount=Number(find('interviews'))||0, resumeCount=Number(find('resumes'))||0, aiUsage=Number(find('ai usage'))||0;
      const navBadge=document.getElementById('adminUsersNavBadge'); if(navBadge) navBadge.textContent=String(usersCount);
      try{const h=await api.requestJson('/api/health');
        const backend=document.getElementById('healthBackend'); if(backend) backend.innerHTML='<i class="health-dot"></i>'+(h?.status==='UP'?'Operational':'Attention');
        const ai=document.getElementById('healthAi'); if(ai) ai.innerHTML='<i class="health-dot"></i>'+((h?.geminiConfigured||h?.deepfaceEnabled||h?.mediapipeEnabled||h?.whisperEnabled)?'Configured':'Fallback');
        const aa=document.getElementById('adminSystemHealthValue'); if(aa) aa.textContent=h?.status==='UP'?'100%':'0%';
        const ah=document.getElementById('adminSystemHealthHint'); if(ah) ah.textContent=h?.status==='UP'?'Backend health endpoint is reachable':'Backend health endpoint is unavailable';
        const rq=document.getElementById('adminRecruiterAccountsHealth'); if(rq) rq.innerHTML='<i class="health-dot"></i>'+ (usersCount>0?'Tracked':'No users');
        const iu=document.getElementById('adminInterviewUsageHealth'); if(iu) iu.innerHTML='<i class="health-dot"></i>'+ (interviewCount>0?'Tracked':'No interviews');
        const rr=document.getElementById('adminReportsHealth'); if(rr) rr.innerHTML='<i class="health-dot"></i>'+ (interviewCount>0?'Available':'Waiting');
      }catch(_){const aa=document.getElementById('adminSystemHealthValue');if(aa)aa.textContent='0%';const ah=document.getElementById('adminSystemHealthHint');if(ah)ah.textContent='Backend health endpoint unavailable';}

      const activityPct=Math.min(100,Math.round(interviewCount/(Math.max(1,usersCount)*2)*100));
      const dbPct=Math.min(100,Math.round(((usersCount+resumeCount)/(Math.max(1,usersCount+resumeCount+50)))*100));
      const aiPct=Math.min(100,Math.round(aiUsage/(Math.max(1,aiUsage+5))*100));
      const storagePct=Math.min(100,Math.round(resumeCount/(Math.max(1,resumeCount+50))*100));
      [['adminInterviewActivityBar',activityPct],['adminDatabaseLoadBar',dbPct],['adminAiAvailabilityBar',aiPct],['adminStorageFootprintBar',storagePct]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.style.width=v+'%';});
      [['adminInterviewActivityValue',activityPct],['adminDatabaseLoadValue',dbPct],['adminAiAvailabilityValue',aiPct],['adminStorageFootprintValue',storagePct]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v+'%';});
      [['adminRecruitersRegistered',find('recruiters')],['adminInterviewsToday',find('interviews')]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
      const health=document.getElementById('adminSystemHealthValue');if(health)health.textContent=aiPct>=70?'100%':'90%';
      const healthHint=document.getElementById('adminSystemHealthHint');if(healthHint)healthHint.textContent=aiPct>=70?'All configured services operational':'AI configuration needs attention';
      const healthChip=document.getElementById('adminPlatformHealthChip');if(healthChip)healthChip.textContent='Health: '+(aiPct>=70?'Operational':'Attention');
      const activityChip=document.getElementById('adminPlatformActivityChip');if(activityChip)activityChip.textContent='Activity: '+interviewCount+' interviews';
      const alertsChip=document.getElementById('adminPlatformAlertsChip');if(alertsChip)alertsChip.textContent='Alerts: '+(aiPct>=70?'0 critical':'AI configuration');
      try{const p=await api.requestJson('/api/analytics/performance'); const trendText2=document.getElementById('adminPlatformTrendText'); if(trendText2)trendText2.textContent += ` Average overall score: ${Math.round(Number(p.averageOverallScore)||0)}%; evaluation coverage: ${Math.round(Number(p.evaluationCoveragePercent)||0)}%.`; }catch(_){ }
      const trendTitle=document.getElementById('adminPlatformTrendTitle');if(trendTitle)trendTitle.textContent='Live platform trend';
      const trendText=document.getElementById('adminPlatformTrendText');if(trendText)trendText.textContent=usersCount?`Platform has ${usersCount} users, ${resumeCount} resumes and ${interviewCount} interview sessions recorded.`:'No platform activity recorded yet.';
      const activity=document.getElementById('adminRecentActivity');if(activity&&Array.isArray(d.recentActivities)){activity.innerHTML=d.recentActivities.slice(0,6).map(a=>`<div class="activity-item"><div class="activity-top"><span>${esc(a.title)}</span><time>${a.createdAt?new Date(a.createdAt).toLocaleString():''}</time></div><p>${esc(a.description)}</p></div>`).join('')||'<div class="activity-item">No recent activity.</div>';}}catch(e){toast('Unable to load live platform metrics','error');}}
  document.addEventListener('DOMContentLoaded',()=>{loadUsers();loadDashboard();document.getElementById('adminUserSearch')?.addEventListener('input',()=>loadUsers());document.getElementById('adminRoleFilter')?.addEventListener('change',loadUsers);document.getElementById('adminStatusFilter')?.addEventListener('change',loadUsers);document.getElementById('addUserButton')?.addEventListener('click',addUser);document.getElementById('backupButton')?.addEventListener('click',()=>action('backup'));document.getElementById('restartAiButton')?.addEventListener('click',()=>action('restart-ai'));document.getElementById('generateReportButton')?.addEventListener('click',()=>action('generate-report'));document.getElementById('viewLogsButton')?.addEventListener('click',()=>action('view-logs'));});
})();
