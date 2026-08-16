package com.smarthire.backend.interview.dto;

import com.smarthire.backend.interview.entity.RecordingStatus;

import java.time.LocalDateTime;

public class InterviewRecordingResponse {

    private Long id;
    private Long sessionId;
    private Long interviewId;
    private boolean videoAvailable;
    private boolean audioAvailable;
    private RecordingStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public boolean isVideoAvailable() {
        return videoAvailable;
    }

    public void setVideoAvailable(boolean videoAvailable) {
        this.videoAvailable = videoAvailable;
    }

    public boolean isAudioAvailable() {
        return audioAvailable;
    }

    public void setAudioAvailable(boolean audioAvailable) {
        this.audioAvailable = audioAvailable;
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
