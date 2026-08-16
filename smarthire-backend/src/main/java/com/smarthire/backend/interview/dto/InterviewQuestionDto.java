package com.smarthire.backend.interview.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class InterviewQuestionDto {

    private String question;
    private String category;
    private String difficulty;
    private java.util.List<String> options = new java.util.ArrayList<>();
    private String answerMode = "TEXT";
    private String correctAnswer = "";

    public InterviewQuestionDto() {
    }

    public InterviewQuestionDto(String question, String category, String difficulty) {
        this.question = question;
        this.category = category;
        this.difficulty = difficulty;
    }

    public InterviewQuestionDto(String question, String category, String difficulty, java.util.List<String> options, String answerMode) {
        this.question = question;
        this.category = category;
        this.difficulty = difficulty;
        if (options != null) this.options = new java.util.ArrayList<>(options);
        this.answerMode = (answerMode == null || answerMode.isBlank()) ? "TEXT" : answerMode;
    }

    public InterviewQuestionDto(String question, String category, String difficulty, java.util.List<String> options, String answerMode, String correctAnswer) {
        this(question, category, difficulty, options, answerMode);
        this.correctAnswer = correctAnswer == null ? "" : correctAnswer.trim();
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

    public java.util.List<String> getOptions() { return options; }
    public void setOptions(java.util.List<String> options) { this.options = options == null ? new java.util.ArrayList<>() : new java.util.ArrayList<>(options); }
    @JsonIgnore
    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
    public String getAnswerMode() { return answerMode; }
    public void setAnswerMode(String answerMode) { this.answerMode = (answerMode == null || answerMode.isBlank()) ? "TEXT" : answerMode; }
}