(function(){
  'use strict';
  const API=(window.smartHireApi&&window.smartHireApi.baseUrl)||'http://localhost:8080';
  const token=()=>localStorage.getItem('authToken')||'';
  const headers=()=>({Authorization:'Bearer '+token()});
  const esc=(v)=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pct=(v)=>Number.isFinite(Number(v))?Math.round(Number(v))+'%':'Pending';
  const fmt=(v)=>{if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString();};
  const composite=(c)=>{const a=Number(c?.resumeAtsScore),i=Number(c?.interviewScore); if(Number.isFinite(i)&&Number.isFinite(a))return Math.round(i*.6+a*.4); if(Number.isFinite(i))return Math.round(i); if(Number.isFinite(a))return Math.round(a); return -1;};
  const request=async(path,opts={})=>{const r=await fetch(API+path,{...opts,headers:{...headers(),...(opts.headers||{})}}); if(!r.ok){let msg='HTTP '+r.status; try{const j=await r.json(); if(j?.message)msg=j.message;}catch{} throw new Error(msg);} return r;};
  const notify=(title,message,type='success')=>window.smartHireToast?window.smartHireToast(title,message,type):console.log(title,message);
  let candidates=[];

  function upsertSection(){
    const anchor=document.getElementById('candidate-management');
    if(!anchor||document.getElementById('recruiter-enhanced-intelligence'))return;
    const wrap=document.createElement('section');
    wrap.id='recruiter-enhanced-intelligence';
    wrap.className='recruiter-intelligence-grid';
    wrap.innerHTML=`
      <div class="recruiter-intelligence-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h3><i class="fa-solid fa-trophy" style="color:#6d35e8;margin-right:7px"></i>Top Performers</h3><p>Highest combined interview + ATS performance.</p></div><span class="section-badge">Live</span></div><div id="recruiterEnhancedTop" class="candidate-mini-list"><div class="candidate-mini"><div class="candidate-mini-main"><div class="candidate-mini-name">Loading candidates...</div></div></div></div></div>
      <div class="recruiter-intelligence-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h3><i class="fa-solid fa-file-lines" style="color:#6d35e8;margin-right:7px"></i>Resume Intelligence</h3><p>ATS score, skills and missing-skill signals.</p></div><span class="section-badge">Resumes</span></div><div id="recruiterEnhancedResumes" class="resume-intelligence"><div class="resume-card-mini">Loading resumes...</div></div></div>
      <div class="recruiter-intelligence-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h3><i class="fa-solid fa-chart-line" style="color:#6d35e8;margin-right:7px"></i>Hiring Health</h3><p>Current pool readiness from real candidate data.</p></div><span class="section-badge">AI-assisted</span></div><div class="metric-big" id="recruiterHiringHealth">-</div><div class="mini-scores"><span class="mini-score" id="recruiterAvgInterview">Avg interview -</span><span class="mini-score" id="recruiterAvgAts">Avg ATS -</span><span class="mini-score" id="recruiterShortlistRate">Shortlist -</span></div></div>`;
    anchor.parentNode.insertBefore(wrap,anchor);

    const compare=document.getElementById('candidate-comparison');
    if(compare){
      const toolbar=document.createElement('div');toolbar.className='recruiter-compare-toolbar';toolbar.innerHTML='<span class="muted">Select up to 4 candidates for live comparison.</span><button id="recruiterCompareSelected" class="table-btn primary" type="button">Compare Selected</button><button id="recruiterClearCompare" class="table-btn" type="button">Clear</button>';
      compare.querySelector('.role-card')?.prepend(toolbar);
      const table=compare.querySelector('table');
      if(table){table.id='recruiterComparisonTable';}
    }

    const reportSection=document.createElement('section');reportSection.id='recruiter-live-reports';reportSection.className='role-card';reportSection.style.marginBottom='14px';reportSection.innerHTML=`<div class="role-card-head"><div><h2><i class="fa-solid fa-file-waveform" style="color:#6d35e8;margin-right:8px"></i>Latest Interview Reports</h2><p>Stored interview outcomes available to recruiter review.</p></div><span class="section-badge">Stored</span></div><div id="recruiterReportsList"><div class="recruiter-report-row"><div class="report-name">Loading reports...</div></div></div>`;
    const footer=document.querySelector('.role-footer-note');footer?.before(reportSection);
  }

  function renderTop(){
    const el=document.getElementById('recruiterEnhancedTop');if(!el)return;
    const top=[...candidates].sort((a,b)=>composite(b)-composite(a)).slice(0,4);
    if(!top.length){el.innerHTML='<div class="candidate-mini"><div class="candidate-mini-main"><div class="candidate-mini-name">No scored candidates yet</div><div class="candidate-mini-role">Complete interviews and resume analysis to populate rankings.</div></div></div>';return;}
    el.innerHTML=top.map((c,idx)=>`<div class="candidate-mini"><div class="candidate-mini-main"><div class="candidate-mini-name">${idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':'⭐'} ${esc(c.candidateName||'Candidate')}</div><div class="candidate-mini-role">${esc(c.jobRole||'Role not provided')}</div><div class="mini-scores"><span class="mini-score">ATS ${pct(c.resumeAtsScore)}</span><span class="mini-score">Interview ${pct(c.interviewScore)}</span></div></div><div class="candidate-mini-actions"><span class="score-pill success">Match ${composite(c)>=0?composite(c)+'%':'-'}</span><button class="table-btn recruiter-view-btn" data-id="${Number(c.candidateId)||0}" type="button">Profile</button></div></div>`).join('');
    el.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>window.location.href='recruiter-candidate-detail.html?candidateId='+b.dataset.id));
  }

  function renderResumes(){
    const el=document.getElementById('recruiterEnhancedResumes');if(!el)return;
    const rows=[...candidates].filter(c=>c.resumeFileName||c.resumeAtsScore!=null).sort((a,b)=>(Number(b.resumeAtsScore)||0)-(Number(a.resumeAtsScore)||0)).slice(0,6);
    if(!rows.length){el.innerHTML='<div class="resume-card-mini"><strong>No resumes available</strong><small>Upload and analyze resumes to populate recruiter intelligence.</small></div>';return;}
    el.innerHTML=rows.map(c=>{const skills=(c.skills||[]).slice(0,4).map(x=>`<span class="resume-tag">${esc(x)}</span>`).join('');const miss=(c.missingSkills||[]).slice(0,2).map(x=>`<span class="resume-tag missing">Missing ${esc(x)}</span>`).join('');return `<div class="resume-card-mini"><strong>${esc(c.candidateName||'Candidate')}</strong><small>${esc(c.resumeFileName||'Resume')}</small><div class="resume-tags"><span class="score-pill">ATS ${pct(c.resumeAtsScore)}</span>${skills}${miss}</div><div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap"><button class="table-btn" type="button" data-resume-id="${Number(c.candidateId)||0}">Open Resume</button><button class="table-btn primary" type="button" data-profile-id="${Number(c.candidateId)||0}">Profile</button></div></div>`;}).join('');
    el.querySelectorAll('[data-resume-id]').forEach(b=>b.addEventListener('click',()=>{const id=Number(b.dataset.resumeId);if(id)window.open(API+'/api/recruiter/candidates/'+id+'/resume','_blank','noopener');}));
    el.querySelectorAll('[data-profile-id]').forEach(b=>b.addEventListener('click',()=>window.location.href='recruiter-candidate-detail.html?candidateId='+b.dataset.profileId));
  }

  function renderPipeline(){
    const count=(status)=>candidates.filter(c=>String(c.status||'').toLowerCase()===status).length;
    const vals={pipelineNewCount:count('new'),pipelineInterviewedCount:count('interviewed'),pipelineShortlistedCount:count('shortlisted'),pipelineRejectedCount:count('rejected'),pipelineScoredCount:candidates.filter(c=>Number.isFinite(Number(c.interviewScore))).length};
    Object.entries(vals).forEach(([id,val])=>{const e=document.getElementById(id);if(e)e.textContent=String(val);});
    const priority=candidates.filter(c=>composite(c)>=85).length;const strong=candidates.filter(c=>String(c.recommendation||'').toLowerCase().includes('strong')||String(c.recommendation||'').toLowerCase().includes('hire')).length;
    const p=document.getElementById('recruiterPriorityChip');if(p)p.textContent=priority+' priority profiles';
    const m=document.getElementById('recruiterStrongMatchChip');if(m)m.textContent=strong+' strong matches';
    const cop=document.getElementById('recruiterCopilotText');if(cop){const top=[...candidates].sort((a,b)=>composite(b)-composite(a))[0];cop.textContent=top?`Focus review on ${top.candidateName||'the highest-ranked candidate'} (${composite(top)}% combined ATS/interview evidence). Verify transcript and communication evidence before any hiring decision.`:'Upload resumes and complete interviews to activate evidence-based recruiter guidance.';}
  }

  async function loadInterviewSchedule(){
    const body=document.getElementById('recruiterInterviewScheduleBody');if(!body)return;
    try{
      const r=await request('/api/recruiter/interviews');
      const items=await r.json();
      const all=Array.isArray(items)?items:[];
      const rows=all.slice(0,8);
      const interviewBadge=document.getElementById('recruiterInterviewBadge');
      if(interviewBadge) interviewBadge.textContent=String(all.length);
      const candidateBadge=document.getElementById('recruiterCandidateBadge');
      if(candidateBadge&&Array.isArray(candidates)) candidateBadge.textContent=String(candidates.length);
      const todayKey=new Date().toDateString();
      const todayCount=all.filter(x=>x.interviewDate&&new Date(x.interviewDate).toDateString()===todayKey).length;
      const todayBadge=document.getElementById('recruiterInterviewTodayBadge');
      if(todayBadge) todayBadge.innerHTML='<i class="fa-solid fa-bolt"></i> '+todayCount+' interviews today';
      if(!rows.length){body.innerHTML='<tr><td colspan="6">No interview activity stored yet.</td></tr>';return;}
      body.innerHTML=rows.map(x=>`<tr><td>${esc(x.candidateName||'Candidate')}</td><td>${esc(x.jobRole||'Role')}</td><td>${esc(fmt(x.interviewDate))}</td><td>${esc(x.interviewType||'AI Interview')}</td><td><span class="status ${x.status==='Completed'?'active':'pending'}">${esc(x.status||'Unknown')}</span></td><td><button class="table-btn primary" type="button" data-schedule-id="${Number(x.candidateId)||0}">Review</button></td></tr>`).join('');
      body.querySelectorAll('[data-schedule-id]').forEach(b=>b.addEventListener('click',()=>location.href='recruiter-candidate-detail.html?candidateId='+b.dataset.scheduleId));
    }catch(e){body.innerHTML='<tr><td colspan="6">Unable to load stored interview activity.</td></tr>';}
  }

  function renderComparison(){
    const table=document.getElementById('recruiterComparisonTable'); if(!table)return;
    const selected=[...document.querySelectorAll('.recruiter-compare-check:checked')].slice(0,4).map(x=>Number(x.value)).filter(Boolean);
    const rows=candidates.filter(c=>selected.includes(Number(c.candidateId))).slice(0,4);
    if(!rows.length){table.innerHTML='<thead><tr><th>Metric</th><th>Candidate A</th><th>Candidate B</th><th>Candidate C</th></tr></thead><tbody><tr><td>Selection</td><td colspan="3">Choose candidates from the table below.</td></tr></tbody>';return;}
    const cols=rows.map(c=>`<th>${esc(c.candidateName||'Candidate')}</th>`).join('');
    const metric=(label,key)=>`<tr><td>${label}</td>${rows.map(c=>`<td>${pct(c[key])}</td>`).join('')}</tr>`;
    table.innerHTML=`<thead><tr><th>Metric</th>${cols}</tr></thead><tbody>${metric('ATS Score','resumeAtsScore')}${metric('Interview Score','interviewScore')}<tr><td><strong>Match Score</strong></td>${rows.map(c=>`<td><strong>${composite(c)>=0?composite(c)+'%':'Pending'}</strong></td>`).join('')}</tr></tbody>`;
  }

  function addCompareChecks(){
    const tbody=document.getElementById('recruiterCandidateTableBody');if(!tbody)return;
    tbody.querySelectorAll('tr').forEach((tr)=>{
      const rowId=Number(tr.dataset.candidateId||0);
      if(!rowId || tr.querySelector('.recruiter-compare-check')) return;
      const first=tr.querySelector('td');
      if(first){const check=document.createElement('input');check.type='checkbox';check.className='recruiter-compare-check';check.value=String(rowId);check.title='Compare this candidate';check.style.marginRight='8px';first.prepend(check);}
    });
    tbody.querySelectorAll('.recruiter-compare-check').forEach(c=>c.addEventListener('change',()=>{const all=[...document.querySelectorAll('.recruiter-compare-check:checked')];if(all.length>4){c.checked=false;notify('Compare limit','Select up to 4 candidates.','info');return;}renderComparison();}));
  }

  async function loadReports(){
    const el=document.getElementById('recruiterReportsList');
    if(!el) return;
    try{
      const r=await request('/api/recruiter/interviews');
      const data=await r.json();
      const all=Array.isArray(data)?data:[];
      const interviewCounter=document.getElementById('recruiterInterviewsCounter');
      if(interviewCounter) interviewCounter.textContent=String(all.length);
      const completed=all.filter(x=>x.status==='Completed').sort((a,b)=>new Date(b.interviewDate||0)-new Date(a.interviewDate||0)).slice(0,8);
      if(!completed.length){
        el.innerHTML='<div class="recruiter-report-row"><div><div class="report-name">No completed reports yet</div><div class="report-meta">Completed interviews will appear here automatically.</div></div></div>';
        return;
      }
      el.innerHTML=completed.map(x=>`<div class="recruiter-report-row"><div><div class="report-name">${esc(x.candidateName||'Candidate')}</div><div class="report-meta">${esc(x.jobRole||'Role')} • ${esc(x.interviewType||'Interview')}</div></div><div class="report-meta">${fmt(x.interviewDate)}</div><div><span class="score-pill success">${pct(x.overallScore)}</span></div><div><span class="report-meta">${x.recordingAvailable?'Recording stored':'No recording'}</span></div><div><button class="table-btn primary recruiter-report-profile" data-id="${Number(x.candidateId)||0}" type="button">View Report</button></div></div>`).join('');
      el.querySelectorAll('.recruiter-report-profile').forEach(b=>b.addEventListener('click',()=>window.location.href='recruiter-candidate-detail.html?candidateId='+b.dataset.id));
    }catch(e){
      el.innerHTML='<div class="recruiter-report-row"><div class="report-name">Unable to load stored reports</div><div class="report-meta">'+esc(e.message)+'</div></div>';
    }
  }


  function renderAnalytics(){
    const el=document.getElementById('recruiterAnalyticsBars');
    if(!el)return;
    const avgField=(fields)=>{
      const vals=candidates.map(c=>{for(const f of fields){const n=Number(c?.[f]);if(Number.isFinite(n))return n;}return null;}).filter(Number.isFinite);
      return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    };
    const metrics=[
      ['Technical relevance',['technicalScore','technicalRelevanceScore','interviewScore']],
      ['Problem solving',['problemSolvingScore','technicalScore','interviewScore']],
      ['Communication',['communicationScore']],
      ['Confidence',['confidenceScore']]
    ].map(([label,fields])=>({label,value:avgField(fields)})).filter(m=>m.value!==null);
    if(!metrics.length){el.innerHTML='<div class="recruiter-empty">No completed interview analytics available yet.</div>';return;}
    el.innerHTML=metrics.map(m=>`<div class="bar-row"><span>${esc(m.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,Math.min(100,m.value))}%"></div></div><strong>${m.value}%</strong></div>`).join('');
  }

  async function load(){
    upsertSection();
    try{const r=await request('/api/recruiter/candidates');candidates=await r.json();if(!Array.isArray(candidates))candidates=[];renderTop();renderResumes();setTimeout(addCompareChecks,120);const tbody=document.getElementById('recruiterCandidateTableBody');if(tbody&&window.MutationObserver&&!tbody._smartHireCompareObserver){tbody._smartHireCompareObserver=new MutationObserver(()=>addCompareChecks());tbody._smartHireCompareObserver.observe(tbody,{childList:true});}renderComparison();const avg=(key)=>{const vals=candidates.map(c=>Number(c[key])).filter(Number.isFinite);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;};const avgI=avg('interviewScore'),avgA=avg('resumeAtsScore');const shortlist=candidates.filter(c=>String(c.status).toLowerCase()==='shortlisted').length;const h=Number(document.getElementById('recruiterHiringHealth')?.textContent);const health=document.getElementById('recruiterHiringHealth');if(health)health.textContent=(Math.round(((avgI||0)+ (avgA||0))/Math.max(1,(avgI&&avgA?2:1)))||0)+'% readiness';const ei=document.getElementById('recruiterAvgInterview');if(ei)ei.textContent='Avg interview '+pct(avgI);const ea=document.getElementById('recruiterAvgAts');if(ea)ea.textContent='Avg ATS '+pct(avgA);const sr=document.getElementById('recruiterShortlistRate');if(sr)sr.textContent='Shortlist '+(candidates.length?Math.round(shortlist/candidates.length*100):0)+'%';}catch(e){console.error('Enhanced recruiter load failed',e);}
    renderPipeline();renderAnalytics();loadReports();loadInterviewSchedule();
    document.getElementById('recruiterCompareSelected')?.addEventListener('click',()=>{document.getElementById('candidate-comparison')?.scrollIntoView({behavior:'smooth',block:'start'});renderComparison();});
    document.getElementById('recruiterClearCompare')?.addEventListener('click',()=>{document.querySelectorAll('.recruiter-compare-check').forEach(c=>c.checked=false);renderComparison();});
  }
  if(document.body.classList.contains('recruiter-dashboard-page')){window.addEventListener('DOMContentLoaded',load);}
})();

(function(){const api=window.smartHireApi;if(!api)return;const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));async function loadTemplates(){const body=document.getElementById('templateTableBody');if(!body)return;try{const rows=await api.requestJson('/api/recruiter/templates');body.innerHTML=rows.length?rows.map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.jobRole||'-')}</td><td>${esc(t.interviewType||'-')}</td><td>${esc(t.difficulty||'-')}</td><td>${t.questionCount||10}</td><td><button class="table-btn" data-template-delete="${t.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6">No templates yet.</td></tr>';body.querySelectorAll('[data-template-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this template?')){await api.requestJson('/api/recruiter/templates/'+b.dataset.templateDelete,{method:'DELETE'});loadTemplates();}});}catch(e){body.innerHTML='<tr><td colspan="6">Unable to load templates.</td></tr>';}}async function createTemplate(){const name=prompt('Template name:');if(!name)return;const jobRole=prompt('Job role:','Software Engineer');const interviewType=prompt('Type: Technical / Behavioral / HR / Aptitude / Mixed','Technical');const difficulty=prompt('Difficulty: Easy / Medium / Hard','Medium');const count=Number(prompt('Question count:','10')||10);try{await api.requestJson('/api/recruiter/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,jobRole,interviewType,difficulty,questionCount:count})});window.smartHireToast?.('Template created','Reusable interview template saved.','success');loadTemplates();}catch(e){window.smartHireToast?.('Template error',e.message,'error');}}document.addEventListener('DOMContentLoaded',()=>{loadTemplates();document.getElementById('createTemplateButton')?.addEventListener('click',createTemplate);});})();

(function(){const api=window.smartHireApi;if(!api)return;const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));async function loadJobs(){const table=document.querySelector('#job-management tbody');if(!table)return;try{const jobs=await api.requestJson('/api/recruiter/jobs');table.innerHTML=jobs.length?jobs.map(j=>`<tr><td>${esc(j.title)}</td><td>${esc(j.department||'-')}</td><td>0</td><td><span class="status active">${esc(j.status||'ACTIVE')}</span></td><td>Live</td><td><button class="table-btn" data-job-delete="${j.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6">No jobs created yet.</td></tr>';table.querySelectorAll('[data-job-delete]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this job?')){await api.requestJson('/api/recruiter/jobs/'+b.dataset.jobDelete,{method:'DELETE'});loadJobs();}});}catch(e){}}async function createJob(){const title=prompt('Job title:','Software Engineer');if(!title)return;const department=prompt('Department:','Engineering');const location=prompt('Location:','Remote');const description=prompt('Job description:','Build and maintain production software.');try{await api.requestJson('/api/recruiter/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,department,location,description,status:'ACTIVE'})});window.smartHireToast?.('Job created','The job posting is now stored in the recruiter workspace.','success');loadJobs();}catch(e){window.smartHireToast?.('Job error',e.message,'error');}}document.addEventListener('DOMContentLoaded',()=>{loadJobs();const b=document.getElementById('createJobButton');if(b){b.replaceWith(b.cloneNode(true));document.getElementById('createJobButton').addEventListener('click',createJob);}});})();
