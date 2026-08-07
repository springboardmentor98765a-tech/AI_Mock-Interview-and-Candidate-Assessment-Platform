package com.smarthire.backend.interview.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.dto.InterviewQuestionDto;
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

@Component
public class InterviewGeminiClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public InterviewGeminiClient(RestClient.Builder restClientBuilder,
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

    public List<InterviewQuestionDto> generateQuestions(String jobRole,
                                                        String interviewType,
                                                        String domain,
                                                        String experienceLevel,
                                                        String difficulty) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent?key="
                + apiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", buildPrompt(jobRole, interviewType, domain, experienceLevel, difficulty))
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
            throw new RuntimeException("Gemini API returned an empty response.");
        }

        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            String errorText = response.path("promptFeedback").path("blockReason").asText("UNKNOWN");
            throw new RuntimeException("Gemini API returned no candidates. Block reason: " + errorText);
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
            throw new RuntimeException("Gemini API returned empty text content.");
        }

        return parseQuestions(textBuilder.toString(), difficulty);
    }

    private List<InterviewQuestionDto> parseQuestions(String rawResponse, String fallbackDifficulty) {
        try {
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            JsonNode questionsNode = root.path("questions");

            if (!questionsNode.isArray()) {
                throw new RuntimeException("Gemini response is missing questions array.");
            }

            List<InterviewQuestionDto> questions = new ArrayList<>();

            for (JsonNode questionNode : questionsNode) {
                String question = questionNode.path("question").asText("").trim();
                if (question.isEmpty()) {
                    continue;
                }

                String category = questionNode.path("category").asText("General").trim();
                String difficulty = questionNode.path("difficulty").asText(fallbackDifficulty).trim();

                questions.add(new InterviewQuestionDto(question, category, difficulty));
            }

            if (questions.size() > 10) {
                return questions.subList(0, 10);
            }

            return questions;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini interview questions JSON: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(String jobRole,
                               String interviewType,
                               String domain,
                               String experienceLevel,
                               String difficulty) {
        return "You are an expert interviewer. Generate exactly 10 interview questions. "
                + "Return ONLY valid JSON and no markdown/code fences. "
                + "Use exactly this schema: {\"questions\":[{\"question\":\"...\",\"category\":\"Technical\",\"difficulty\":\"Medium\"}]}. "
                + "Input details: "
                + "Job Role=" + safe(jobRole) + ", "
                + "Interview Type=" + safe(interviewType) + ", "
                + "Domain=" + safe(domain) + ", "
                + "Experience Level=" + safe(experienceLevel) + ", "
                + "Difficulty=" + safe(difficulty) + ". "
                + "Distribution rules: "
                + "If Interview Type is Technical, generate 6 technical + 2 scenario-based + 2 project-based questions. "
                + "If Interview Type is HR, cover behavioural, communication, leadership, and career goals across 10 questions. "
                + "Every question object must include non-empty question, category, and difficulty. "
                + "Difficulty values should be aligned with input difficulty.";
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "Not provided" : value.trim();
    }
}