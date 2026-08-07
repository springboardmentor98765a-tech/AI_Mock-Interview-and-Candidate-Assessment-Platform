package com.smarthire.backend.ai.speech;

/**
 * Result of advanced speech analysis.
 */
public class SpeechAnalysisResult {

    private int grammarQuality;
    private int speakingPaceWpm;
    private int fillerWordCount;
    private int averageResponseLength;
    private int communicationScore;
    private String insights;

    public SpeechAnalysisResult() {
    }

    public SpeechAnalysisResult(int grammarQuality,
                                int speakingPaceWpm,
                                int fillerWordCount,
                                int averageResponseLength,
                                int communicationScore,
                                String insights) {
        this.grammarQuality = grammarQuality;
        this.speakingPaceWpm = speakingPaceWpm;
        this.fillerWordCount = fillerWordCount;
        this.averageResponseLength = averageResponseLength;
        this.communicationScore = communicationScore;
        this.insights = insights;
    }

    public int getGrammarQuality() {
        return grammarQuality;
    }

    public void setGrammarQuality(int grammarQuality) {
        this.grammarQuality = grammarQuality;
    }

    public int getSpeakingPaceWpm() {
        return speakingPaceWpm;
    }

    public void setSpeakingPaceWpm(int speakingPaceWpm) {
        this.speakingPaceWpm = speakingPaceWpm;
    }

    public int getFillerWordCount() {
        return fillerWordCount;
    }

    public void setFillerWordCount(int fillerWordCount) {
        this.fillerWordCount = fillerWordCount;
    }

    public int getAverageResponseLength() {
        return averageResponseLength;
    }

    public void setAverageResponseLength(int averageResponseLength) {
        this.averageResponseLength = averageResponseLength;
    }

    public int getCommunicationScore() {
        return communicationScore;
    }

    public void setCommunicationScore(int communicationScore) {
        this.communicationScore = communicationScore;
    }

    public String getInsights() {
        return insights;
    }

    public void setInsights(String insights) {
        this.insights = insights;
    }
}