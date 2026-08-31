(() => {
  "use strict";
  const state = { sessionId:null, count:0, max:3, terminated:false, lastByType:{}, lastFocusViolationAt:0, noFaceSince:0, multiFaceSince:0, booted:false, monitoringDegraded:false };
  const $ = id => document.getElementById(id);
  const apiBase = () => window.smartHireApi?.baseUrl || window.API_BASE || "http://localhost:8080";
  const token = () => localStorage.getItem("authToken") || "";
  const headers = () => ({"Content-Type":"application/json", "Authorization":`Bearer ${token()}`});
  const getSessionId = () => Number(window.interviewSessionState?.sessionId || sessionStorage.getItem("smarthire.sessionId") || 0) || null;
  const setBanner = (text, danger=false) => { const el=$('shProctoringBanner'); if(el){ el.textContent=text; el.classList.toggle('danger',danger); el.hidden=false; } };
  const ensureUI = () => {
    if($('shProctoringPanel')) return;
    const panel=document.createElement('aside'); panel.id='shProctoringPanel'; panel.className='sh-proctor-panel';
    panel.innerHTML=`<div class="sh-proctor-head"><strong>Proctoring</strong><span id="shProctoringCount">0 / 3</span></div><div class="sh-proctor-status" id="shProctoringStatus">ACTIVE</div><div class="sh-proctor-details" id="shProctoringDetails">No violations detected.</div>`;
    document.body.appendChild(panel);
    const b=document.createElement('div'); b.id='shProctoringBanner'; b.className='sh-proctor-banner'; b.hidden=true; document.body.appendChild(b);
    const m=document.createElement('div'); m.id='shProctorWarningModal'; m.className='sh-proctor-modal'; m.hidden=true; m.innerHTML=`<div class="sh-proctor-modal-card" role="alertdialog" aria-modal="true"><span class="sh-proctor-kicker">EXAM PROCTORING</span><h2 id="shProctorWarningTitle">Warning</h2><p id="shProctorWarningText"></p><div class="sh-proctor-warning-meta"><strong id="shProctorWarningCount"></strong><span>Further violations may automatically submit your interview.</span></div><button id="shProctorAcknowledge" type="button">I understand</button></div>`; document.body.appendChild(m);
    document.getElementById('shProctorAcknowledge')?.addEventListener('click',()=>{m.hidden=true;});
  };
  const loadStatus = async () => {
    const id=getSessionId(); if(!id) return; state.sessionId=id;
    try { const r=await fetch(`${apiBase()}/api/interview-sessions/${id}/proctoring`,{headers:headers()}); if(!r.ok)return; const d=await r.json(); state.count=Number(d.violationCount||0); state.max=Number(d.maxViolations||3); state.terminated=!!d.malpracticeTerminated; render(d); } catch(e){}
  };
  const render = d => { const count=$('shProctoringCount'); if(count)count.textContent=`${state.count} / ${state.max}`; const st=$('shProctoringStatus'); if(st){st.textContent=state.terminated?'TERMINATED':'ACTIVE';st.classList.toggle('danger',state.terminated);} const det=$('shProctoringDetails'); if(det)det.textContent=state.terminated?(d?.terminatedReason||'Interview terminated for proctoring violations.'):(state.monitoringDegraded?'Monitoring degraded. Proctoring will not infer face violations from unavailable AI services.':(state.count?`Warning ${state.count} issued. Further violations may terminate the interview.`:'No violations detected.')); };
  const violation = async (type, details, source='browser', evidenceReference='') => {
    if(state.terminated || !state.sessionId) return;
    const now=Date.now();
    if(["TAB_SWITCH","WINDOW_BLUR","WINDOW_FOCUS","FULLSCREEN_EXIT"].includes(type)){
      if(now-state.lastFocusViolationAt < 7000) return;
      state.lastFocusViolationAt=now;
    } else {
      if(state.lastByType[type] && now-state.lastByType[type] < 5000) return;
      state.lastByType[type]=now;
    }
    try {
      const r=await fetch(`${apiBase()}/api/interview-sessions/${state.sessionId}/proctoring/violation`,{method:'POST',headers:headers(),body:JSON.stringify({type,severity:'WARNING',details,source,evidenceReference})});
      if(!r.ok) throw new Error('HTTP '+r.status); const d=await r.json(); state.count=Number(d.violationCount||0); state.max=Number(d.maxViolations||3); state.terminated=!!d.malpracticeTerminated; render(d);
      if(state.terminated){ setBanner('Interview automatically submitted after 3 proctoring violations.',true); window.__smartHireProctoring={...state,autoTerminated:true}; window.dispatchEvent(new CustomEvent('smarthire:proctoring-terminated',{detail:d})); }
      else { setBanner(`Warning ${state.count} of ${state.max}: ${details}`,true); const modal=$('shProctorWarningModal'); if(modal){ $('shProctorWarningTitle').textContent=`Warning ${state.count} of ${state.max}`; $('shProctorWarningText').textContent=details; $('shProctorWarningCount').textContent=`Violation ${state.count} recorded`; modal.hidden=false; } setTimeout(()=>{const b=$('shProctoringBanner');if(b)b.hidden=true;},6000); }
      return d;
    } catch(e) { console.error('[Proctoring]',e); }
  };
  const wireMedia = () => {
    const v=$('liveInterviewVideo'); if(!v) return;
    const attach=()=>{const s=v.srcObject; if(!s)return; s.getVideoTracks().forEach(t=>{t.addEventListener('ended',()=>violation('CAMERA_OFF','Camera stream ended. Please keep your camera on.')); t.addEventListener('mute',()=>violation('CAMERA_OFF','Camera was muted/disabled.'));}); s.getAudioTracks().forEach(t=>{t.addEventListener('ended',()=>violation('MICROPHONE_OFF','Microphone stream ended. Please keep your microphone on.')); t.addEventListener('mute',()=>violation('MICROPHONE_OFF','Microphone was muted/disabled.'));});};
    attach(); setInterval(attach,3000);
  };
  const wireBrowser = () => {
    document.addEventListener('fullscreenchange',()=>{ if(window.interviewSessionState?.active && !document.fullscreenElement) violation('FULLSCREEN_EXIT','Full-screen mode was exited. Return to Exam Mode to continue.'); });
    document.addEventListener('visibilitychange',()=>{ if(window.interviewSessionState?.active && document.hidden) violation('TAB_SWITCH','Interview tab became hidden or another tab/window was activated.'); });
    window.addEventListener('blur',()=>{ if(window.interviewSessionState?.active) violation('WINDOW_BLUR','Interview window lost focus.'); });
    document.addEventListener('copy',e=>{ if(window.interviewSessionState?.active){ e.preventDefault(); violation('COPY_PASTE','Copy action is disabled during the interview.'); }});
    document.addEventListener('cut',e=>{ if(window.interviewSessionState?.active){ e.preventDefault(); violation('COPY_PASTE','Cut action is disabled during the interview.'); }});
    document.addEventListener('paste',e=>{ if(window.interviewSessionState?.active){ e.preventDefault(); violation('COPY_PASTE','Paste action is disabled during the interview.'); }});
    document.addEventListener('contextmenu',e=>{ if(window.interviewSessionState?.active){ e.preventDefault(); violation('CONTEXT_MENU','Context menu is disabled during the interview.'); }});
  };
  const objectDetectorUrl = () => window.SMART_HIRE_OBJECT_DETECTION_URL || "http://localhost:8094";
  let objectCheckBusy = false;
  const checkProhibitedObjects = async () => {
    if(state.terminated || !state.sessionId || objectCheckBusy) return;
    const video=$('liveInterviewVideo'); if(!video || !video.videoWidth || !video.videoHeight) return;
    const canvas=document.createElement('canvas'); const max=640; const scale=Math.min(1,max/video.videoWidth); canvas.width=Math.max(1,Math.round(video.videoWidth*scale)); canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
    const ctx=canvas.getContext('2d',{alpha:false}); ctx.drawImage(video,0,0,canvas.width,canvas.height); const image=canvas.toDataURL('image/jpeg',0.65); objectCheckBusy=true;
    try{
      const r=await fetch(`${objectDetectorUrl()}/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image})});
      if(!r.ok)return; const d=await r.json();
      if(d?.available && Array.isArray(d.detections) && d.detections.length){
        const labels=d.detections.map(x=>`${x.label} (${Math.round(Number(x.confidence||0))}%)`).join(', ');
        await violation('PROHIBITED_OBJECT',`Prohibited object detected in camera frame: ${labels}`,'object-detection',labels);
      }
    }catch(_){/* detector unavailable: monitoring remains explicitly degraded, never fake a violation */}
    finally{objectCheckBusy=false;}
  };

  const monitorFace = async () => {
    const raw=localStorage.getItem('smarthire.liveSignals'); if(!raw)return; let d; try{d=JSON.parse(raw);}catch(_){return;}
    const eyeProvider = String(d?.providerMode?.eye || d?.eyeContact?.provider || '').toLowerCase();
    const emotionProvider = String(d?.providerMode?.emotion || d?.emotion?.provider || '').toLowerCase();
    const simulated = Boolean(d?.eyeContact?.simulated || d?.emotion?.simulated || d?.summary?.simulatedSamples > 0);
    const mediaPipeFaceCount = Number(d?.eyeContact?.faceCount ?? d?.eyeContact?.face_count ?? NaN);
    const cnnFaceCount = Number(d?.emotion?.faceCount ?? d?.emotion?.face_count ?? NaN);
    // Use the real MediaPipe count when available. Otherwise the real Custom CNN
    // service's OpenCV detector can enforce no-face/multiple-face violations.
    const hasMediaPipeCount = ['mediapipe','opencv-eye-tracker-fallback'].includes(eyeProvider) && Number.isFinite(mediaPipeFaceCount) && mediaPipeFaceCount >= 0;
    const hasCnnCount = emotionProvider === 'custom-cnn' && Number.isFinite(cnnFaceCount) && cnnFaceCount >= 0;
    const faceCount = hasMediaPipeCount ? mediaPipeFaceCount : hasCnnCount ? cnnFaceCount : NaN;
    state.monitoringDegraded = !d?.summary?.monitoringComplete || d?.monitoringStatus === 'DEGRADED';
    if(simulated || !Number.isFinite(faceCount) || faceCount < 0) return;
    const now=Date.now();
    if(faceCount===0){
      state.noFaceSince = state.noFaceSince || now;
      if(now-state.noFaceSince >= 5000){ await violation('NO_FACE','No face was detected by the camera for more than 5 seconds.',hasMediaPipeCount ? 'mediapipe' : 'custom-cnn','face_count=0'); state.noFaceSince=now; }
    } else { state.noFaceSince=0; }
    if(faceCount>1){
      state.multiFaceSince = state.multiFaceSince || now;
      if(now-state.multiFaceSince >= 3000){ await violation('MULTIPLE_FACES',`${faceCount} faces were detected by the interview camera for more than 3 seconds.`,hasMediaPipeCount ? 'mediapipe' : 'custom-cnn',`face_count=${faceCount}`); state.multiFaceSince=now; }
    } else { state.multiFaceSince=0; }
  };
  window.smartHireProctoring={violation, state};
  setInterval(()=>{ const id=getSessionId(); if(id) state.sessionId=id; },1000);
  window.addEventListener('DOMContentLoaded',()=>{ if(state.booted)return; state.booted=true; ensureUI(); setTimeout(loadStatus,1500); wireBrowser(); wireMedia(); setInterval(monitorFace,3000); setInterval(checkProhibitedObjects,5000); });
})();