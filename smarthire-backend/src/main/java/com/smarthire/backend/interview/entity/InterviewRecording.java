package com.smarthire.backend.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Metadata for a candidate's interview recording. The actual bytes live in whatever
 * {@code RecordingStorageService} implementation is active (local disk in dev,
 * S3/Azure Blob in production) - this table only stores the reference/key, never a
 * publicly-resolvable URL, so access always goes through the authorized
 * download endpoint.
 */
@Entity
@Table(name = "interview_recordings")
public class InterviewRecording {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interview_id", nullable = false)
    private Long interviewId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;

    /** Opaque storage key/path resolved by the active RecordingStorageService. */
    @Column(name = "video_storage_key")
    private String videoStorageKey;

    @Column(name = "audio_storage_key")
    private String audioStorageKey;

    @Column(name = "video_content_type")
    private String videoContentType;

    @Column(name = "audio_content_type")
    private String audioContentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RecordingStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public InterviewRecording() {
    }

    public InterviewRecording(Long interviewId, Long sessionId, Long candidateId) {
        this.interviewId = interviewId;
        this.sessionId = sessionId;
        this.candidateId = candidateId;
        this.status = RecordingStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) {
            this.status = RecordingStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Long getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }

    public String getVideoStorageKey() {
        return videoStorageKey;
    }

    public void setVideoStorageKey(String videoStorageKey) {
        this.videoStorageKey = videoStorageKey;
    }

    public String getAudioStorageKey() {
        return audioStorageKey;
    }

    public void setAudioStorageKey(String audioStorageKey) {
        this.audioStorageKey = audioStorageKey;
    }

    public String getVideoContentType() {
        return videoContentType;
    }

    public void setVideoContentType(String videoContentType) {
        this.videoContentType = videoContentType;
    }

    public String getAudioContentType() {
        return audioContentType;
    }

    public void setAudioContentType(String audioContentType) {
        this.audioContentType = audioContentType;
    }

    public RecordingStatus getStatus() {
        return status;
    }

    public void setStatus(RecordingStatus status) {
        this.status = status;
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
}
