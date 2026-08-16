package com.smarthire.backend.interview.dto;

import java.util.List;

public class InterviewResponse {

    private Long interviewId;
    private String status;
    private String message;
    private List<InterviewQuestionDto> questions;

    public InterviewResponse() {
    }

    public InterviewResponse(Long interviewId, String status, String message, List<InterviewQuestionDto> questions) {
        this.interviewId = interviewId;
        this.status = status;
        this.message = message;
        this.questions = questions;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<InterviewQuestionDto> getQuestions() {
        return questions;
    }

    public void setQuestions(List<InterviewQuestionDto> questions) {
        this.questions = questions;
    }
}