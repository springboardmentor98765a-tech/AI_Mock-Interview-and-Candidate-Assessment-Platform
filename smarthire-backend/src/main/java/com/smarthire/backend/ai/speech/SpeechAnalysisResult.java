package com.smarthire.backend.ai.speech;

import java.util.ArrayList;
import java.util.List;

/**
 * Normalized communication-analysis result used by both live UI and final interview evaluation.
 * Pronunciation is represented as a speech-clarity/pronunciation confidence metric derived from
 * browser speech-recognition confidence (when available) plus transcript clarity heuristics.
 */
public class SpeechAnalysisResult {

    private int grammarQuality;
    private int speakingPaceWpm;
    private int fillerWordCount;
    private int averageResponseLength;
    private int communicationScore;
    private int pronunciationScore;
    private int transcriptionConfidence;
    private int speechClarityScore;
    private List<String> grammarIssues = new ArrayList<>();
    private String pronunciationFeedback;
    private String insights;

    public SpeechAnalysisResult() {
    }

    public SpeechAnalysisResult(int grammarQuality,
                                int speakingPaceWpm,
                                int fillerWordCount,
                                int averageResponseLength,
                                int communicationScore,
                                int pronunciationScore,
                                int transcriptionConfidence,
                                int speechClarityScore,
                                List<String> grammarIssues,
                                String pronunciationFeedback,
                                String insights) {
        this.grammarQuality = grammarQuality;
        this.speakingPaceWpm = speakingPaceWpm;
        this.fillerWordCount = fillerWordCount;
        this.averageResponseLength = averageResponseLength;
        this.communicationScore = communicationScore;
        this.pronunciationScore = pronunciationScore;
        this.transcriptionConfidence = transcriptionConfidence;
        this.speechClarityScore = speechClarityScore;
        this.grammarIssues = grammarIssues == null ? new ArrayList<>() : new ArrayList<>(grammarIssues);
        this.pronunciationFeedback = pronunciationFeedback;
        this.insights = insights;
    }

    public int getGrammarQuality() { return grammarQuality; }
    public void setGrammarQuality(int grammarQuality) { this.grammarQuality = grammarQuality; }
    public int getSpeakingPaceWpm() { return speakingPaceWpm; }
    public void setSpeakingPaceWpm(int speakingPaceWpm) { this.speakingPaceWpm = speakingPaceWpm; }
    public int getFillerWordCount() { return fillerWordCount; }
    public void setFillerWordCount(int fillerWordCount) { this.fillerWordCount = fillerWordCount; }
    public int getAverageResponseLength() { return averageResponseLength; }
    public void setAverageResponseLength(int averageResponseLength) { this.averageResponseLength = averageResponseLength; }
    public int getCommunicationScore() { return communicationScore; }
    public void setCommunicationScore(int communicationScore) { this.communicationScore = communicationScore; }
    public int getPronunciationScore() { return pronunciationScore; }
    public void setPronunciationScore(int pronunciationScore) { this.pronunciationScore = pronunciationScore; }
    public int getTranscriptionConfidence() { return transcriptionConfidence; }
    public void setTranscriptionConfidence(int transcriptionConfidence) { this.transcriptionConfidence = transcriptionConfidence; }
    public int getSpeechClarityScore() { return speechClarityScore; }
    public void setSpeechClarityScore(int speechClarityScore) { this.speechClarityScore = speechClarityScore; }
    public List<String> getGrammarIssues() { return grammarIssues; }
    public void setGrammarIssues(List<String> grammarIssues) { this.grammarIssues = grammarIssues == null ? new ArrayList<>() : new ArrayList<>(grammarIssues); }
    public String getPronunciationFeedback() { return pronunciationFeedback; }
    public void setPronunciationFeedback(String pronunciationFeedback) { this.pronunciationFeedback = pronunciationFeedback; }
    public String getInsights() { return insights; }
    public void setInsights(String insights) { this.insights = insights; }
}
