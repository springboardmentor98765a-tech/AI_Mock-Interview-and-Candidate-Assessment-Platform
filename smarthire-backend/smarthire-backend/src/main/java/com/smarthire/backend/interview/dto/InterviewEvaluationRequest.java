package com.smarthire.backend.interview.dto;

import java.util.List;

public class InterviewEvaluationRequest {

    private Long interviewId;
    private String jobRole;
    private String interviewType;
    private String difficulty;
    private List<String> questions;
    private List<String> answers;
    private String transcript;
    private Integer durationSeconds;
    private Boolean cameraAvailable;
    private Boolean microphoneAvailable;
    private Boolean cameraActive;
    private Boolean microphoneActive;
    private Integer eyeContactPercentage;
    private Integer facialEngagementScore;
    private Integer responseHesitationScore;
    private String sessionSummary;
    private String videoRecordingName;
    private String audioRecordingName;
    private Boolean recordingSupported;
    private Boolean recordingActive;
    private Integer recordingDurationSeconds;
    private Integer timerSecondsRemaining;
    private List<InterviewSessionStepDto> sessionTimeline;
    private String liveSignalsJson;
    private String speechInsightsJson;

    public InterviewEvaluationRequest() {
    }

    public InterviewEvaluationRequest(Long interviewId,
                                      String jobRole,
                                      String interviewType,
                                      String difficulty,
                                      List<String> questions,
                                      List<String> answers) {
        this.interviewId = interviewId;
        this.jobRole = jobRole;
        this.interviewType = interviewType;
        this.difficulty = difficulty;
        this.questions = questions;
        this.answers = answers;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
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

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public List<String> getQuestions() {
        return questions;
    }

    public void setQuestions(List<String> questions) {
        this.questions = questions;
    }

    public List<String> getAnswers() {
        return answers;
    }

    public void setAnswers(List<String> answers) {
        this.answers = answers;
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

    public Boolean getCameraAvailable() {
        return cameraAvailable;
    }

    public void setCameraAvailable(Boolean cameraAvailable) {
        this.cameraAvailable = cameraAvailable;
    }

    public Boolean getMicrophoneAvailable() {
        return microphoneAvailable;
    }

    public void setMicrophoneAvailable(Boolean microphoneAvailable) {
        this.microphoneAvailable = microphoneAvailable;
    }

    public Boolean getCameraActive() {
        return cameraActive;
    }

    public void setCameraActive(Boolean cameraActive) {
        this.cameraActive = cameraActive;
    }

    public Boolean getMicrophoneActive() {
        return microphoneActive;
    }

    public void setMicrophoneActive(Boolean microphoneActive) {
        this.microphoneActive = microphoneActive;
    }

    public Integer getEyeContactPercentage() {
        return eyeContactPercentage;
    }

    public void setEyeContactPercentage(Integer eyeContactPercentage) {
        this.eyeContactPercentage = eyeContactPercentage;
    }

    public Integer getFacialEngagementScore() {
        return facialEngagementScore;
    }

    public void setFacialEngagementScore(Integer facialEngagementScore) {
        this.facialEngagementScore = facialEngagementScore;
    }

    public Integer getResponseHesitationScore() {
        return responseHesitationScore;
    }

    public void setResponseHesitationScore(Integer responseHesitationScore) {
        this.responseHesitationScore = responseHesitationScore;
    }

    public String getSessionSummary() {
        return sessionSummary;
    }

    public void setSessionSummary(String sessionSummary) {
        this.sessionSummary = sessionSummary;
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

    public List<InterviewSessionStepDto> getSessionTimeline() {
        return sessionTimeline;
    }

    public void setSessionTimeline(List<InterviewSessionStepDto> sessionTimeline) {
        this.sessionTimeline = sessionTimeline;
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
}