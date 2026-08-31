package com.smarthire.backend.interview.proctoring;
import java.time.LocalDateTime; import java.util.List;
public class ProctoringStatusResponse {
    private Long sessionId; private int violationCount; private int maxViolations; private boolean malpracticeTerminated; private String terminatedReason; private LocalDateTime terminatedAt; private List<ProctoringViolation> violations;
    public Long getSessionId(){return sessionId;} public void setSessionId(Long v){sessionId=v;}
    public int getViolationCount(){return violationCount;} public void setViolationCount(int v){violationCount=v;}
    public int getMaxViolations(){return maxViolations;} public void setMaxViolations(int v){maxViolations=v;}
    public boolean isMalpracticeTerminated(){return malpracticeTerminated;} public void setMalpracticeTerminated(boolean v){malpracticeTerminated=v;}
    public String getTerminatedReason(){return terminatedReason;} public void setTerminatedReason(String v){terminatedReason=v;}
    public LocalDateTime getTerminatedAt(){return terminatedAt;} public void setTerminatedAt(LocalDateTime v){terminatedAt=v;}
    public List<ProctoringViolation> getViolations(){return violations;} public void setViolations(List<ProctoringViolation> v){violations=v;}
}
