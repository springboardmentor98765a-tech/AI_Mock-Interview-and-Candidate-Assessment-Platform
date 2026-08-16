package com.smarthire.backend.interview.dto;

public class InterviewFollowUpResponse {

    private String followUpQuestion;

    public InterviewFollowUpResponse() {
    }

    public InterviewFollowUpResponse(String followUpQuestion) {
        this.followUpQuestion = followUpQuestion;
    }

    public String getFollowUpQuestion() {
        return followUpQuestion;
    }

    public void setFollowUpQuestion(String followUpQuestion) {
        this.followUpQuestion = followUpQuestion;
    }
}