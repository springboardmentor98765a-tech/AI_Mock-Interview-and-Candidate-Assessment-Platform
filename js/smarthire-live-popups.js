(() => {
  const modal = window.smartHireModal;
  let pendingAction = null;
  const title = document.getElementById('liveConfirmTitle');
  const text = document.getElementById('liveConfirmText');
  const action = document.getElementById('liveConfirmAction');
  const openConfirm = (kind) => {
    const cfg={
      pause:{title:'Pause your interview?',text:'Your current session state will be saved. You can resume when you are ready.',button:'Pause Interview',target:'interviewPauseBtn'},
      skip:{title:'Skip this question?',text:'Your current answer will not be treated as a completed answer. You can continue to the next question.',button:'Skip Question',target:'interviewSkipBtn'},
      end:{title:'End interview now?',text:'Completed answers will be evaluated. You can open the detailed report after the evaluation finishes.',button:'End Interview',target:'interviewEndBtn'}
    }[kind];
    if(!cfg)return;
    if (title) title.textContent = cfg.title;
    if (text) text.textContent = cfg.text;
    if (action) action.textContent = cfg.button;
    pendingAction = cfg.target;
    modal?.open('liveConfirmModal');
  };
  document.addEventListener('click',(e)=>{
    const t=e.target.closest('#interviewPauseBtn,#interviewSkipBtn,#interviewEndBtn');
    if(!t || t.dataset.shConfirmed==='1') return;
    const kind=t.id==='interviewPauseBtn'?'pause':t.id==='interviewSkipBtn'?'skip':'end';
    if(!modal || typeof modal.open !== 'function'){
      if(kind==='end'){
        const ok=window.confirm('End the interview now? Completed answers will be evaluated.');
        if(!ok){ e.preventDefault(); e.stopImmediatePropagation(); }
      }
      return;
    }
    e.preventDefault();e.stopImmediatePropagation();
    openConfirm(kind);
  },true);
  action?.addEventListener('click',()=>{
    if(!pendingAction)return; const target=document.getElementById(pendingAction); if(!target)return;
    target.dataset.shConfirmed='1'; modal?.close('liveConfirmModal'); target.click(); setTimeout(()=>delete target.dataset.shConfirmed,250);
    pendingAction=null;
  });
  document.getElementById('liveHelpBtn')?.addEventListener('click',()=>modal?.open('liveHelpModal'));
  document.getElementById('liveCompleteReportBtn')?.addEventListener('click',()=>{
    const report=document.getElementById('liveReportBtn');
    if(report){ report.click(); }
    else window.location.href='interview-report.html';
  });
  // Repeat question confirmation is intentionally lightweight: it uses speech playback if available.
  document.getElementById('liveQuestionPlayBtn')?.addEventListener('click',()=>window.smartHireToast?.('AI interviewer','Question playback started.','success'));
})();

  document.getElementById('liveExitBtn')?.addEventListener('click', async (event)=>{
    const active=Boolean(typeof interviewSessionState!=='undefined' && interviewSessionState.active);
    if(!active) return;
    event.preventDefault();
    const ok=window.confirm('End the active interview before leaving?');
    if(!ok) return;
    const q=document.getElementById('interviewQuestions');
    const err=document.getElementById('liveInterviewError') || document.getElementById('interviewError');
    if(typeof endInterviewSession==='function'){
      await endInterviewSession(q,err,{toast:'✅ Interview ended before leaving.'});
      setTimeout(()=>{window.location.href='candidate.html';},250);
    }else{ window.location.href='candidate.html'; }
  });
