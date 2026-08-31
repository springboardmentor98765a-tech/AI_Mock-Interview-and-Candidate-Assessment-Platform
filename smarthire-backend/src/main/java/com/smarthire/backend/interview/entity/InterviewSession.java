package com.smarthire.backend.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Tracks the lifecycle of a single interview-taking session: state transitions
 * (CREATED -> IN_PROGRESS -> PAUSED/COMPLETED/CANCELLED), timestamps, question
 * progress and links to the recording produced during the session.
 *
 * This is intentionally a separate entity from {@link Interview}. Interview holds
 * the interview *content* (questions, evaluation, AI-generated data). InterviewSession
 * holds the *runtime state* of one attempt at taking that interview, so a candidate
 * could in principle retry without losing the original Interview record.
 */
@Entity
@Table(name = "interview_sessions")
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SessionStatus status;

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "current_question_index", nullable = false)
    private Integer currentQuestionIndex;

    @Column(name = "questions_attempted", nullable = false)
    private Integer questionsAttempted;

    @Column(name = "questions_completed", nullable = false)
    private Integer questionsCompleted;

    /** Configured maximum session duration, used to compute remaining time. */
    @Column(name = "max_duration_seconds")
    private Integer maxDurationSeconds;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Set while the session is currently PAUSED; null otherwise. */
    @Column(name = "paused_at")
    private LocalDateTime pausedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    /** Cumulative seconds spent paused across all pause/resume cycles. */
    @Column(name = "total_paused_seconds", nullable = false)
    private Long totalPausedSeconds;

    /** Final active (non-paused) duration, populated when the session ends. */
    @Column(name = "duration_seconds")
    private Long durationSeconds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "violation_count", nullable = false)
    private Integer violationCount = 0;

    @Column(name = "max_violations", nullable = false)
    private Integer maxViolations = 3;

    @Column(name = "malpractice_terminated", nullable = false)
    private boolean malpracticeTerminated = false;

    @Column(name = "terminated_reason", columnDefinition = "TEXT")
    private String terminatedReason;

    @Column(name = "terminated_at")
    private LocalDateTime terminatedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public InterviewSession() {
    }

    public InterviewSession(Long interviewId, Long candidateId, Integer totalQuestions, Integer maxDurationSeconds) {
        this.interviewId = interviewId;
        this.candidateId = candidateId;
        this.totalQuestions = totalQuestions;
        this.maxDurationSeconds = maxDurationSeconds;
        this.status = SessionStatus.CREATED;
        this.currentQuestionIndex = 0;
        this.questionsAttempted = 0;
        this.questionsCompleted = 0;
        this.totalPausedSeconds = 0L;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) {
            this.status = SessionStatus.CREATED;
        }
        if (this.currentQuestionIndex == null) {
            this.currentQuestionIndex = 0;
        }
        if (this.questionsAttempted == null) {
            this.questionsAttempted = 0;
        }
        if (this.questionsCompleted == null) {
            this.questionsCompleted = 0;
        }
        if (this.totalPausedSeconds == null) {
            this.totalPausedSeconds = 0L;
        }
        if (this.violationCount == null) this.violationCount = 0;
        if (this.maxViolations == null) this.maxViolations = 3;
    }

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

    public Long getTotalPausedSeconds() {
        return totalPausedSeconds;
    }

    public void setTotalPausedSeconds(Long totalPausedSeconds) {
        this.totalPausedSeconds = totalPausedSeconds;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    public Integer getViolationCount() { return violationCount; }
    public void setViolationCount(Integer violationCount) { this.violationCount = violationCount; }
    public Integer getMaxViolations() { return maxViolations; }
    public void setMaxViolations(Integer maxViolations) { this.maxViolations = maxViolations; }
    public boolean isMalpracticeTerminated() { return malpracticeTerminated; }
    public void setMalpracticeTerminated(boolean malpracticeTerminated) { this.malpracticeTerminated = malpracticeTerminated; }
    public String getTerminatedReason() { return terminatedReason; }
    public void setTerminatedReason(String terminatedReason) { this.terminatedReason = terminatedReason; }
    public LocalDateTime getTerminatedAt() { return terminatedAt; }
    public void setTerminatedAt(LocalDateTime terminatedAt) { this.terminatedAt = terminatedAt; }

}
