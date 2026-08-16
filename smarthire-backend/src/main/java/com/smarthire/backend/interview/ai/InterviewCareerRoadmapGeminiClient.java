package com.smarthire.backend.interview.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.dto.CareerRoadmapRequest;
import com.smarthire.backend.interview.dto.CareerRoadmapResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class InterviewCareerRoadmapGeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public InterviewCareerRoadmapGeminiClient(RestClient.Builder restClientBuilder,
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

    public CareerRoadmapResponse generateRoadmap(CareerRoadmapRequest request) {
        if (request == null || apiKey == null || apiKey.isBlank()) {
            return fallbackRoadmap(request, "fallback");
        }

        try {
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
                return fallbackRoadmap(request, "fallback");
            }

            JsonNode candidates = response.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return fallbackRoadmap(request, "fallback");
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
                return fallbackRoadmap(request, "fallback");
            }

            return parseRoadmap(textBuilder.toString(), request);
        } catch (Exception exception) {
            return fallbackRoadmap(request, "fallback");
        }
    }

    private CareerRoadmapResponse parseRoadmap(String raw, CareerRoadmapRequest request) {
        try {
            String cleaned = raw.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            CareerRoadmapResponse response = new CareerRoadmapResponse();
            response.setProvider("gemini");
            response.setSummary(text(root.path("summary"), "Roadmap generated for your next role."));
            response.setCareerRoadmap(readList(root.path("careerRoadmap")));
            response.setRecommendedSkills(readList(root.path("recommendedSkills")));
            response.setCertifications(readList(root.path("certifications")));
            response.setLearningResources(readList(root.path("learningResources")));
            response.setPracticeProjects(readList(root.path("practiceProjects")));

            if (response.getCareerRoadmap().isEmpty()) {
                return fallbackRoadmap(request, "fallback");
            }

            return response;
        } catch (Exception exception) {
            return fallbackRoadmap(request, "fallback");
        }
    }

    private CareerRoadmapResponse fallbackRoadmap(CareerRoadmapRequest request, String provider) {
        String targetRole = safe(request == null ? null : request.getTargetRole(), "Software Engineer");
        String currentRole = safe(request == null ? null : request.getCurrentRole(), "Candidate");
        String experience = safe(request == null ? null : request.getExperienceLevel(), "Mid");
        List<String> skills = request == null || request.getCurrentSkills() == null
                ? List.of("Problem Solving", "Communication")
                : request.getCurrentSkills().stream().filter(item -> item != null && !item.isBlank()).map(String::trim).collect(Collectors.toList());

        CareerRoadmapResponse response = new CareerRoadmapResponse();
        response.setProvider(provider);
        response.setSummary("A staged career roadmap from " + currentRole + " to " + targetRole + " based on " + experience + " experience level.");
        response.setCareerRoadmap(List.of(
                "Month 1-2: Strengthen fundamentals and interview communication.",
                "Month 3-4: Build two production-like projects aligned to " + targetRole + ".",
                "Month 5-6: Practice advanced system and behavioral interview rounds.",
                "Month 7+: Apply to target roles and iterate using mock interview feedback."
        ));
        response.setRecommendedSkills(List.of(
                "Data Structures and Algorithms",
                "System Design Basics",
                "API Design and Testing",
                "Behavioral Storytelling (STAR)",
                "Domain-specific expertise for " + targetRole
        ));
        response.setCertifications(List.of(
                "AWS Cloud Practitioner",
                "Google Associate Cloud Engineer",
                "Oracle Java Certification"
        ));
        response.setLearningResources(List.of(
                "LeetCode interview track",
                "Roadmap.sh role guides",
                "Official documentation for your core stack"
        ));
        response.setPracticeProjects(List.of(
                "Build an interview simulation dashboard with analytics",
                "Create a REST API with authentication, tests, and CI",
                "Develop a portfolio project using one new technology"
        ));

        if (!skills.isEmpty()) {
            response.getRecommendedSkills().add("Leverage existing skills: " + String.join(", ", skills));
        }

        return response;
    }

    private List<String> readList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        return java.util.stream.StreamSupport.stream(node.spliterator(), false)
                .map(item -> item.asText(""))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.toList());
    }

    private String buildPrompt(CareerRoadmapRequest request) {
        return "You are an AI career coach. Return ONLY JSON with this schema: "
                + "{\"summary\":\"...\",\"careerRoadmap\":[\"...\"],\"recommendedSkills\":[\"...\"],\"certifications\":[\"...\"],\"learningResources\":[\"...\"],\"practiceProjects\":[\"...\"]}. "
                + "Input: currentRole=" + safe(request.getCurrentRole(), "Candidate")
                + ", targetRole=" + safe(request.getTargetRole(), "Software Engineer")
                + ", experienceLevel=" + safe(request.getExperienceLevel(), "Mid")
                + ", currentSkills=" + String.join(", ", request.getCurrentSkills() == null ? List.of() : request.getCurrentSkills()) + ". "
                + "Make recommendations practical, measurable, and industry-relevant.";
    }

    private String safe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String text(JsonNode node, String fallback) {
        String value = node == null ? "" : node.asText("").trim();
        return value.isEmpty() ? fallback : value;
    }
}
