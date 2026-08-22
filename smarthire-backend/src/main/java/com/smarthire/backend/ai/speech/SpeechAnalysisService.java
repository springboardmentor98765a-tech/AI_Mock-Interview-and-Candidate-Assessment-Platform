package com.smarthire.backend.ai.speech;

import org.languagetool.JLanguageTool;
import org.languagetool.Languages;
import org.languagetool.rules.RuleMatch;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Communication analysis service.
 *
 * Grammar quality is backed by LanguageTool's English grammar/spelling rules,
 * with a small deterministic fallback for resilience. Pronunciation/clarity
 * uses speech-recognition confidence from the recorded audio transcription
 * plus transcript-level clarity indicators. This makes pronunciation scoring
 * audio-backed rather than purely text-based, while still being explicit that
 * it is a pronunciation/clarity proxy rather than a phoneme-level accent test.
 */
@Service
public class SpeechAnalysisService {

    private static final List<String> FILLER_WORDS = List.of(
            "um", "uh", "like", "you know", "basically", "actually",
            "literally", "kind of", "sort of", "hmm", "well", "so"
    );
    private static final Pattern SENTENCE_SPLIT = Pattern.compile("[.!?]+");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s{2,}");
    private static final Pattern SPACE_BEFORE_PUNCT = Pattern.compile("\\s+[,.!?;:]");
    private static final Pattern LOWERCASE_SENTENCE_START = Pattern.compile("(?m)(?:^|[.!?]\\s+)([a-z])");
    private static final Pattern REPEATED_WORD = Pattern.compile("\\b([A-Za-z]+)\\s+\\1\\b", Pattern.CASE_INSENSITIVE);

    /**
     * LanguageTool is expensive and its language module must not be initialized
     * more than once in the same JVM. A single shared instance also prevents
     * Spring context + direct unit-test construction from racing or creating
     * duplicate AmericanEnglish instances. Access is synchronized in
     * runGrammarCheck because JLanguageTool is stateful.
     */
    private static final JLanguageTool LANGUAGE_TOOL = createLanguageTool();

    public SpeechAnalysisService() {
        // Stateless service; shared LanguageTool instance is initialized once per JVM.
    }

    private static JLanguageTool createLanguageTool() {
        try {
            return new JLanguageTool(Languages.getLanguageForShortCode("en-US"));
        } catch (Exception ex) {
            return null;
        }
    }

    public SpeechAnalysisResult analyze(String transcript, Integer durationSeconds) {
        return analyze(transcript, durationSeconds, null);
    }

    public SpeechAnalysisResult analyze(String transcript, Integer durationSeconds, Integer transcriptionConfidence) {
        String text = transcript == null ? "" : transcript.trim();
        if (text.isEmpty()) {
            return new SpeechAnalysisResult(0, 0, 0, 0, 0, 0, 0, 0,
                    List.of("No transcript captured yet."),
                    "Pronunciation confidence will appear after speech is captured.",
                    "Empty transcript: speech analysis will update once candidate responses are captured.");
        }

        String[] words = text.split("\\s+");
        int wordCount = words.length;
        String[] sentences = SENTENCE_SPLIT.split(text);
        int responseCount = Math.max(1, (int) Arrays.stream(sentences)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .count());
        int averageResponseLength = Math.round((float) wordCount / responseCount);

        String lower = text.toLowerCase(Locale.ROOT);
        int fillerCount = countFillers(lower);

        GrammarAnalysis grammar = runGrammarCheck(text, fillerCount, wordCount);
        int grammarQuality = grammar.score;

        int speakingPaceWpm;
        if (durationSeconds != null && durationSeconds > 0) {
            speakingPaceWpm = Math.round((float) wordCount / (durationSeconds / 60.0f));
        } else {
            int estimatedMinutes = Math.max(1, Math.round(wordCount / 130.0f));
            speakingPaceWpm = Math.round((float) wordCount / estimatedMinutes);
        }

        int paceScore = speakingPaceWpm >= 100 && speakingPaceWpm <= 160 ? 92
                : speakingPaceWpm > 0 ? Math.max(40, 100 - Math.abs(130 - speakingPaceWpm) / 2) : 0;
        int fillerScore = Math.max(0, 100 - fillerCount * 8);
        int clarityScore = clamp(94 - fillerCount * 3 - grammar.issueCount * 2 - repeatedWordPenalty(text), 35, 100);

        int confidence = clamp(transcriptionConfidence == null ? 72 : transcriptionConfidence, 0, 100);
        int pronunciationScore = clamp(Math.round(confidence * 0.75f + clarityScore * 0.25f), 0, 100);
        String pronunciationFeedback = pronunciationScore >= 85
                ? "Audio transcription confidence is strong and speech clarity is good."
                : pronunciationScore >= 70
                    ? "Pronunciation clarity is acceptable; slow down slightly on difficult words and articulate endings clearly."
                    : "Pronunciation clarity needs improvement; speak more slowly and articulate key words distinctly.";

        int responseCompletenessScore = averageResponseLength >= 15 ? 92
                : averageResponseLength >= 8 ? 76
                : Math.max(30, averageResponseLength * 5);

        int communicationScore = clamp(Math.round((grammarQuality * 0.30f)
                + (paceScore * 0.20f)
                + (fillerScore * 0.15f)
                + (clarityScore * 0.15f)
                + (pronunciationScore * 0.10f)
                + (responseCompletenessScore * 0.10f)), 0, 100);

        String insights;
        if (grammar.issueCount > 0) {
            insights = "Grammar analysis found " + grammar.issueCount
                    + " issue(s). Review the suggestions before your next interview.";
        } else if (fillerCount > 10) {
            insights = "High filler-word usage detected. Slow down and use short pauses between key points.";
        } else if (speakingPaceWpm > 165) {
            insights = "Speaking pace is fast. Aim for 120-150 WPM to improve clarity.";
        } else if (averageResponseLength < 12) {
            insights = "Responses are short. Add one concrete example or result to each answer.";
        } else {
            insights = "Communication quality is stable with balanced pace, grammar, clarity, and response detail.";
        }

        return new SpeechAnalysisResult(
                grammarQuality,
                speakingPaceWpm,
                fillerCount,
                averageResponseLength,
                communicationScore,
                pronunciationScore,
                confidence,
                clarityScore,
                grammar.issues,
                pronunciationFeedback,
                insights
        );
    }

    private GrammarAnalysis runGrammarCheck(String text, int fillerCount, int wordCount) {
        List<String> issues = new ArrayList<>();
        int externalMatches = 0;

        if (LANGUAGE_TOOL != null) {
            try {
                synchronized (LANGUAGE_TOOL) {
                    List<RuleMatch> matches = LANGUAGE_TOOL.check(text);
                    externalMatches = matches.size();
                    for (RuleMatch match : matches) {
                        String message = match.getMessage();
                        if (message != null && !message.isBlank()) {
                            String suggestion = match.getSuggestedReplacements().stream().findFirst().orElse(null);
                            String item = suggestion == null || suggestion.isBlank()
                                    ? message
                                    : message + " Suggestion: " + suggestion;
                            issues.add(item);
                        }
                        if (issues.size() >= 8) break;
                    }
                }
            } catch (Exception ignored) {
                // Fall through to deterministic checks for resilience.
            }
        }

        if (MULTI_SPACE.matcher(text).find()) issues.add("Avoid double spaces between words.");
        if (SPACE_BEFORE_PUNCT.matcher(text).find()) issues.add("Remove spaces before punctuation marks.");
        if (LOWERCASE_SENTENCE_START.matcher(text).find()) issues.add("Start each sentence with a capital letter.");
        if (REPEATED_WORD.matcher(text).find()) issues.add("Avoid accidental repeated words.");
        if (fillerCount >= 8) issues.add("Reduce filler words such as um, uh, like, and basically.");
        if (wordCount >= 80 && !text.matches(".*[.!?]$")) issues.add("Use complete sentences and clear sentence endings.");

        List<String> distinct = issues.stream().filter(s -> s != null && !s.isBlank()).distinct().limit(8).toList();
        int effectiveErrors = Math.max(externalMatches, distinct.size());
        int scorePenalty = Math.min(80, effectiveErrors * 7);
        int score = clamp(100 - scorePenalty, 20, 100);
        return new GrammarAnalysis(score, effectiveErrors, distinct);
    }

    private int countFillers(String lower) {
        int fillerCount = 0;
        for (String filler : FILLER_WORDS) {
            Matcher matcher = Pattern.compile("\\b" + Pattern.quote(filler) + "\\b", Pattern.CASE_INSENSITIVE).matcher(lower);
            while (matcher.find()) fillerCount++;
        }
        return fillerCount;
    }

    private int repeatedWordPenalty(String text) {
        int count = 0;
        Matcher matcher = REPEATED_WORD.matcher(text);
        while (matcher.find()) count++;
        return Math.min(20, count * 5);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record GrammarAnalysis(int score, int issueCount, List<String> issues) {}
}
