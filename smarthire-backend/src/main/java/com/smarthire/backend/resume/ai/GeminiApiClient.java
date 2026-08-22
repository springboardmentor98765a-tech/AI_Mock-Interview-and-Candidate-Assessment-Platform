package com.smarthire.backend.resume.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class GeminiApiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiApiClient(RestClient.Builder restClientBuilder,
                           @Value("${gemini.api.key}") String apiKey,
                           @Value("${gemini.model:gemini-3.6-flash}") String model,
                           @Value("${gemini.timeout.connect:10}") int connectTimeoutSeconds,
                           @Value("${gemini.timeout.read:30}") int readTimeoutSeconds) {
        this.apiKey = apiKey;
        this.model = model;

        // Configure timeouts for the HTTP client
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

    /**
     * Sends the resume text to Google Gemini and returns the raw generated text
     * (which should contain JSON when the prompt requests JSON).
     */
    public String analyzeResume(String resumeText) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("GEMINI_API_KEY is not configured in the backend environment.");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent?key="
                + apiKey;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", buildPrompt(resumeText))
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.2
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

        if (textBuilder.length() == 0) {
            throw new RuntimeException("Gemini API returned empty text content.");
        }

        return textBuilder.toString();
    }

    private String buildPrompt(String resumeText) {
        return "You are an expert resume analyzer and ATS (Applicant Tracking System) scoring engine. "
                + "Analyze the following resume text and return ONLY valid JSON "
                + "with exactly this structure (no markdown, no code fences, no extra text):\n"
                + "{\n"
                + "  \"skills\": [],\n"
                + "  \"experience\": \"\",\n"
                + "  \"technologies\": [],\n"
                + "  \"education\": \"\",\n"
                + "  \"summary\": \"\",\n"
                + "  \"atsScore\": 0,\n"
                + "  \"keywordScore\": 0,\n"
                + "  \"formattingScore\": 0,\n"
                + "  \"skillsScore\": 0,\n"
                + "  \"experienceScore\": 0,\n"
                + "  \"educationScore\": 0,\n"
                + "  \"missingSkills\": [],\n"
                + "  \"strengths\": [],\n"
                + "  \"weaknesses\": [],\n"
                + "  \"improvementSuggestions\": []\n"
                + "}\n\n"
                + "Field definitions:\n"
                + "- \"skills\": list of strings — ALL explicit hard and soft skills stated in the resume. Never return an empty array if recognizable skills are present.\n"
                + "- \"experience\": string — concise summary of work experience, including years/roles if present.\n"
                + "- \"technologies\": list of strings — programming languages, frameworks, tools, databases mentioned.\n"
                + "- \"education\": string — degrees, institutions, and years if present.\n"
                + "- \"summary\": string — a 2-3 sentence professional summary generated from the resume.\n"
                + "- \"atsScore\": integer 0-100 — overall ATS compatibility score of the resume.\n"
                + "- \"keywordScore\": integer 0-100 — how well the resume matches common ATS keywords for the implied job role.\n"
                + "- \"formattingScore\": integer 0-100 — how ATS-friendly the resume formatting is (standard sections, no tables/columns/graphics, clear headings, consistent fonts).\n"
                + "- \"skillsScore\": integer 0-100 — completeness and relevance of the skills section.\n"
                + "- \"experienceScore\": integer 0-100 — quality, relevance, and quantification of work experience.\n"
                + "- \"educationScore\": integer 0-100 — completeness and relevance of education details.\n"
                + "- \"missingSkills\": list of strings — important in-demand skills that are NOT present in the resume "
                + "but are commonly expected for the candidate's implied role/domain. Examples: Docker, Kubernetes, React, AWS.\n"
                + "- \"strengths\": list of strings — 3-5 key strengths of the resume (e.g., strong technical skills, clear formatting, quantified achievements).\n"
                + "- \"weaknesses\": list of strings — 3-5 areas where the resume could be improved (e.g., lack of quantified metrics, missing summary, too verbose).\n"
                + "- \"improvementSuggestions\": list of strings — 3-5 actionable suggestions to improve the resume (e.g., \"Add more quantifiable achievements\", \"Include a professional summary section\").\n\n"
                + "Scoring rules:\n"
                + "- All scores must be integers between 0 and 100.\n"
                + "- The overall atsScore should be a weighted combination of the five sub-scores.\n"
                + "- Be fair and consistent: a well-structured resume with clear sections, relevant keywords, "
                + "quantified achievements, and complete education should score 85+.\n"
                + "- For missingSkills, only list skills that are genuinely relevant and in-demand for the candidate's "
                + "implied role. Do not list skills already present in the resume. Limit to 3-8 skills.\n\n"
                + "Resume text:\n"
                + "----------------------------------------\n"
                + resumeText
                + "\n----------------------------------------";
    }
}