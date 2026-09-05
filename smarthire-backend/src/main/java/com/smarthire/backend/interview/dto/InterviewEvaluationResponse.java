package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class InterviewEvaluationResponse {

    private int overallScore;
    private int communicationScore;
    private int confidenceScore;
    private int technicalScore;
    private int professionalismScore;
    private int professionalCommunicationScore;
    private int grammarScore;
    private int speechClarityScore;
    private int speakingPaceScore;
    private int fillerWordScore;
    private int responseCompletenessScore;
    private int pronunciationScore;
    private int transcriptionConfidence;
    private int grammarIssueCount;
    private int eyeContactPercentage;
    private int facialEngagementScore;
    private int responseHesitationScore;
    private int speakingConfidenceScore;
    private int attentionScore;
    private int keywordMatchingScore;
    private int domainRelevanceScore;
    private int technicalAccuracyScore;
    private int problemSolvingScore;
    private int answerCompletenessScore;
    private int timeManagementScore;
    private int answerOrganizationScore;
    private int interviewEtiquetteScore;
    private List<String> strengths = new ArrayList<>();
    private List<String> weaknesses = new ArrayList<>();
    private List<String> improvementSuggestions = new ArrayList<>();
    private List<String> practiceRecommendations = new ArrayList<>();
    private List<String> learningResources = new ArrayList<>();
    private List<String> feedback = new ArrayList<>();
    private String recommendation;
    private int objectiveTotalQuestions;
    private int objectiveAnsweredQuestions;
    private int objectiveCorrectAnswers;
    private int objectiveAttemptedAccuracy;
    private String rating;
    private int proctoringViolationCount;
    private boolean malpracticeTerminated;
    private String malpracticeReason;
    private String proctoringViolationsJson;

    public InterviewEvaluationResponse() {
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

    public int getProfessionalCommunicationScore() { return professionalCommunicationScore; }
    public void setProfessionalCommunicationScore(int score) { this.professionalCommunicationScore = score; }

    public void setProfessionalismScore(int professionalismScore) {
        this.professionalismScore = professionalismScore;
    }

    public int getGrammarScore() {
        return grammarScore;
    }

    public void setGrammarScore(int grammarScore) {
        this.grammarScore = grammarScore;
    }

    public int getSpeechClarityScore() {
        return speechClarityScore;
    }

    public void setSpeechClarityScore(int speechClarityScore) {
        this.speechClarityScore = speechClarityScore;
    }

    public int getSpeakingPaceScore() {
        return speakingPaceScore;
    }

    public void setSpeakingPaceScore(int speakingPaceScore) {
        this.speakingPaceScore = speakingPaceScore;
    }

    public int getFillerWordScore() {
        return fillerWordScore;
    }

    public void setFillerWordScore(int fillerWordScore) {
        this.fillerWordScore = fillerWordScore;
    }

    public int getResponseCompletenessScore() {
        return responseCompletenessScore;
    }

    public void setResponseCompletenessScore(int responseCompletenessScore) {
        this.responseCompletenessScore = responseCompletenessScore;
    }

    public int getPronunciationScore() { return pronunciationScore; }
    public void setPronunciationScore(int pronunciationScore) { this.pronunciationScore = pronunciationScore; }
    public int getTranscriptionConfidence() { return transcriptionConfidence; }
    public void setTranscriptionConfidence(int transcriptionConfidence) { this.transcriptionConfidence = transcriptionConfidence; }
    public int getGrammarIssueCount() { return grammarIssueCount; }
    public void setGrammarIssueCount(int grammarIssueCount) { this.grammarIssueCount = grammarIssueCount; }

    public int getEyeContactPercentage() {
        return eyeContactPercentage;
    }

    public void setEyeContactPercentage(int eyeContactPercentage) {
        this.eyeContactPercentage = eyeContactPercentage;
    }

    public int getFacialEngagementScore() {
        return facialEngagementScore;
    }

    public void setFacialEngagementScore(int facialEngagementScore) {
        this.facialEngagementScore = facialEngagementScore;
    }

    public int getResponseHesitationScore() {
        return responseHesitationScore;
    }

    public int getSpeakingConfidenceScore() { return speakingConfidenceScore; }
    public void setSpeakingConfidenceScore(int speakingConfidenceScore) { this.speakingConfidenceScore = speakingConfidenceScore; }
    public int getAttentionScore() { return attentionScore; }
    public void setAttentionScore(int attentionScore) { this.attentionScore = attentionScore; }

    public void setResponseHesitationScore(int responseHesitationScore) {
        this.responseHesitationScore = responseHesitationScore;
    }

    public int getKeywordMatchingScore() {
        return keywordMatchingScore;
    }

    public void setKeywordMatchingScore(int keywordMatchingScore) {
        this.keywordMatchingScore = keywordMatchingScore;
    }

    public int getDomainRelevanceScore() {
        return domainRelevanceScore;
    }

    public void setDomainRelevanceScore(int domainRelevanceScore) {
        this.domainRelevanceScore = domainRelevanceScore;
    }

    public int getTechnicalAccuracyScore() {
        return technicalAccuracyScore;
    }

    public void setTechnicalAccuracyScore(int technicalAccuracyScore) {
        this.technicalAccuracyScore = technicalAccuracyScore;
    }

    public int getAnswerCompletenessScore() {
        return answerCompletenessScore;
    }

    public void setAnswerCompletenessScore(int answerCompletenessScore) {
        this.answerCompletenessScore = answerCompletenessScore;
    }

    public int getTimeManagementScore() {
        return timeManagementScore;
    }

    public void setTimeManagementScore(int timeManagementScore) {
        this.timeManagementScore = timeManagementScore;
    }

    public int getAnswerOrganizationScore() {
        return answerOrganizationScore;
    }

    public void setAnswerOrganizationScore(int answerOrganizationScore) {
        this.answerOrganizationScore = answerOrganizationScore;
    }

    public int getInterviewEtiquetteScore() {
        return interviewEtiquetteScore;
    }

    public void setInterviewEtiquetteScore(int interviewEtiquetteScore) {
        this.interviewEtiquetteScore = interviewEtiquetteScore;
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

    public List<String> getFeedback() {
        return feedback;
    }

    public void setFeedback(List<String> feedback) {
        this.feedback = feedback;
    }

    public int getObjectiveTotalQuestions() {
        return objectiveTotalQuestions;
    }

    public void setObjectiveTotalQuestions(int objectiveTotalQuestions) {
        this.objectiveTotalQuestions = objectiveTotalQuestions;
    }

    public int getObjectiveAnsweredQuestions() {
        return objectiveAnsweredQuestions;
    }

    public void setObjectiveAnsweredQuestions(int objectiveAnsweredQuestions) {
        this.objectiveAnsweredQuestions = objectiveAnsweredQuestions;
    }

    public int getObjectiveCorrectAnswers() {
        return objectiveCorrectAnswers;
    }

    public void setObjectiveCorrectAnswers(int objectiveCorrectAnswers) {
        this.objectiveCorrectAnswers = objectiveCorrectAnswers;
    }

    public int getObjectiveAttemptedAccuracy() {
        return objectiveAttemptedAccuracy;
    }

    public void setObjectiveAttemptedAccuracy(int objectiveAttemptedAccuracy) {
        this.objectiveAttemptedAccuracy = objectiveAttemptedAccuracy;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;
    }
    public int getProctoringViolationCount(){return proctoringViolationCount;} public void setProctoringViolationCount(int v){proctoringViolationCount=v;}
    public boolean getMalpracticeTerminated(){return malpracticeTerminated;} public void setMalpracticeTerminated(boolean v){malpracticeTerminated=v;}
    public String getMalpracticeReason(){return malpracticeReason;} public void setMalpracticeReason(String v){malpracticeReason=v;}
    public String getProctoringViolationsJson(){return proctoringViolationsJson;} public void setProctoringViolationsJson(String v){proctoringViolationsJson=v;}

}