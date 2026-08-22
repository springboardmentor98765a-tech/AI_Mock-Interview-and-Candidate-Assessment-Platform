package com.smarthire.backend.ai.speech;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SpeechAnalysisServiceTest {

    private final SpeechAnalysisService service = new SpeechAnalysisService();

    @Test
    void detectsFillerWordsAndPace() {
        SpeechAnalysisResult result = service.analyze(
                "Um, I actually built a React dashboard and I, like, improved the API performance.",
                30,
                88
        );
        assertTrue(result.getFillerWordCount() >= 2);
        assertTrue(result.getSpeakingPaceWpm() > 0);
        assertTrue(result.getCommunicationScore() > 0);
    }

    @Test
    void detectsGrammarIssues() {
        SpeechAnalysisResult result = service.analyze("hello  world . this is is a test", 10, 80);
        assertFalse(result.getGrammarIssues().isEmpty());
        assertTrue(result.getGrammarQuality() < 100);
    }

    @Test
    void pronunciationUsesRecognitionConfidence() {
        SpeechAnalysisResult high = service.analyze("I design scalable web applications.", 10, 96);
        SpeechAnalysisResult low = service.analyze("I design scalable web applications.", 10, 45);
        assertTrue(high.getPronunciationScore() > low.getPronunciationScore());
        assertEquals(96, high.getTranscriptionConfidence());
    }

    @Test
    void usesRealGrammarRulesForClearAndIncorrectEnglish() {
        SpeechAnalysisResult clean = service.analyze(
                "I built a React application and improved its performance.", 20, 95
        );
        SpeechAnalysisResult incorrect = service.analyze(
                "This are a test. She go to the office yesterday.", 20, 95
        );
        assertTrue(clean.getGrammarQuality() >= incorrect.getGrammarQuality());
        assertFalse(incorrect.getGrammarIssues().isEmpty());
    }
    @Test
    void supportsMultipleServiceInstancesWithoutLanguageInitializationFailure() {
        SpeechAnalysisService first = new SpeechAnalysisService();
        SpeechAnalysisService second = new SpeechAnalysisService();
        assertNotNull(first.analyze("I built a React application and improved its performance.", 20, 95));
        assertNotNull(second.analyze("This are a test. She go to the office yesterday.", 20, 95));
    }

}
