package com.smarthire.backend.interview.proctoring;

import com.smarthire.backend.interview.entity.InterviewSession;
import com.smarthire.backend.interview.entity.SessionStatus;
import com.smarthire.backend.interview.exception.InterviewSessionAccessDeniedException;
import com.smarthire.backend.interview.exception.InterviewSessionNotFoundException;
import com.smarthire.backend.interview.repository.InterviewSessionRepository;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime; import java.util.List;

@Service
public class ProctoringService {
    private final InterviewSessionRepository sessions; private final ProctoringViolationRepository violations;
    public ProctoringService(InterviewSessionRepository sessions, ProctoringViolationRepository violations){this.sessions=sessions;this.violations=violations;}
    private InterviewSession owned(Long id, Long userId){
        InterviewSession s=sessions.findById(id).orElseThrow(()->new InterviewSessionNotFoundException("Session not found with id: "+id));
        if(userId==null || !userId.equals(s.getCandidateId())) throw new InterviewSessionAccessDeniedException("You do not have access to this interview session.");
        return s;
    }
    @Transactional
    public ProctoringStatusResponse record(Long sessionId, Long userId, ProctoringViolationRequest req){
        InterviewSession s=owned(sessionId,userId);
        ProctoringStatusResponse out=status(s);
        if(s.getStatus()==SessionStatus.PROCTORING_TERMINATED || s.getStatus()==SessionStatus.COMPLETED || s.getStatus()==SessionStatus.CANCELLED) return out;
        String type=(req.getType()==null||req.getType().isBlank())?"UNKNOWN":req.getType().trim().toUpperCase();
        if(!isAllowedType(type)) return out;
        int count=(s.getViolationCount()==null?0:s.getViolationCount())+1;
        int max=(s.getMaxViolations()==null||s.getMaxViolations()<1)?3:s.getMaxViolations();
        s.setViolationCount(count); s.setMaxViolations(max);
        boolean terminate=count>=max;
        s.setMalpracticeTerminated(terminate);
        if(terminate){ s.setStatus(SessionStatus.PROCTORING_TERMINATED); s.setEndedAt(LocalDateTime.now()); s.setTerminatedAt(LocalDateTime.now()); s.setTerminatedReason("Interview terminated after "+max+" proctoring violations."); }
        s.setUpdatedAt(LocalDateTime.now()); sessions.save(s);
        ProctoringViolation v=new ProctoringViolation(); v.setSessionId(s.getId());v.setCandidateId(s.getCandidateId());v.setType(type);v.setSeverity(req.getSeverity()==null?"WARNING":req.getSeverity());v.setDetails(req.getDetails());v.setEvidenceReference(req.getEvidenceReference());v.setWarningNumber(count);v.setActionTaken(terminate?"AUTO_SUBMITTED":"WARNING_SHOWN");v.setSource(req.getSource()==null?"browser":req.getSource());v.setDetectedAt(LocalDateTime.now());v.setFinalStatus(terminate?"TERMINATED":"ACTIVE");violations.save(v);
        return status(s);
    }
    @Transactional(readOnly=true) public ProctoringStatusResponse getStatus(Long sessionId, Long userId){return status(owned(sessionId,userId));}
    public List<ProctoringViolation> list(Long sessionId, Long userId){owned(sessionId,userId);return violations.findBySessionIdOrderByDetectedAtAsc(sessionId);}
    private ProctoringStatusResponse status(InterviewSession s){ProctoringStatusResponse o=new ProctoringStatusResponse();o.setSessionId(s.getId());o.setViolationCount(s.getViolationCount()==null?0:s.getViolationCount());o.setMaxViolations(s.getMaxViolations()==null?3:s.getMaxViolations());o.setMalpracticeTerminated(s.isMalpracticeTerminated());o.setTerminatedReason(s.getTerminatedReason());o.setTerminatedAt(s.getTerminatedAt());o.setViolations(violations.findBySessionIdOrderByDetectedAtAsc(s.getId()));return o;}
    private boolean isAllowedType(String t){return switch(t){case "FULLSCREEN_EXIT","TAB_SWITCH","WINDOW_BLUR","CAMERA_OFF","MICROPHONE_OFF","NO_FACE","MULTIPLE_FACES","PROHIBITED_OBJECT","COPY_PASTE","CONTEXT_MENU","WINDOW_FOCUS"->true;default->false;};}
}
