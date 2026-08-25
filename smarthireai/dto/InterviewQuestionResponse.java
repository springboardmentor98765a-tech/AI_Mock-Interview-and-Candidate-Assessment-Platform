package com.smarthireai.dto;

import java.util.List;

public class InterviewQuestionResponse {

    private String type;
    private String difficulty;
    private String domain;
    private List<String> questions;

    public InterviewQuestionResponse() {
    }

    public InterviewQuestionResponse(
            String type,
            String difficulty,
            String domain,
            List<String> questions) {

        this.type = type;
        this.difficulty = difficulty;
        this.domain = domain;
        this.questions = questions;
    }

    public String getType() {
        return type;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public String getDomain() {
        return domain;
    }

    public List<String> getQuestions() {
        return questions;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public void setQuestions(List<String> questions) {
        this.questions = questions;
    }
}