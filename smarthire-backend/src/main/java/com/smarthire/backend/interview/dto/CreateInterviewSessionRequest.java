package com.smarthire.backend.interview.dto;

public class CreateInterviewSessionRequest {

    private Long interviewId;
    private Integer totalQuestions;
    /** Optional. Defaults to 1200 (20 minutes) to match the existing interview timer. */
    private Integer maxDurationSeconds;

    public CreateInterviewSessionRequest() {
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Integer getMaxDurationSeconds() {
        return maxDurationSeconds;
    }

    public void setMaxDurationSeconds(Integer maxDurationSeconds) {
        this.maxDurationSeconds = maxDurationSeconds;
    }
}
