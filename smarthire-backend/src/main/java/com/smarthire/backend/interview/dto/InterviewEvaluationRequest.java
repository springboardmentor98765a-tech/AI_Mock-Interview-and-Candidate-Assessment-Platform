package com.smarthire.backend.interview.dto;

import java.util.List;

public class InterviewEvaluationRequest {

    private Long sessionId;
    private Long interviewId;
    private String jobRole;
    private String domain;
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
    private Integer speakingConfidenceScore;
    private String sessionSummary;
    private String videoRecordingName;
    private String audioRecordingName;
    private Boolean recordingSupported;
    private Boolean recordingActive;
    private Integer recordingDurationSeconds;
    private Integer timerSecondsRemaining;
    private List<InterviewSessionStepDto> sessionTimeline;
    private Integer pronunciationScore;
    private Integer headStabilityScore;
    private Integer attentionScore;
    private Integer engagementScore;
    private Integer emotionConfidenceScore;
    private String detectedEmotion;
    private String gazeDirection;
    private Boolean monitoringComplete;
    private Integer monitoringSampleCount;
    private Integer transcriptionConfidence;
    private Integer grammarIssueCount;
    private String grammarIssueSummary;
    private String liveSignalsJson;
    private String speechInsightsJson;
    private Integer monitoringSamples;
    private Integer realEmotionSamples;
    private Integer realEyeTrackingSamples;
    private String monitoringProviderSummary;
    private Integer proctoringViolationCount;
    private Boolean malpracticeTerminated;
    private String malpracticeReason;
    private String proctoringViolationsJson;

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

    public String getDomain() {
        if (domain != null && !domain.isBlank()) {
            return domain;
        }
        return jobRole;
    }

    public void setDomain(String domain) {
        this.domain = domain;
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

    public Integer getSpeakingConfidenceScore() { return speakingConfidenceScore; }
    public void setSpeakingConfidenceScore(Integer speakingConfidenceScore) { this.speakingConfidenceScore = speakingConfidenceScore; }

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

    public Integer getPronunciationScore() { return pronunciationScore; }
    public void setPronunciationScore(Integer pronunciationScore) { this.pronunciationScore = pronunciationScore; }
    public Integer getTranscriptionConfidence() { return transcriptionConfidence; }
    public void setTranscriptionConfidence(Integer transcriptionConfidence) { this.transcriptionConfidence = transcriptionConfidence; }
    public Integer getGrammarIssueCount() { return grammarIssueCount; }
    public void setGrammarIssueCount(Integer grammarIssueCount) { this.grammarIssueCount = grammarIssueCount; }
    public String getGrammarIssueSummary() { return grammarIssueSummary; }
    public void setGrammarIssueSummary(String grammarIssueSummary) { this.grammarIssueSummary = grammarIssueSummary; }

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
    public Integer getMonitoringSamples() { return monitoringSamples; }
    public void setMonitoringSamples(Integer monitoringSamples) { this.monitoringSamples = monitoringSamples; }
    public Integer getRealEmotionSamples() { return realEmotionSamples; }
    public void setRealEmotionSamples(Integer realEmotionSamples) { this.realEmotionSamples = realEmotionSamples; }
    public Integer getRealEyeTrackingSamples() { return realEyeTrackingSamples; }
    public void setRealEyeTrackingSamples(Integer realEyeTrackingSamples) { this.realEyeTrackingSamples = realEyeTrackingSamples; }
    public String getMonitoringProviderSummary() { return monitoringProviderSummary; }
    public void setMonitoringProviderSummary(String monitoringProviderSummary) { this.monitoringProviderSummary = monitoringProviderSummary; }

    public Integer getProctoringViolationCount(){return proctoringViolationCount;} public void setProctoringViolationCount(Integer v){proctoringViolationCount=v;}
    public Boolean getMalpracticeTerminated(){return malpracticeTerminated;} public void setMalpracticeTerminated(Boolean v){malpracticeTerminated=v;}
    public String getMalpracticeReason(){return malpracticeReason;} public void setMalpracticeReason(String v){malpracticeReason=v;}
    public String getProctoringViolationsJson(){return proctoringViolationsJson;} public void setProctoringViolationsJson(String v){proctoringViolationsJson=v;}

    public Long getSessionId(){return sessionId;} public void setSessionId(Long v){sessionId=v;}

    public Integer getHeadStabilityScore() { return headStabilityScore; }
    public void setHeadStabilityScore(Integer value) { this.headStabilityScore = value; }
    public Integer getAttentionScore() { return attentionScore; }
    public void setAttentionScore(Integer value) { this.attentionScore = value; }
    public Integer getEngagementScore() { return engagementScore; }
    public void setEngagementScore(Integer value) { this.engagementScore = value; }
    public Integer getEmotionConfidenceScore() { return emotionConfidenceScore; }
    public void setEmotionConfidenceScore(Integer value) { this.emotionConfidenceScore = value; }
    public String getDetectedEmotion() { return detectedEmotion; }
    public void setDetectedEmotion(String value) { this.detectedEmotion = value; }
    public String getGazeDirection() { return gazeDirection; }
    public void setGazeDirection(String value) { this.gazeDirection = value; }
    public Boolean getMonitoringComplete() { return monitoringComplete; }
    public void setMonitoringComplete(Boolean value) { this.monitoringComplete = value; }
    public Integer getMonitoringSampleCount() { return monitoringSampleCount; }
    public void setMonitoringSampleCount(Integer value) { this.monitoringSampleCount = value; }

}
