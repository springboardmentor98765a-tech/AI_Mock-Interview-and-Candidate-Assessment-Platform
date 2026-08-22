package com.smarthire.backend.interview.dto;

public class InterviewRequest {

    private Long userId;
    private String jobRole;
    private String interviewType;
    private String domain;
    private String experienceLevel;
    private String difficulty;
    private Long resumeId;

    public InterviewRequest() {
    }

    public InterviewRequest(Long userId, String jobRole, String interviewType, String domain, String experienceLevel, String difficulty) {
        this.userId = userId;
        this.jobRole = jobRole;
        this.interviewType = interviewType;
        this.domain = domain;
        this.experienceLevel = experienceLevel;
        this.difficulty = difficulty;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public String getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(String interviewType) {
        this.interviewType = interviewType;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public Long getResumeId() {
        return resumeId;
    }

    public void setResumeId(Long resumeId) {
        this.resumeId = resumeId;
    }
}