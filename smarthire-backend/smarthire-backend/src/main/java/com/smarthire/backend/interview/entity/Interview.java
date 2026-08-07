package com.smarthire.backend.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "interviews")
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "interview_type", nullable = false)
    private String interviewType;

    @Column(name = "job_role")
    private String jobRole;

    @Column(nullable = false)
    private String domain;

    @Column(nullable = false)
    private String difficulty;

    @Column(name = "experience_level", nullable = false)
    private String experienceLevel;

    @Column(name = "session_summary", columnDefinition = "TEXT")
    private String sessionSummary;

    @Column(name = "transcript_text", columnDefinition = "TEXT")
    private String transcriptText;

    @Column(name = "session_timeline", columnDefinition = "TEXT")
    private String sessionTimeline;

    @Column(name = "recovery_state", columnDefinition = "TEXT")
    private String recoveryState;

    @Column(name = "video_recording_name")
    private String videoRecordingName;

    @Column(name = "audio_recording_name")
    private String audioRecordingName;

    @Column(name = "recording_supported")
    private Boolean recordingSupported;

    @Column(name = "recording_active")
    private Boolean recordingActive;

    @Column(name = "recording_duration_seconds")
    private Integer recordingDurationSeconds;

    @Column(name = "timer_seconds_remaining")
    private Integer timerSecondsRemaining;

    @Column(name = "transcript_updated_at")
    private LocalDateTime transcriptUpdatedAt;

    @Column(name = "live_signals_json", columnDefinition = "TEXT")
    private String liveSignalsJson;

    @Column(name = "speech_insights_json", columnDefinition = "TEXT")
    private String speechInsightsJson;

    @Column(name = "career_roadmap_json", columnDefinition = "TEXT")
    private String careerRoadmapJson;

    @Column(name = "assessment_results_json", columnDefinition = "TEXT")
    private String assessmentResultsJson;

    @Column(name = "notification_center_json", columnDefinition = "TEXT")
    private String notificationCenterJson;

    @Column(name = "profile_completion_json", columnDefinition = "TEXT")
    private String profileCompletionJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Interview() {
    }

    public Interview(Long userId, String interviewType, String domain, String difficulty, String experienceLevel, String jobRole) {
        this.userId = userId;
        this.interviewType = interviewType;
        this.domain = domain;
        this.difficulty = difficulty;
        this.experienceLevel = experienceLevel;
        this.jobRole = jobRole;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getInterviewType() {
        return interviewType;
    }

    public void setInterviewType(String interviewType) {
        this.interviewType = interviewType;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getSessionSummary() {
        return sessionSummary;
    }

    public void setSessionSummary(String sessionSummary) {
        this.sessionSummary = sessionSummary;
    }

    public String getTranscriptText() {
        return transcriptText;
    }

    public void setTranscriptText(String transcriptText) {
        this.transcriptText = transcriptText;
    }

    public String getSessionTimeline() {
        return sessionTimeline;
    }

    public void setSessionTimeline(String sessionTimeline) {
        this.sessionTimeline = sessionTimeline;
    }

    public String getRecoveryState() {
        return recoveryState;
    }

    public void setRecoveryState(String recoveryState) {
        this.recoveryState = recoveryState;
    }

    public String getVideoRecordingName() {
        return videoRecordingName;
    }

    public void setVideoRecordingName(String videoRecordingName) {
        this.videoRecordingName = videoRecordingName;
    }

    public String getAudioRecordingName() {
        return audioRecordingName;
    }

    public void setAudioRecordingName(String audioRecordingName) {
        this.audioRecordingName = audioRecordingName;
    }

    public Boolean getRecordingSupported() {
        return recordingSupported;
    }

    public void setRecordingSupported(Boolean recordingSupported) {
        this.recordingSupported = recordingSupported;
    }

    public Boolean getRecordingActive() {
        return recordingActive;
    }

    public void setRecordingActive(Boolean recordingActive) {
        this.recordingActive = recordingActive;
    }

    public Integer getRecordingDurationSeconds() {
        return recordingDurationSeconds;
    }

    public void setRecordingDurationSeconds(Integer recordingDurationSeconds) {
        this.recordingDurationSeconds = recordingDurationSeconds;
    }

    public Integer getTimerSecondsRemaining() {
        return timerSecondsRemaining;
    }

    public void setTimerSecondsRemaining(Integer timerSecondsRemaining) {
        this.timerSecondsRemaining = timerSecondsRemaining;
    }

    public LocalDateTime getTranscriptUpdatedAt() {
        return transcriptUpdatedAt;
    }

    public void setTranscriptUpdatedAt(LocalDateTime transcriptUpdatedAt) {
        this.transcriptUpdatedAt = transcriptUpdatedAt;
    }

    public String getLiveSignalsJson() {
        return liveSignalsJson;
    }

    public void setLiveSignalsJson(String liveSignalsJson) {
        this.liveSignalsJson = liveSignalsJson;
    }

    public String getSpeechInsightsJson() {
        return speechInsightsJson;
    }

    public void setSpeechInsightsJson(String speechInsightsJson) {
        this.speechInsightsJson = speechInsightsJson;
    }

    public String getCareerRoadmapJson() {
        return careerRoadmapJson;
    }

    public void setCareerRoadmapJson(String careerRoadmapJson) {
        this.careerRoadmapJson = careerRoadmapJson;
    }

    public String getAssessmentResultsJson() {
        return assessmentResultsJson;
    }

    public void setAssessmentResultsJson(String assessmentResultsJson) {
        this.assessmentResultsJson = assessmentResultsJson;
    }

    public String getNotificationCenterJson() {
        return notificationCenterJson;
    }

    public void setNotificationCenterJson(String notificationCenterJson) {
        this.notificationCenterJson = notificationCenterJson;
    }

    public String getProfileCompletionJson() {
        return profileCompletionJson;
    }

    public void setProfileCompletionJson(String profileCompletionJson) {
        this.profileCompletionJson = profileCompletionJson;
    }
}