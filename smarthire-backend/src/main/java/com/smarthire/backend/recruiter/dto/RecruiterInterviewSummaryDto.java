package com.smarthire.backend.recruiter.dto;

import java.time.LocalDateTime;

public class RecruiterInterviewSummaryDto {
    private Long interviewId;
    private Long candidateId;
    private String candidateName;
    private String jobRole;
    private String interviewType;
    private LocalDateTime interviewDate;
    private String status;
    private Integer overallScore;
    private boolean recordingAvailable;

    public Long getInterviewId() { return interviewId; }
    public void setInterviewId(Long interviewId) { this.interviewId = interviewId; }
    public Long getCandidateId() { return candidateId; }
    public void setCandidateId(Long candidateId) { this.candidateId = candidateId; }
    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }
    public String getJobRole() { return jobRole; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }
    public String getInterviewType() { return interviewType; }
    public void setInterviewType(String interviewType) { this.interviewType = interviewType; }
    public LocalDateTime getInterviewDate() { return interviewDate; }
    public void setInterviewDate(LocalDateTime interviewDate) { this.interviewDate = interviewDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getOverallScore() { return overallScore; }
    public void setOverallScore(Integer overallScore) { this.overallScore = overallScore; }
    public boolean isRecordingAvailable() { return recordingAvailable; }
    public void setRecordingAvailable(boolean recordingAvailable) { this.recordingAvailable = recordingAvailable; }
}
