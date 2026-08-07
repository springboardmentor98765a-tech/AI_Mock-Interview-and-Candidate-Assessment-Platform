package com.smarthire.backend.interview.dto;

public class InterviewFollowUpRequest {

    private String jobRole;
    private String question;
    private String candidateAnswer;

    public InterviewFollowUpRequest() {
    }

    public InterviewFollowUpRequest(String jobRole, String question, String candidateAnswer) {
        this.jobRole = jobRole;
        this.question = question;
        this.candidateAnswer = candidateAnswer;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getCandidateAnswer() {
        return candidateAnswer;
    }

    public void setCandidateAnswer(String candidateAnswer) {
        this.candidateAnswer = candidateAnswer;
    }
}