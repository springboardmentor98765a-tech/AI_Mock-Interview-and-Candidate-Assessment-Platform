package com.smarthire.backend.ai.technical;

import java.util.ArrayList;
import java.util.List;

/**
 * Response for AI technical answer evaluation.
 */
public class TechnicalAnswerEvaluationResponse {

    private Long interviewId;
    private List<AnswerEvaluation> evaluations = new ArrayList<>();

    public TechnicalAnswerEvaluationResponse() {
    }

    public Long getInterviewId() {
        return interviewId;
    }

    public void setInterviewId(Long interviewId) {
        this.interviewId = interviewId;
    }

    public List<AnswerEvaluation> getEvaluations() {
        return evaluations;
    }

    public void setEvaluations(List<AnswerEvaluation> evaluations) {
        this.evaluations = evaluations;
    }

    public static class AnswerEvaluation {
        private String question;
        private String answer;
        private int technicalAccuracy;
        private int keywordCoverage;
        private int completeness;
        private int relevance;
        private String suggestedBetterAnswer;

        public AnswerEvaluation() {
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

        public int getTechnicalAccuracy() {
            return technicalAccuracy;
        }

        public void setTechnicalAccuracy(int technicalAccuracy) {
            this.technicalAccuracy = technicalAccuracy;
        }

        public int getKeywordCoverage() {
            return keywordCoverage;
        }

        public void setKeywordCoverage(int keywordCoverage) {
            this.keywordCoverage = keywordCoverage;
        }

        public int getCompleteness() {
            return completeness;
        }

        public void setCompleteness(int completeness) {
            this.completeness = completeness;
        }

        public int getRelevance() {
            return relevance;
        }

        public void setRelevance(int relevance) {
            this.relevance = relevance;
        }

        public String getSuggestedBetterAnswer() {
            return suggestedBetterAnswer;
        }

        public void setSuggestedBetterAnswer(String suggestedBetterAnswer) {
            this.suggestedBetterAnswer = suggestedBetterAnswer;
        }
    }
}