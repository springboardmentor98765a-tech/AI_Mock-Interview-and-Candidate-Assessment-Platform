package com.smarthire.backend.interview.proctoring;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="proctoring_violations", indexes={
    @Index(name="idx_proctor_session", columnList="session_id"),
    @Index(name="idx_proctor_candidate", columnList="candidate_id"),
    @Index(name="idx_proctor_time", columnList="detected_at")
})
public class ProctoringViolation {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="session_id", nullable=false) private Long sessionId;
    @Column(name="candidate_id", nullable=false) private Long candidateId;
    @Column(name="type", nullable=false, length=64) private String type;
    @Column(name="severity", nullable=false, length=20) private String severity;
    @Column(name="details", columnDefinition="TEXT") private String details;
    @Column(name="evidence_reference", columnDefinition="TEXT") private String evidenceReference;
    @Column(name="warning_number", nullable=false) private int warningNumber;
    @Column(name="action_taken", nullable=false, length=64) private String actionTaken;
    @Column(name="source", nullable=false, length=32) private String source;
    @Column(name="detected_at", nullable=false) private LocalDateTime detectedAt;
    @Column(name="resolved", nullable=false) private boolean resolved=false;
    @Column(name="final_status", length=32) private String finalStatus;
    @PrePersist void onCreate(){ if(detectedAt==null) detectedAt=LocalDateTime.now(); }
    public Long getId(){return id;} public void setId(Long id){this.id=id;}
    public Long getSessionId(){return sessionId;} public void setSessionId(Long v){sessionId=v;}
    public Long getCandidateId(){return candidateId;} public void setCandidateId(Long v){candidateId=v;}
    public String getType(){return type;} public void setType(String v){type=v;}
    public String getSeverity(){return severity;} public void setSeverity(String v){severity=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public String getEvidenceReference(){return evidenceReference;} public void setEvidenceReference(String v){evidenceReference=v;}
    public int getWarningNumber(){return warningNumber;} public void setWarningNumber(int v){warningNumber=v;}
    public String getActionTaken(){return actionTaken;} public void setActionTaken(String v){actionTaken=v;}
    public String getSource(){return source;} public void setSource(String v){source=v;}
    public LocalDateTime getDetectedAt(){return detectedAt;} public void setDetectedAt(LocalDateTime v){detectedAt=v;}
    public boolean isResolved(){return resolved;} public void setResolved(boolean v){resolved=v;}
    public String getFinalStatus(){return finalStatus;} public void setFinalStatus(String v){finalStatus=v;}
}
