package com.smarthire.backend.ai.technical;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Uses Gemini to evaluate candidate technical answers.
 * Generates technical accuracy, keyword coverage, completeness, relevance,
 * and suggested better answer for each question-answer pair.
 */
@Component
public class TechnicalAnswerEvaluationGeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public TechnicalAnswerEvaluationGeminiClient(RestClient.Builder restClientBuilder,
                                                 @Value("${gemini.api.key}") String apiKey,
                                                 @Value("${gemini.model:gemini-2.0-flash}") String model,
                                                 @Value("${gemini.timeout.connect:10}") int connectTimeoutSeconds,
                                                 @Value("${gemini.timeout.read:30}") int readTimeoutSeconds) {
        this.apiKey = apiKey;
        this.model = model;

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(connectTimeoutSeconds))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));

        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .build();
        this.objectMapper = new ObjectMapper();
    }

    public TechnicalAnswerEvaluationResponse evaluateAnswers(TechnicalAnswerEvaluationRequest request) {
        if (request == null || request.getQuestions() == null || request.getQuestions().isEmpty()) {
            return buildFallback(request);
        }

        try {
            if (apiKey == null || apiKey.isBlank()) {
                return buildFallback(request);
            }

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + model
                    + ":generateContent?key="
                    + apiKey;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "parts", List.of(
                                            Map.of("text", buildPrompt(request))
                                    )
                            )
                    )
            );

            JsonNode response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return buildFallback(request);
            }

            JsonNode candidates = response.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return buildFallback(request);
            }

            JsonNode parts = candidates.get(0).path("content").path("parts");
            StringBuilder textBuilder = new StringBuilder();
            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    String text = part.path("text").asText("");
                    if (!text.isEmpty()) {
                        textBuilder.append(text);
                    }
                }
            }

            if (textBuilder.isEmpty()) {
                return buildFallback(request);
            }

            TechnicalAnswerEvaluationResponse parsed = parseResponse(textBuilder.toString(), request);
            if (parsed.getEvaluations().isEmpty()) {
                return buildFallback(request);
            }
            return parsed;
        } catch (Exception e) {
            return buildFallback(request);
        }
    }

    private TechnicalAnswerEvaluationResponse parseResponse(String rawResponse, TechnicalAnswerEvaluationRequest request) {
        try {
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            TechnicalAnswerEvaluationResponse parsed = objectMapper.treeToValue(root, TechnicalAnswerEvaluationResponse.class);
            parsed.setInterviewId(request.getInterviewId());

            // Validate and clamp scores
            for (TechnicalAnswerEvaluationResponse.AnswerEvaluation eval : parsed.getEvaluations()) {
                eval.setTechnicalAccuracy(clamp(eval.getTechnicalAccuracy()));
                eval.setKeywordCoverage(clamp(eval.getKeywordCoverage()));
                eval.setCompleteness(clamp(eval.getCompleteness()));
                eval.setRelevance(clamp(eval.getRelevance()));
            }
            return parsed;
        } catch (Exception e) {
            return buildFallback(request);
        }
    }

    private TechnicalAnswerEvaluationResponse buildFallback(TechnicalAnswerEvaluationRequest request) {
        TechnicalAnswerEvaluationResponse response = new TechnicalAnswerEvaluationResponse();
        response.setInterviewId(request == null ? null : request.getInterviewId());

        List<String> questions = request == null || request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request == null || request.getAnswers() == null ? List.of() : request.getAnswers();

        for (int i = 0; i < questions.size(); i++) {
            String question = questions.get(i);
            String answer = i < answers.size() ? answers.get(i) : "";

            TechnicalAnswerEvaluationResponse.AnswerEvaluation eval = new TechnicalAnswerEvaluationResponse.AnswerEvaluation();
            eval.setQuestion(question);
            eval.setAnswer(answer);

            int words = countWords(answer);
            eval.setTechnicalAccuracy(clamp(40 + Math.min(40, words * 2)));
            eval.setKeywordCoverage(clamp(35 + Math.min(45, words * 2)));
            eval.setCompleteness(clamp(30 + Math.min(50, words * 3)));
            eval.setRelevance(clamp(50 + Math.min(30, words)));
            eval.setSuggestedBetterAnswer("Provide a structured answer with context, approach, implementation details, and trade-offs.");

            response.getEvaluations().add(eval);
        }
        return response;
    }

    private String buildPrompt(TechnicalAnswerEvaluationRequest request) {
        List<String> questions = request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request.getAnswers() == null ? List.of() : request.getAnswers();

        StringBuilder pairsBuilder = new StringBuilder();
        for (int i = 0; i < questions.size(); i++) {
            String question = questions.get(i);
            String answer = i < answers.size() ? answers.get(i) : "No answer provided.";
            pairsBuilder.append("Q").append(i + 1).append(": ").append(question).append("\n");
            pairsBuilder.append("A").append(i + 1).append(": ").append(answer).append("\n\n");
        }

        return "You are an expert technical interviewer. Evaluate each candidate answer for technical accuracy, keyword coverage, completeness, and relevance. "
                + "Return ONLY valid JSON with this schema: "
                + "{\"evaluations\":[{\"question\":\"\",\"answer\":\"\",\"technicalAccuracy\":0,\"keywordCoverage\":0,\"completeness\":0,\"relevance\":0,\"suggestedBetterAnswer\":\"\"}]}. "
                + "All scores must be integers between 0 and 100. "
                + "Job Role=" + safeText(request.getJobRole()) + ", "
                + "Domain=" + safeText(request.getDomain()) + ", "
                + "Difficulty=" + safeText(request.getDifficulty()) + ". "
                + "Question and Answer pairs:\n"
                + pairsBuilder;
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }

    private int clamp(int value) {
        if (value < 0) {
            return 0;
        }
        return Math.min(value, 100);
    }

    private String safeText(String text) {
        return text == null ? "" : text.trim();
    }
}