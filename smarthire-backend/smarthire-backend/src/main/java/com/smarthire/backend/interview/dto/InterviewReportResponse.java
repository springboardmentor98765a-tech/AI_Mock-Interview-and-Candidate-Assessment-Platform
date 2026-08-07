package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class InterviewReportResponse {

    private Long interviewId;
    private Long userId;
    private String jobRole;
    private String interviewType;
    private String domain;
    private String difficulty;
    private String experienceLevel;
    private String transcript;
    private String sessionSummary;
    private InterviewHistoryDetailResponse.EvaluationSummary evaluation;
    private List<InterviewHistoryDetailResponse.AnswerItem> answers = new ArrayList<>();
    private List<InterviewSessionStepDto> timeline = new ArrayList<>();
    private RecordingMetadata recording = new RecordingMetadata();
    private EmailPreview emailPreview = new EmailPreview();
    private String liveSignalsJson;
    private String speechInsightsJson;

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

    public String getTranscript() {
        return transcript;
    }

    public void setTranscript(String transcript) {
        this.transcript = transcript;
    }

    public String getSessionSummary() {
        return sessionSummary;
    }

    public void setSessionSummary(String sessionSummary) {
        this.sessionSummary = sessionSummary;
    }

    public InterviewHistoryDetailResponse.EvaluationSummary getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(InterviewHistoryDetailResponse.EvaluationSummary evaluation) {
        this.evaluation = evaluation;
    }

    public List<InterviewHistoryDetailResponse.AnswerItem> getAnswers() {
        return answers;
    }

    public void setAnswers(List<InterviewHistoryDetailResponse.AnswerItem> answers) {
        this.answers = answers;
    }

    public List<InterviewSessionStepDto> getTimeline() {
        return timeline;
    }

    public void setTimeline(List<InterviewSessionStepDto> timeline) {
        this.timeline = timeline;
    }

    public RecordingMetadata getRecording() {
        return recording;
    }

    public void setRecording(RecordingMetadata recording) {
        this.recording = recording;
    }

    public EmailPreview getEmailPreview() {
        return emailPreview;
    }

    public void setEmailPreview(EmailPreview emailPreview) {
        this.emailPreview = emailPreview;
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

    public static class RecordingMetadata {
        private String videoRecordingName;
        private String audioRecordingName;
        private Boolean recordingActive;
        private Boolean recordingSupported;
        private Integer durationSeconds;
        private Integer timerSecondsRemaining;

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
    }

    public static class EmailPreview {
        private String recipient;
        private String subject;
        private String body;
        private List<String> attachments = new ArrayList<>();

        public String getRecipient() {
            return recipient;
        }

        public void setRecipient(String recipient) {
            this.recipient = recipient;
        }

        public String getSubject() {
            return subject;
        }

        public void setSubject(String subject) {
            this.subject = subject;
        }

        public String getBody() {
            return body;
        }

        public void setBody(String body) {
            this.body = body;
        }

        public List<String> getAttachments() {
            return attachments;
        }

        public void setAttachments(List<String> attachments) {
            this.attachments = attachments;
        }
    }
}
