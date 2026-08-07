package com.smarthire.backend.ai.feedback;

import java.util.List;

/**
 * Request for AI feedback generation.
 */
public class FeedbackRequest {

    private Long interviewId;
    private String jobRole;
    private String domain;
    private int overallScore;
    private int communicationScore;
    private int technicalScore;
    private int confidenceScore;
    private int professionalismScore;
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> improvementSuggestions;
    private List<String> practiceRecommendations;
    private List<String> learningResources;

    public FeedbackRequest() {
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
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public int getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(int overallScore) {
        this.overallScore = overallScore;
    }

    public int getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(int communicationScore) {
        this.communicationScore = communicationScore;
    }

    public int getTechnicalScore() {
        return technicalScore;
    }

    public void setTechnicalScore(int technicalScore) {
        this.technicalScore = technicalScore;
    }

    public int getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(int confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public int getProfessionalismScore() {
        return professionalismScore;
    }

    public void setProfessionalismScore(int professionalismScore) {
        this.professionalismScore = professionalismScore;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(List<String> weaknesses) {
        this.weaknesses = weaknesses;
    }

    public List<String> getImprovementSuggestions() {
        return improvementSuggestions;
    }

    public void setImprovementSuggestions(List<String> improvementSuggestions) {
        this.improvementSuggestions = improvementSuggestions;
    }

    public List<String> getPracticeRecommendations() {
        return practiceRecommendations;
    }

    public void setPracticeRecommendations(List<String> practiceRecommendations) {
        this.practiceRecommendations = practiceRecommendations;
    }

    public List<String> getLearningResources() {
        return learningResources;
    }

    public void setLearningResources(List<String> learningResources) {
        this.learningResources = learningResources;
    }
}