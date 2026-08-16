package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class InterviewSessionSnapshotRequest {

    private Long interviewId;
    private Long userId;
    private String transcript;
    private Integer durationSeconds;
    private Integer timerSecondsRemaining;
    private Boolean recordingActive;
    private Boolean recordingSupported;
    private Boolean cameraOn;
    private Boolean microphoneOn;
    private String videoRecordingName;
    private String audioRecordingName;
    private String sessionSummary;
    private String recoveryState;
    private String liveSignalsJson;
    private String speechInsightsJson;
    private List<String> answers = new ArrayList<>();
    private List<InterviewSessionStepDto> timeline = new ArrayList<>();

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Integer getTimerSecondsRemaining() {
        return timerSecondsRemaining;
    }

    public void setTimerSecondsRemaining(Integer timerSecondsRemaining) {
        this.timerSecondsRemaining = timerSecondsRemaining;
    }

    public Boolean getRecordingActive() {
        return recordingActive;
    }

    public void setRecordingActive(Boolean recordingActive) {
        this.recordingActive = recordingActive;
    }

    public Boolean getRecordingSupported() {
        return recordingSupported;
    }

    public void setRecordingSupported(Boolean recordingSupported) {
        this.recordingSupported = recordingSupported;
    }

    public Boolean getCameraOn() {
        return cameraOn;
    }

    public void setCameraOn(Boolean cameraOn) {
        this.cameraOn = cameraOn;
    }

    public Boolean getMicrophoneOn() {
        return microphoneOn;
    }

    public void setMicrophoneOn(Boolean microphoneOn) {
        this.microphoneOn = microphoneOn;
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

    public String getSessionSummary() {
        return sessionSummary;
    }

    public void setSessionSummary(String sessionSummary) {
        this.sessionSummary = sessionSummary;
    }

    public String getRecoveryState() {
        return recoveryState;
    }

    public void setRecoveryState(String recoveryState) {
        this.recoveryState = recoveryState;
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

    public List<String> getAnswers() {
        return answers;
    }

    public void setAnswers(List<String> answers) {
        this.answers = answers;
    }

    public List<InterviewSessionStepDto> getTimeline() {
        return timeline;
    }

    public void setTimeline(List<InterviewSessionStepDto> timeline) {
        this.timeline = timeline;
    }
}
