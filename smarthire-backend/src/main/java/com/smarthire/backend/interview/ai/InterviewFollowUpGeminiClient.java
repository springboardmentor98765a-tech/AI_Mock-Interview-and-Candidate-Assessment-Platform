package com.smarthire.backend.interview.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.dto.InterviewFollowUpRequest;
import com.smarthire.backend.interview.dto.InterviewFollowUpResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class InterviewFollowUpGeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public InterviewFollowUpGeminiClient(RestClient.Builder restClientBuilder,
                                         @Value("${gemini.api.key}") String apiKey,
                                         @Value("${gemini.model:gemini-3.6-flash}") String model,
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

    public InterviewFollowUpResponse generateFollowUpQuestion(InterviewFollowUpRequest request) {
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

        return parseFollowUp(textBuilder.toString());
    }

    private InterviewFollowUpResponse parseFollowUp(String rawResponse) {
        try {
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            String followUpQuestion = root.path("followUpQuestion").asText("").trim();
            if (followUpQuestion.isEmpty()) {
                throw new RuntimeException("Gemini response is missing followUpQuestion.");
            }
            return new InterviewFollowUpResponse(followUpQuestion);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini follow-up JSON: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(InterviewFollowUpRequest request) {
        return "You are an expert interviewer. Generate ONLY one follow-up interview question based on the provided question and candidate answer. "
                + "Return ONLY valid JSON and no markdown/code fences. "
                + "Use exactly this schema: {\"followUpQuestion\":\"...\"}. "
                + "Rules: generate one concise follow-up question, no list, no numbering, no explanation. "
                + "Input: Job Role=" + safe(request.getJobRole()) + ", "
                + "Current Question=" + safe(request.getQuestion()) + ", "
                + "Candidate Answer=" + safe(request.getCandidateAnswer());
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "Not provided" : value.trim();
    }
}