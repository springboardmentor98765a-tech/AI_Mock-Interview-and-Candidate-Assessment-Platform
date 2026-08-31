package com.smarthire.backend.interview.proctoring;
public class ProctoringViolationRequest {
    private String type; private String severity="WARNING"; private String details; private String evidenceReference; private String source="browser";
    public String getType(){return type;} public void setType(String v){type=v;}
    public String getSeverity(){return severity;} public void setSeverity(String v){severity=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public String getEvidenceReference(){return evidenceReference;} public void setEvidenceReference(String v){evidenceReference=v;}
    public String getSource(){return source;} public void setSource(String v){source=v;}
}
