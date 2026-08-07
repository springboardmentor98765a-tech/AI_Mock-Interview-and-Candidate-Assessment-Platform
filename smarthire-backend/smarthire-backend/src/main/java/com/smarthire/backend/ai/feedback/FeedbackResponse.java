package com.smarthire.backend.ai.feedback;

import java.util.ArrayList;
import java.util.List;

/**
 * Response for AI feedback generation.
 */
public class FeedbackResponse {

    private Long interviewId;
    private List<String> strengths = new ArrayList<>();
    private List<String> weaknesses = new ArrayList<>();
    private List<String> improvementSuggestions = new ArrayList<>();
    private List<String> learningRecommendations = new ArrayList<>();
    private List<String> practicePlan = new ArrayList<>();

    public FeedbackResponse() {
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
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

    public List<String> getLearningRecommendations() {
        return learningRecommendations;
    }

    public void setLearningRecommendations(List<String> learningRecommendations) {
        this.learningRecommendations = learningRecommendations;
    }

    public List<String> getPracticePlan() {
        return practicePlan;
    }

    public void setPracticePlan(List<String> practicePlan) {
        this.practicePlan = practicePlan;
    }
}