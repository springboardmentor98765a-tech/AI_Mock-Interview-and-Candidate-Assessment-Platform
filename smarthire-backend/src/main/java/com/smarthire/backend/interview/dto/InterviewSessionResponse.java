package com.smarthire.backend.interview.dto;

import com.smarthire.backend.interview.entity.SessionStatus;

import java.time.LocalDateTime;

public class InterviewSessionResponse {

    private Long id;
    private Long interviewId;
    private Long candidateId;
    private SessionStatus status;
    private Integer totalQuestions;
    private Integer currentQuestionIndex;
    private Integer questionsAttempted;
    private Integer questionsCompleted;
    private Integer maxDurationSeconds;
    private Long elapsedActiveSeconds;
    private Long remainingSeconds;
    private LocalDateTime startedAt;
    private LocalDateTime pausedAt;
    private LocalDateTime endedAt;
    private Long durationSeconds;
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public Long getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public Integer getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public Integer getCurrentQuestionIndex() {
        return currentQuestionIndex;
    }

    public void setCurrentQuestionIndex(Integer currentQuestionIndex) {
        this.currentQuestionIndex = currentQuestionIndex;
    }

    public Integer getQuestionsAttempted() {
        return questionsAttempted;
    }

    public void setQuestionsAttempted(Integer questionsAttempted) {
        this.questionsAttempted = questionsAttempted;
    }

    public Integer getQuestionsCompleted() {
        return questionsCompleted;
    }

    public void setQuestionsCompleted(Integer questionsCompleted) {
        this.questionsCompleted = questionsCompleted;
    }

    public Integer getMaxDurationSeconds() {
        return maxDurationSeconds;
    }

    public void setMaxDurationSeconds(Integer maxDurationSeconds) {
        this.maxDurationSeconds = maxDurationSeconds;
    }

    public Long getElapsedActiveSeconds() {
        return elapsedActiveSeconds;
    }

    public void setElapsedActiveSeconds(Long elapsedActiveSeconds) {
        this.elapsedActiveSeconds = elapsedActiveSeconds;
    }

    public Long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(Long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getPausedAt() {
        return pausedAt;
    }

    public void setPausedAt(LocalDateTime pausedAt) {
        this.pausedAt = pausedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
