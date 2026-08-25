package com.smarthireai.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthireai.dto.InterviewQuestionRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class AIQuestionGenerationService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AIQuestionGenerationService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // =========================================================
    // MAIN METHOD
    // =========================================================

    public List<String> generateQuestions(
            InterviewQuestionRequest request) {

        String prompt = buildPrompt(request);

        return generateUsingGemini(prompt);
    }

    // =========================================================
    // BUILD PROMPT
    // =========================================================

    private String buildPrompt(
            InterviewQuestionRequest request) {

        return """
                Generate exactly %d interview questions.

                Interview Type: %s
                Difficulty: %s
                Domain/Technology: %s

                Requirements:
                1. Generate exactly %d questions.
                2. Questions must be relevant to the interview type.
                3. Questions must match the difficulty level.
                4. Questions must be suitable for a job interview.
                5. Do not provide answers.
                6. Do not provide explanations.
                7. Return only the questions.
                8. Put each question on a separate line.

                Example:

                What is polymorphism in Java?
                Explain the difference between ArrayList and LinkedList.
                What is exception handling in Java?
                """
                .formatted(
                        request.getNumberOfQuestions(),
                        request.getType(),
                        request.getDifficulty(),
                        request.getDomain(),
                        request.getNumberOfQuestions()
                );
    }

    // =========================================================
    // GEMINI API CALL
    // =========================================================

    private List<String> generateUsingGemini(
            String prompt) {

        try {

            // -------------------------------------------------
            // Create request JSON
            // -------------------------------------------------

            String requestBody = """
                    {
                      "contents": [
                        {
                          "parts": [
                            {
                              "text": %s
                            }
                          ]
                        }
                      ]
                    }
                    """.formatted(
                    objectMapper.writeValueAsString(prompt)
            );

            // -------------------------------------------------
            // Headers
            // -------------------------------------------------

            HttpHeaders headers = new HttpHeaders();

            headers.setContentType(
                    MediaType.APPLICATION_JSON
            );

            headers.set(
                    "x-goog-api-key",
                    apiKey
            );

            // -------------------------------------------------
            // Request
            // -------------------------------------------------

            HttpEntity<String> entity =
                    new HttpEntity<>(
                            requestBody,
                            headers
                    );

            // -------------------------------------------------
            // Call Gemini
            // -------------------------------------------------

            ResponseEntity<String> response =
                    restTemplate.exchange(
                            apiUrl,
                            HttpMethod.POST,
                            entity,
                            String.class
                    );

            // -------------------------------------------------
            // Check response
            // -------------------------------------------------

            if (!response.getStatusCode().is2xxSuccessful()) {

                throw new RuntimeException(
                        "Gemini API error: "
                                + response.getStatusCode()
                );
            }

            // -------------------------------------------------
            // Parse JSON
            // -------------------------------------------------

            JsonNode root =
                    objectMapper.readTree(
                            response.getBody()
                    );

            String generatedText =
                    extractGeneratedText(root);

            // -------------------------------------------------
            // Convert text to questions
            // -------------------------------------------------

            return convertToQuestionList(
                    generatedText
            );

        } catch (Exception e) {

            throw new RuntimeException(
                    "Failed to generate AI questions: "
                            + e.getMessage(),
                    e
            );
        }
    }

    // =========================================================
    // EXTRACT GEMINI TEXT
    // =========================================================

    private String extractGeneratedText(
            JsonNode root) {

        JsonNode candidates =
                root.path("candidates");

        if (!candidates.isArray()
                || candidates.isEmpty()) {

            throw new RuntimeException(
                    "Gemini returned no candidates"
            );
        }

        JsonNode firstCandidate =
                candidates.get(0);

        JsonNode parts =
                firstCandidate
                        .path("content")
                        .path("parts");

        if (!parts.isArray()) {

            throw new RuntimeException(
                    "Invalid response from Gemini"
            );
        }

        StringBuilder result =
                new StringBuilder();

        for (JsonNode part : parts) {

            JsonNode text =
                    part.path("text");

            if (!text.isMissingNode()) {

                result.append(
                        text.asText()
                );

                result.append("\n");
            }
        }

        String generatedText =
                result.toString().trim();

        if (generatedText.isEmpty()) {

            throw new RuntimeException(
                    "Gemini returned empty response"
            );
        }

        return generatedText;
    }

    // =========================================================
    // CONVERT RESPONSE TO QUESTION LIST
    // =========================================================

    private List<String> convertToQuestionList(
            String text) {

        List<String> questions =
                new ArrayList<>();

        String[] lines =
                text.split("\\r?\\n");

        for (String line : lines) {

            String question =
                    line.trim();

            if (question.isEmpty()) {
                continue;
            }

            // Remove numbering:
            // 1. Question
            // 2) Question
            // 3 - Question

            question =
                    question.replaceFirst(
                            "^\\d+[.)-]\\s*",
                            ""
                    );

            if (!question.isEmpty()) {

                questions.add(question);
            }
        }

        return questions;
    }
}