package com.smarthire.backend.interview.dto;

import java.time.LocalDateTime;

public class InterviewHistorySummaryResponse {

    private Long interviewId;
    private LocalDateTime interviewDate;
    private String jobRole;
    private Integer overallScore;
    private String recommendation;

    public InterviewHistorySummaryResponse() {
    }

    public InterviewHistorySummaryResponse(Long interviewId,
                                           LocalDateTime interviewDate,
                                           String jobRole,
                                           Integer overallScore,
                                           String recommendation) {
        this.interviewId = interviewId;
        this.interviewDate = interviewDate;
        this.jobRole = jobRole;
        this.overallScore = overallScore;
        this.recommendation = recommendation;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public LocalDateTime getInterviewDate() {
        return interviewDate;
    }

    public void setInterviewDate(LocalDateTime interviewDate) {
        this.interviewDate = interviewDate;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public Integer getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(Integer overallScore) {
        this.overallScore = overallScore;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }
}
