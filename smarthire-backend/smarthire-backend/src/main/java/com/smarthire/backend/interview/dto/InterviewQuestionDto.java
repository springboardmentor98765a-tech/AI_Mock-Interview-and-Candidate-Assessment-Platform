package com.smarthire.backend.interview.dto;

public class InterviewQuestionDto {

    private String question;
    private String category;
    private String difficulty;

    public InterviewQuestionDto() {
    }

    public InterviewQuestionDto(String question, String category, String difficulty) {
        this.question = question;
        this.category = category;
        this.difficulty = difficulty;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }
}