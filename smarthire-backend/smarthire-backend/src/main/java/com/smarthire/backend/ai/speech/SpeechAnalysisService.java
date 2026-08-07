package com.smarthire.backend.ai.speech;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Advanced speech analysis service.
 * Calculates grammar quality, speaking pace, filler words, response length,
 * and communication score from a transcript.
 */
@Service
public class SpeechAnalysisService {

    private static final List<String> FILLER_WORDS = List.of(
            "um", "uh", "like", "you know", "basically", "actually",
            "literally", "kind of", "sort of", "hmm", "well", "so"
    );

    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[.!?]+");

    public SpeechAnalysisResult analyze(String transcript, Integer durationSeconds) {
        String text = transcript == null ? "" : transcript.trim();
        if (text.isEmpty()) {
            return new SpeechAnalysisResult(0, 0, 0, 0, 0,
                    "Empty transcript: speech analysis will update once candidate responses are captured.");
        }

        String[] words = text.split("\\s+");
        int wordCount = words.length;

        // Response length
        String[] sentences = SENTENCE_SPLIT.split(text);
        int responseCount = Math.max(1, (int) Arrays.stream(sentences)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .count());
        int averageResponseLength = Math.round((float) wordCount / responseCount);

        // Filler words
        String lower = text.toLowerCase(Locale.ROOT);
        int fillerCount = 0;
        for (String filler : FILLER_WORDS) {
            int index = 0;
            while ((index = lower.indexOf(filler, index)) >= 0) {
                // Ensure word boundary
                boolean beforeOk = index == 0 || !Character.isLetterOrDigit(lower.charAt(index - 1));
                int end = index + filler.length();
                boolean afterOk = end >= lower.length() || !Character.isLetterOrDigit(lower.charAt(end));
                if (beforeOk && afterOk) {
                    fillerCount++;
                }
                index = end;
            }
        }

        // Grammar quality
        int grammarPenalty = fillerCount * 3 + (wordCount < 40 ? 12 : 0);
        int grammarQuality = clamp(92 - grammarPenalty, 20, 99);

        // Speaking pace
        int speakingPaceWpm;
        if (durationSeconds != null && durationSeconds > 0) {
            speakingPaceWpm = Math.round((float) wordCount / (durationSeconds / 60.0f));
        } else {
            int estimatedMinutes = Math.max(1, Math.round(wordCount / 130.0f));
            speakingPaceWpm = Math.round((float) wordCount / estimatedMinutes);
        }

        // Communication score
        int paceScore = speakingPaceWpm >= 100 && speakingPaceWpm <= 160 ? 90
                : speakingPaceWpm > 0 ? Math.max(40, 100 - Math.abs(130 - speakingPaceWpm) / 2) : 0;
        int fillerScore = Math.max(0, 100 - fillerCount * 8);
        int lengthScore = averageResponseLength >= 15 ? 90
                : averageResponseLength >= 8 ? 75
                : Math.max(30, averageResponseLength * 5);
        int communicationScore = clamp(Math.round((grammarQuality * 0.4f) + (paceScore * 0.25f)
                + (fillerScore * 0.2f) + (lengthScore * 0.15f)), 0, 100);

        // Insights
        String insights;
        if (fillerCount > 10) {
            insights = "High filler-word usage detected. Slow down and use short pauses between key points.";
        } else if (speakingPaceWpm > 165) {
            insights = "Speaking pace is fast. Aim for 120-150 WPM to improve clarity.";
        } else if (averageResponseLength < 12) {
            insights = "Responses are short. Add one concrete example to each answer for better impact.";
        } else {
            insights = "Communication quality is stable with balanced pace and useful response detail.";
        }

        return new SpeechAnalysisResult(
                grammarQuality,
                speakingPaceWpm,
                fillerCount,
                averageResponseLength,
                communicationScore,
                insights
        );
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}