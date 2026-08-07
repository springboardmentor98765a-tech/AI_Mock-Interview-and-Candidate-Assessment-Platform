package com.smarthire.backend.interview.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class InterviewHistoryDetailResponse {

    private Long interviewId;
    private LocalDateTime interviewDate;
    private String jobRole;
    private EvaluationSummary evaluation;
    private List<AnswerItem> answers = new ArrayList<>();
    private List<String> feedback = new ArrayList<>();

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public LocalDateTime getInterviewDate() {
        return interviewDate;
    }

    public void setInterviewDate(LocalDateTime interviewDate) {
        this.interviewDate = interviewDate;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public EvaluationSummary getEvaluation() {
        return evaluation;
    }

    public void setEvaluation(EvaluationSummary evaluation) {
        this.evaluation = evaluation;
    }

    public List<AnswerItem> getAnswers() {
        return answers;
    }

    public void setAnswers(List<AnswerItem> answers) {
        this.answers = answers;
    }

    public List<String> getFeedback() {
        return feedback;
    }

    public void setFeedback(List<String> feedback) {
        this.feedback = feedback;
    }

    public static class AnswerItem {

        private String question;
        private String answer;
        private String category;
        private String difficulty;

        public AnswerItem() {
        }

        public AnswerItem(String question, String answer, String category, String difficulty) {
            this.question = question;
            this.answer = answer;
            this.category = category;
            this.difficulty = difficulty;
        }

        public String getQuestion() {
            return question;
        }

        public void setQuestion(String question) {
            this.question = question;
        }

        public String getAnswer() {
            return answer;
        }

        public void setAnswer(String answer) {
            this.answer = answer;
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

    public static class EvaluationSummary {

        private int overallScore;
        private int technicalScore;
        private int communicationScore;
        private int confidenceScore;
        private int problemSolvingScore;
        private int professionalismScore;
        private String rating;
        private String recommendation;
        private LocalDateTime evaluationDate;

        public EvaluationSummary() {
        }

        public EvaluationSummary(int overallScore,
                                 int technicalScore,
                                 int communicationScore,
                                 int confidenceScore,
                                 int problemSolvingScore,
                                 int professionalismScore,
                                 String rating,
                                 String recommendation,
                                 LocalDateTime evaluationDate) {
            this.overallScore = overallScore;
            this.technicalScore = technicalScore;
            this.communicationScore = communicationScore;
            this.confidenceScore = confidenceScore;
            this.problemSolvingScore = problemSolvingScore;
            this.professionalismScore = professionalismScore;
            this.rating = rating;
            this.recommendation = recommendation;
            this.evaluationDate = evaluationDate;
        }

        public int getOverallScore() {
            return overallScore;
        }

        public void setOverallScore(int overallScore) {
            this.overallScore = overallScore;
        }

        public int getTechnicalScore() {
            return technicalScore;
        }

        public void setTechnicalScore(int technicalScore) {
            this.technicalScore = technicalScore;
        }

        public int getCommunicationScore() {
            return communicationScore;
        }

        public void setCommunicationScore(int communicationScore) {
            this.communicationScore = communicationScore;
        }

        public int getConfidenceScore() {
            return confidenceScore;
        }

        public void setConfidenceScore(int confidenceScore) {
            this.confidenceScore = confidenceScore;
        }

        public int getProblemSolvingScore() {
            return problemSolvingScore;
        }

        public void setProblemSolvingScore(int problemSolvingScore) {
            this.problemSolvingScore = problemSolvingScore;
        }

        public int getProfessionalismScore() {
            return professionalismScore;
        }

        public void setProfessionalismScore(int professionalismScore) {
            this.professionalismScore = professionalismScore;
        }

        public String getRating() {
            return rating;
        }

        public void setRating(String rating) {
            this.rating = rating;
        }

        public String getRecommendation() {
            return recommendation;
        }

        public void setRecommendation(String recommendation) {
            this.recommendation = recommendation;
        }

        public LocalDateTime getEvaluationDate() {
            return evaluationDate;
        }

        public void setEvaluationDate(LocalDateTime evaluationDate) {
            this.evaluationDate = evaluationDate;
        }
    }
}
