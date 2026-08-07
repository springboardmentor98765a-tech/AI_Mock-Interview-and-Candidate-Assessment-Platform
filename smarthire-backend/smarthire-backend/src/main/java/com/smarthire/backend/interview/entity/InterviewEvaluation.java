package com.smarthire.backend.interview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_evaluations")
public class InterviewEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "interview_id", nullable = false, unique = true)
    private Long interviewId;

    @Column(name = "overall_score", nullable = false)
    private int overallScore;

    @Column(name = "communication_score")
    private Integer communicationScore;

    @Column(name = "confidence_score")
    private Integer confidenceScore;

    @Column(name = "technical_score", nullable = false)
    private int technicalScore;

    @Column(name = "professionalism_score")
    private Integer professionalismScore;

    @Column(name = "grammar_score")
    private Integer grammarScore;

    @Column(name = "speech_clarity_score")
    private Integer speechClarityScore;

    @Column(name = "speaking_pace_score")
    private Integer speakingPaceScore;

    @Column(name = "filler_word_score")
    private Integer fillerWordScore;

    @Column(name = "response_completeness_score")
    private Integer responseCompletenessScore;

    @Column(name = "eye_contact_percentage")
    private Integer eyeContactPercentage;

    @Column(name = "facial_engagement_score")
    private Integer facialEngagementScore;

    @Column(name = "response_hesitation_score")
    private Integer responseHesitationScore;

    @Column(name = "keyword_matching_score")
    private Integer keywordMatchingScore;

    @Column(name = "domain_relevance_score")
    private Integer domainRelevanceScore;

    @Column(name = "technical_accuracy_score")
    private Integer technicalAccuracyScore;

    @Column(name = "problem_solving_score", nullable = false)
    private int problemSolvingScore;

    @Column(name = "answer_completeness_score")
    private Integer answerCompletenessScore;

    @Column(name = "time_management_score")
    private Integer timeManagementScore;

    @Column(name = "answer_organization_score")
    private Integer answerOrganizationScore;

    @Column(name = "interview_etiquette_score")
    private Integer interviewEtiquetteScore;

    @Column(name = "rating")
    private String rating;

    @Column(name = "strengths", columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "weaknesses", columnDefinition = "TEXT")
    private String weaknesses;

    @Column(name = "improvement_suggestions", columnDefinition = "TEXT")
    private String improvementSuggestions;

    @Column(name = "practice_recommendations", columnDefinition = "TEXT")
    private String practiceRecommendations;

    @Column(name = "learning_resources", columnDefinition = "TEXT")
    private String learningResources;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String recommendation;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "evaluation_date", nullable = false, updatable = false)
    private LocalDateTime evaluationDate;

    public InterviewEvaluation() {
    }

    @PrePersist
    protected void onCreate() {
        this.evaluationDate = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
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

    public Integer getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(Integer communicationScore) {
        this.communicationScore = communicationScore;
    }

    public Integer getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(Integer confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public Integer getProfessionalismScore() {
        return professionalismScore;
    }

    public void setProfessionalismScore(Integer professionalismScore) {
        this.professionalismScore = professionalismScore;
    }

    public Integer getGrammarScore() {
        return grammarScore;
    }

    public void setGrammarScore(Integer grammarScore) {
        this.grammarScore = grammarScore;
    }

    public Integer getSpeechClarityScore() {
        return speechClarityScore;
    }

    public void setSpeechClarityScore(Integer speechClarityScore) {
        this.speechClarityScore = speechClarityScore;
    }

    public Integer getSpeakingPaceScore() {
        return speakingPaceScore;
    }

    public void setSpeakingPaceScore(Integer speakingPaceScore) {
        this.speakingPaceScore = speakingPaceScore;
    }

    public Integer getFillerWordScore() {
        return fillerWordScore;
    }

    public void setFillerWordScore(Integer fillerWordScore) {
        this.fillerWordScore = fillerWordScore;
    }

    public Integer getResponseCompletenessScore() {
        return responseCompletenessScore;
    }

    public void setResponseCompletenessScore(Integer responseCompletenessScore) {
        this.responseCompletenessScore = responseCompletenessScore;
    }

    public Integer getEyeContactPercentage() {
        return eyeContactPercentage;
    }

    public void setEyeContactPercentage(Integer eyeContactPercentage) {
        this.eyeContactPercentage = eyeContactPercentage;
    }

    public Integer getFacialEngagementScore() {
        return facialEngagementScore;
    }

    public void setFacialEngagementScore(Integer facialEngagementScore) {
        this.facialEngagementScore = facialEngagementScore;
    }

    public Integer getResponseHesitationScore() {
        return responseHesitationScore;
    }

    public void setResponseHesitationScore(Integer responseHesitationScore) {
        this.responseHesitationScore = responseHesitationScore;
    }

    public Integer getKeywordMatchingScore() {
        return keywordMatchingScore;
    }

    public void setKeywordMatchingScore(Integer keywordMatchingScore) {
        this.keywordMatchingScore = keywordMatchingScore;
    }

    public Integer getDomainRelevanceScore() {
        return domainRelevanceScore;
    }

    public void setDomainRelevanceScore(Integer domainRelevanceScore) {
        this.domainRelevanceScore = domainRelevanceScore;
    }

    public Integer getTechnicalAccuracyScore() {
        return technicalAccuracyScore;
    }

    public void setTechnicalAccuracyScore(Integer technicalAccuracyScore) {
        this.technicalAccuracyScore = technicalAccuracyScore;
    }

    public int getProblemSolvingScore() {
        return problemSolvingScore;
    }

    public void setProblemSolvingScore(int problemSolvingScore) {
        this.problemSolvingScore = problemSolvingScore;
    }

    public Integer getAnswerCompletenessScore() {
        return answerCompletenessScore;
    }

    public void setAnswerCompletenessScore(Integer answerCompletenessScore) {
        this.answerCompletenessScore = answerCompletenessScore;
    }

    public Integer getTimeManagementScore() {
        return timeManagementScore;
    }

    public void setTimeManagementScore(Integer timeManagementScore) {
        this.timeManagementScore = timeManagementScore;
    }

    public Integer getAnswerOrganizationScore() {
        return answerOrganizationScore;
    }

    public void setAnswerOrganizationScore(Integer answerOrganizationScore) {
        this.answerOrganizationScore = answerOrganizationScore;
    }

    public Integer getInterviewEtiquetteScore() {
        return interviewEtiquetteScore;
    }

    public void setInterviewEtiquetteScore(Integer interviewEtiquetteScore) {
        this.interviewEtiquetteScore = interviewEtiquetteScore;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;
    }

    public String getStrengths() {
        return strengths;
    }

    public void setStrengths(String strengths) {
        this.strengths = strengths;
    }

    public String getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(String weaknesses) {
        this.weaknesses = weaknesses;
    }

    public String getImprovementSuggestions() {
        return improvementSuggestions;
    }

    public void setImprovementSuggestions(String improvementSuggestions) {
        this.improvementSuggestions = improvementSuggestions;
    }

    public String getPracticeRecommendations() {
        return practiceRecommendations;
    }

    public void setPracticeRecommendations(String practiceRecommendations) {
        this.practiceRecommendations = practiceRecommendations;
    }

    public String getLearningResources() {
        return learningResources;
    }

    public void setLearningResources(String learningResources) {
        this.learningResources = learningResources;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public LocalDateTime getEvaluationDate() {
        return evaluationDate;
    }

    public void setEvaluationDate(LocalDateTime evaluationDate) {
        this.evaluationDate = evaluationDate;
    }
}