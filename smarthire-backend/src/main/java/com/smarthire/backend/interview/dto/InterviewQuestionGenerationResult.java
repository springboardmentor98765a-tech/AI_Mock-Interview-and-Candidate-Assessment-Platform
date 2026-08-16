package com.smarthire.backend.interview.dto;

import java.util.List;

public class InterviewQuestionGenerationResult {

    private final List<InterviewQuestionDto> questions;
    private final boolean fallbackUsed;
    private final String sourceMessage;

    public InterviewQuestionGenerationResult(List<InterviewQuestionDto> questions, boolean fallbackUsed, String sourceMessage) {
        this.questions = questions;
        this.fallbackUsed = fallbackUsed;
        this.sourceMessage = sourceMessage;
    }

    public List<InterviewQuestionDto> getQuestions() { return questions; }
    public boolean isFallbackUsed() { return fallbackUsed; }
    public String getSourceMessage() { return sourceMessage; }
}
