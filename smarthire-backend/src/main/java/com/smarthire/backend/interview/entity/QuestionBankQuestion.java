package com.smarthire.backend.interview.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "question_bank", indexes = {
        @Index(name = "idx_qb_role_type_diff", columnList = "job_role,interview_type,difficulty"),
        @Index(name = "idx_qb_type_diff", columnList = "interview_type,difficulty")
})
public class QuestionBankQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_role", nullable = false, length = 120)
    private String jobRole;

    @Column(name = "interview_type", nullable = false, length = 60)
    private String interviewType;

    @Column(name = "domain", length = 120)
    private String domain;

    @Column(name = "experience_level", length = 60)
    private String experienceLevel;

    @Column(nullable = false, length = 40)
    private String difficulty;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, columnDefinition = "text")
    private String question;

    @Column(name = "options_json", columnDefinition = "text")
    private String optionsJson;

    @Column(name = "answer_mode", length = 20)
    private String answerMode = "TEXT";

    @Column(name = "correct_answer", columnDefinition = "text")
    private String correctAnswer;

    @Column(nullable = false)
    private boolean active = true;

    public QuestionBankQuestion() {
    }

    public QuestionBankQuestion(String jobRole, String interviewType, String domain, String experienceLevel,
                                String difficulty, String category, String question) {
        this.jobRole = jobRole;
        this.interviewType = interviewType;
        this.domain = domain;
        this.experienceLevel = experienceLevel;
        this.difficulty = difficulty;
        this.category = category;
        this.question = question;
        this.answerMode = "TEXT";
        this.active = true;
    }

    public QuestionBankQuestion(String jobRole, String interviewType, String domain, String experienceLevel,
                                String difficulty, String category, String question, String optionsJson,
                                String answerMode, String correctAnswer) {
        this(jobRole, interviewType, domain, experienceLevel, difficulty, category, question);
        this.optionsJson = optionsJson;
        this.answerMode = (answerMode == null || answerMode.isBlank()) ? "TEXT" : answerMode;
        this.correctAnswer = correctAnswer;
    }

    public Long getId() { return id; }
    public String getJobRole() { return jobRole; }
    public String getInterviewType() { return interviewType; }
    public String getDomain() { return domain; }
    public String getExperienceLevel() { return experienceLevel; }
    public String getDifficulty() { return difficulty; }
    public String getCategory() { return category; }
    public String getQuestion() { return question; }
    public boolean isActive() { return active; }
    public String getOptionsJson() { return optionsJson; }
    public String getAnswerMode() { return answerMode; }
    public String getCorrectAnswer() { return correctAnswer; }

    public void setId(Long id) { this.id = id; }
    public void setJobRole(String jobRole) { this.jobRole = jobRole; }
    public void setInterviewType(String interviewType) { this.interviewType = interviewType; }
    public void setDomain(String domain) { this.domain = domain; }
    public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public void setCategory(String category) { this.category = category; }
    public void setQuestion(String question) { this.question = question; }
    public void setActive(boolean active) { this.active = active; }
    public void setOptionsJson(String optionsJson) { this.optionsJson = optionsJson; }
    public void setAnswerMode(String answerMode) { this.answerMode = answerMode; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }
}
