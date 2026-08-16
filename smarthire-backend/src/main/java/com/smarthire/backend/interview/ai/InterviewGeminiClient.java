package com.smarthire.backend.interview.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.dto.InterviewQuestionDto;
import com.smarthire.backend.interview.dto.InterviewQuestionGenerationResult;
import com.smarthire.backend.interview.exception.InterviewException;
import com.smarthire.backend.interview.repository.QuestionBankQuestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Component
public class InterviewGeminiClient {

    private static final Logger log = LoggerFactory.getLogger(InterviewGeminiClient.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private final QuestionBankQuestionRepository questionBankRepository;
    private final boolean questionGenerationEnabled;
    private final int readTimeoutSeconds;

    public InterviewGeminiClient(RestClient.Builder restClientBuilder,
                                 @Value("${gemini.api.key}") String apiKey,
                                 @Value("${gemini.model:gemini-3.6-flash}") String model,
                                 @Value("${gemini.timeout.connect:10}") int connectTimeoutSeconds,
                                 @Value("${gemini.timeout.read:4}") int readTimeoutSeconds,
                                 @Value("${gemini.question-generation.enabled:true}") boolean questionGenerationEnabled,
                                 QuestionBankQuestionRepository questionBankRepository) {
        this.apiKey = apiKey;
        this.model = model;
        this.questionBankRepository = questionBankRepository;
        this.questionGenerationEnabled = questionGenerationEnabled;
        this.readTimeoutSeconds = readTimeoutSeconds;

        log.info("Gemini API key configured: {}", apiKey != null && !apiKey.isBlank());
        log.info("Gemini question model configured: {}", model);

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
        return generateQuestionsWithSource(jobRole, interviewType, domain, experienceLevel, difficulty).getQuestions();
    }

    public InterviewQuestionGenerationResult generateQuestionsWithSource(String jobRole,
                                                                          String interviewType,
                                                                          String domain,
                                                                          String experienceLevel,
                                                                          String difficulty) {
        if (!questionGenerationEnabled) {
            return fallbackResult(jobRole, interviewType, difficulty, "AI question generation is disabled; SmartHire used the question bank.");
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Gemini API key is missing. Using database question bank fallback.");
            return fallbackResult(jobRole, interviewType, difficulty, "Gemini API key is not configured; SmartHire used the question bank.");
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model
                + ":generateContent";

        Map<String, Object> responseSchema = Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "questions", Map.of(
                                "type", "ARRAY",
                                "items", Map.of(
                                        "type", "OBJECT",
                                        "properties", Map.of(
                                                "question", Map.of("type", "STRING"),
                                                "category", Map.of("type", "STRING"),
                                                "difficulty", Map.of("type", "STRING"),
                                                "answerMode", Map.of("type", "STRING"),
                                                "options", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")),
                                                "correctAnswer", Map.of("type", "STRING")
                                        ),
                                        "required", List.of("question", "category", "difficulty", "answerMode", "options", "correctAnswer")
                                )
                        )
                ),
                "required", List.of("questions")
        );

        Map<String, Object> generationConfig = Map.of(
                "responseMimeType", "application/json",
                "responseSchema", responseSchema
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", buildPrompt(jobRole, interviewType, domain, experienceLevel, difficulty))
                                )
                        )
                ),
                "generationConfig", generationConfig
        );

        try {
            int hardTimeoutSeconds = Math.max(3, readTimeoutSeconds + 1);
            CompletableFuture<JsonNode> requestFuture = CompletableFuture.supplyAsync(() ->
                    restClient.post()
                            .uri(url)
                            .header("x-goog-api-key", apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(requestBody)
                            .retrieve()
                            .body(JsonNode.class)
            );
            JsonNode response;
            try {
                response = requestFuture.get(hardTimeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException timeout) {
                requestFuture.cancel(true);
                log.warn("Gemini question request exceeded {} seconds; using database fallback.", hardTimeoutSeconds);
                return fallbackResult(jobRole, interviewType, difficulty,
                        "AI response timed out; SmartHire used the question bank.");
            }

            List<InterviewQuestionDto> parsed = parseQuestions(response, difficulty);
            if (!parsed.isEmpty()) {
                parsed = ensureMcqCoverage(parsed, jobRole, interviewType, difficulty);
                return new InterviewQuestionGenerationResult(parsed, false, "AI-generated interview questions are ready.");
            }

            log.warn("Gemini returned no usable questions. Falling back to the database question bank.");
            return fallbackResult(jobRole, interviewType, difficulty, "AI returned no usable questions; SmartHire used the question bank.");
        } catch (RestClientResponseException ex) {
            String responseBody = ex.getResponseBodyAsString();
            log.error("Gemini API request failed with status {}: {}", ex.getStatusCode(), responseBody);
            return fallbackResult(jobRole, interviewType, difficulty,
                    "AI service is temporarily unavailable (HTTP " + ex.getStatusCode().value() + "); SmartHire used the question bank.");
        } catch (Exception ex) {
            log.error("Gemini API request failed unexpectedly. Using database question bank fallback.", ex);
            return fallbackResult(jobRole, interviewType, difficulty,
                    "AI service is temporarily unavailable; SmartHire used the question bank.");
        }
    }

    private List<InterviewQuestionDto> parseQuestions(JsonNode response, String fallbackDifficulty) {
        if (response == null) {
            return List.of();
        }

        JsonNode candidates = response.path("candidates");
        if (!candidates.isArray() || candidates.isEmpty()) {
            String blockReason = response.path("promptFeedback").path("blockReason").asText("UNKNOWN");
            log.warn("Gemini API returned no candidates. Block reason: {}", blockReason);
            return List.of();
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
            return List.of();
        }

        return parseQuestionText(textBuilder.toString(), fallbackDifficulty);
    }

    private List<InterviewQuestionDto> parseQuestionText(String rawResponse, String fallbackDifficulty) {
        try {
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root;
            try {
                root = objectMapper.readTree(cleaned);
            } catch (Exception firstParseError) {
                int firstBrace = cleaned.indexOf('{');
                int lastBrace = cleaned.lastIndexOf('}');
                if (firstBrace >= 0 && lastBrace > firstBrace) {
                    root = objectMapper.readTree(cleaned.substring(firstBrace, lastBrace + 1));
                } else {
                    throw firstParseError;
                }
            }

            JsonNode questionsNode = root.path("questions");
            if (!questionsNode.isArray()) {
                return List.of();
            }

            List<InterviewQuestionDto> questions = new ArrayList<>();
            for (JsonNode questionNode : questionsNode) {
                String question = questionNode.path("question").asText("").trim();
                if (question.isEmpty()) {
                    continue;
                }

                String category = questionNode.path("category").asText("General").trim();
                String difficulty = questionNode.path("difficulty").asText(fallbackDifficulty).trim();
                String answerMode = questionNode.path("answerMode").asText("TEXT").trim();
                String correctAnswer = questionNode.path("correctAnswer").asText("").trim();
                List<String> options = new ArrayList<>();
                JsonNode optionsNode = questionNode.path("options");
                if (optionsNode.isArray()) {
                    optionsNode.forEach(n -> { String v=n.asText("").trim(); if(!v.isEmpty()) options.add(v); });
                }
                if (options.size() >= 2 && !correctAnswer.isBlank()) answerMode = "MCQ";
                if ("MCQ".equalsIgnoreCase(answerMode) && (options.size() < 4 || correctAnswer.isBlank())) {
                    answerMode = "TEXT";
                    options.clear();
                    correctAnswer = "";
                }
                questions.add(new InterviewQuestionDto(question, category, difficulty, options, answerMode, correctAnswer));
            }

            if (questions.size() > 10) {
                return new ArrayList<>(questions.subList(0, 10));
            }
            return questions;
        } catch (Exception e) {
            log.warn("Failed to parse Gemini question JSON. Falling back to the database question bank.", e);
            return List.of();
        }
    }

    /**
     * Guarantees that a technical/assessment interview contains at least two
     * selectable multiple-choice questions even when Gemini returns only
     * open-ended questions. The MCQs come from the trusted local question
     * bank and are merged without duplicating AI questions.
     */
    private List<InterviewQuestionDto> ensureMcqCoverage(List<InterviewQuestionDto> aiQuestions,
                                                           String jobRole,
                                                           String interviewType,
                                                           String difficulty) {
        String safeType = normalizeInterviewType(interviewType);
        boolean shouldUseMcq = safeType.toLowerCase(Locale.ROOT).contains("technical")
                || safeType.toLowerCase(Locale.ROOT).contains("assessment")
                || safeType.toLowerCase(Locale.ROOT).contains("quiz");
        if (!shouldUseMcq) {
            return aiQuestions.stream().limit(10).toList();
        }

        // Technical/assessment interviews are objective in this build: every question is an MCQ.
        // Prefer Gemini-generated MCQs with a hidden answer key, then fill any gaps from the
        // trusted database bank. This guarantees 10 visible option sets and deterministic scoring.
        List<InterviewQuestionDto> result = new ArrayList<>();
        for (InterviewQuestionDto q : aiQuestions) {
            if (q != null && "MCQ".equalsIgnoreCase(q.getAnswerMode())
                    && q.getOptions() != null && q.getOptions().size() >= 4
                    && q.getCorrectAnswer() != null && !q.getCorrectAnswer().isBlank()) {
                result.add(q);
            }
            if (result.size() >= 10) break;
        }

        String safeRole = safeValue(jobRole, "Software Engineer");
        String safeDifficulty = safeValue(difficulty, "Medium");
        List<com.smarthire.backend.interview.entity.QuestionBankQuestion> bank =
                questionBankRepository.findByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
                        safeRole, safeType, safeDifficulty, "MCQ");
        if (bank.size() < 10) {
            bank = mergeDistinct(bank, questionBankRepository
                    .findByInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
                            safeType, safeDifficulty, "MCQ"));
        }
        if (bank.size() < 10) {
            bank = mergeDistinct(bank, questionBankRepository.findByAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc("MCQ"));
        }
        bank = bank.stream().filter(row -> "MCQ".equalsIgnoreCase(row.getAnswerMode())
                && row.getCorrectAnswer() != null && !row.getCorrectAnswer().isBlank()
                && parseOptions(row.getOptionsJson()).size() >= 4).limit(10).toList();

        for (com.smarthire.backend.interview.entity.QuestionBankQuestion row : bank) {
            if (result.size() >= 10) break;
            if (result.stream().anyMatch(q -> row.getQuestion().equalsIgnoreCase(q.getQuestion()))) continue;
            result.add(new InterviewQuestionDto(row.getQuestion(), row.getCategory(), row.getDifficulty(),
                    parseOptions(row.getOptionsJson()), row.getAnswerMode(), row.getCorrectAnswer()));
        }

        if (result.size() < 10) {
            return fallbackResult(jobRole, interviewType, difficulty,
                    "The technical question bank does not contain enough MCQs.").getQuestions();
        }
        return result.stream().limit(10).toList();
    }

    private InterviewQuestionGenerationResult fallbackResult(String jobRole,
                                                               String interviewType,
                                                               String difficulty,
                                                               String reason) {
        String safeRole = safeValue(jobRole, "Software Engineer");
        String safeType = normalizeInterviewType(interviewType);
        String safeDifficulty = safeValue(difficulty, "Medium");
        boolean objective = isObjectiveInterview(safeType);
        List<com.smarthire.backend.interview.entity.QuestionBankQuestion> rows;
        if (objective) {
            rows = questionBankRepository.findByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
                    safeRole, safeType, safeDifficulty, "MCQ");
            if (rows.size() < 10) {
                rows = mergeDistinct(rows, questionBankRepository
                        .findByInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc(
                                safeType, safeDifficulty, "MCQ"));
            }
            if (rows.size() < 10) {
                rows = mergeDistinct(rows, questionBankRepository.findByAnswerModeIgnoreCaseAndActiveTrueOrderByIdAsc("MCQ"));
            }
            rows = rows.stream().filter(row -> parseOptions(row.getOptionsJson()).size() >= 4
                    && row.getCorrectAnswer() != null && !row.getCorrectAnswer().isBlank())
                    .limit(10).toList();
        } else {
            rows = questionBankRepository
                    .findTop10ByJobRoleIgnoreCaseAndInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndActiveTrueOrderByIdAsc(
                            safeRole, safeType, safeDifficulty);
            if (rows.size() < 10) {
                rows = mergeDistinct(rows, questionBankRepository
                        .findTop10ByInterviewTypeIgnoreCaseAndDifficultyIgnoreCaseAndActiveTrueOrderByIdAsc(safeType, safeDifficulty));
            }
            if (rows.size() < 10) {
                rows = mergeDistinct(rows, questionBankRepository.findTop10ByActiveTrueOrderByIdAsc());
            }
        }

        List<InterviewQuestionDto> questions = rows.stream()
                .limit(10)
                .map(row -> new InterviewQuestionDto(row.getQuestion(), row.getCategory(), row.getDifficulty(), parseOptions(row.getOptionsJson()), row.getAnswerMode(), row.getCorrectAnswer()))
                .toList();

        if (objective && questions.size() < 10) {
            questions = mergeStaticMcqFallback(questions, difficulty);
        } else if (questions.size() < 10) {
            questions = mergeStaticFallback(questions, difficulty);
        }

        if (isObjectiveInterview(safeType)) {
            questions = questions.stream().filter(q -> "MCQ".equalsIgnoreCase(q.getAnswerMode())
                    && q.getOptions() != null && q.getOptions().size() >= 4
                    && q.getCorrectAnswer() != null && !q.getCorrectAnswer().isBlank()).limit(10).toList();
        }
        if (questions.size() < 10 && isObjectiveInterview(safeType)) {
            questions = mergeStaticMcqFallback(questions, difficulty);
        }
        if (questions.isEmpty()) {
            throw new InterviewException("No interview questions are available. Please seed the SmartHire question bank.");
        }

        log.warn("Using question bank fallback for role='{}', type='{}', difficulty='{}'. Reason: {}",
                safeValue(jobRole, "Software Engineer"), safeValue(interviewType, "Technical"), safeValue(difficulty, "Medium"), reason);

        return new InterviewQuestionGenerationResult(questions, true, reason);
    }

    private List<com.smarthire.backend.interview.entity.QuestionBankQuestion> mergeDistinct(
            List<com.smarthire.backend.interview.entity.QuestionBankQuestion> first,
            List<com.smarthire.backend.interview.entity.QuestionBankQuestion> second) {
        List<com.smarthire.backend.interview.entity.QuestionBankQuestion> merged = new ArrayList<>(first);
        for (com.smarthire.backend.interview.entity.QuestionBankQuestion candidate : second) {
            if (merged.stream().noneMatch(existing -> existing.getId().equals(candidate.getId()))) {
                merged.add(candidate);
            }
            if (merged.size() >= 10) {
                break;
            }
        }
        return merged;
    }

    private String normalizeInterviewType(String interviewType) {
        String value = safeValue(interviewType, "Technical").trim().toLowerCase(Locale.ROOT);
        if (value.contains("technical") || value.contains("assessment") || value.contains("quiz")) return "Technical";
        if (value.contains("hr")) return "HR";
        if (value.contains("behavior")) return "Behavioral";
        if (value.contains("resume")) return "Resume";
        if (value.contains("coding")) return "Coding";
        return safeValue(interviewType, "Technical");
    }

    private boolean isObjectiveInterview(String interviewType) {
        String value = safeValue(interviewType, "Technical").toLowerCase(Locale.ROOT);
        return value.contains("technical") || value.contains("assessment") || value.contains("quiz");
    }

    private List<InterviewQuestionDto> mergeStaticMcqFallback(List<InterviewQuestionDto> existing, String difficulty) {
        List<InterviewQuestionDto> questions = new ArrayList<>(existing);
        List<InterviewQuestionDto> generic = List.of(
                mcq("Which HTML element is used for the largest heading?", "HTML", "h1", "h2", "h3", "h4", "h1", difficulty),
                mcq("Which JavaScript keyword declares a block-scoped constant?", "JavaScript", "var", "let", "const", "function", "const", difficulty),
                mcq("Which HTTP status means Not Found?", "HTTP", "200", "201", "404", "500", "404", difficulty),
                mcq("Which Git command creates a commit from staged changes?", "Git", "git push", "git commit", "git fetch", "git clone", "git commit", difficulty),
                mcq("Which SQL keyword removes duplicate rows?", "SQL", "UNIQUE", "DISTINCT", "DEDUP", "GROUPONLY", "DISTINCT", difficulty),
                mcq("Which Java keyword prevents a class from being extended?", "Java", "static", "final", "private", "abstract", "final", difficulty),
                mcq("Which React hook manages local component state?", "React", "useEffect", "useState", "useMemo", "useRef", "useState", difficulty),
                mcq("Which practice reduces reflected XSS risk?", "Security", "Disable HTTPS", "Escape untrusted output", "Store secrets in CSS", "Use innerHTML", "Escape untrusted output", difficulty),
                mcq("Which chart is commonly used to compare categories?", "Visualization", "Bar chart", "Audio chart", "Gauge only", "Text chart", "Bar chart", difficulty),
                mcq("Which protocol is commonly used for secure web traffic?", "Networking", "HTTP", "HTTPS", "FTP", "SMTP", "HTTPS", difficulty)
        );
        for (InterviewQuestionDto item : generic) {
            if (questions.size() >= 10) break;
            questions.add(item);
        }
        return questions.stream().limit(10).toList();
    }

    private InterviewQuestionDto mcq(String question, String category, String a, String b, String c, String d, String correctAnswer, String difficulty) {
        return new InterviewQuestionDto(question, category, safeValue(difficulty, "Medium"), List.of(a, b, c, d), "MCQ", correctAnswer);
    }

    private List<InterviewQuestionDto> mergeStaticFallback(List<InterviewQuestionDto> existing, String difficulty) {
        List<InterviewQuestionDto> questions = new ArrayList<>(existing);
        List<InterviewQuestionDto> generic = List.of(
                new InterviewQuestionDto("Tell me about a challenging project you worked on and how you solved the problem.", "Problem Solving", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("How do you prioritize tasks when you have multiple deadlines?", "Prioritization", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("Describe a time you received critical feedback and how you responded.", "Behavioral", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("How do you explain a technical decision to a non-technical stakeholder?", "Communication", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("What do you do when requirements are unclear or changing?", "Adaptability", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("Describe a bug or failure you handled and what you learned from it.", "Problem Solving", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("How do you make sure your work is reliable before release?", "Quality", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("Tell me about a time you had to collaborate under pressure.", "Teamwork", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("What is one technical skill you are currently improving and why?", "Growth", safeValue(difficulty, "Medium")),
                new InterviewQuestionDto("Why do you think you are a good fit for this role?", "Motivation", safeValue(difficulty, "Medium"))
        );
        for (InterviewQuestionDto item : generic) {
            if (questions.size() >= 10) {
                break;
            }
            questions.add(item);
        }
        return questions;
    }

    private String buildPrompt(String jobRole,
                               String interviewType,
                               String domain,
                               String experienceLevel,
                               String difficulty) {
        return "You are an expert interviewer. Generate exactly 10 interview questions. "
                + "Return ONLY valid JSON and no markdown/code fences. For Technical, Assessment, or Quiz interviews, ALL 10 questions must be multiple-choice: set answerMode to MCQ, provide exactly four plausible options, and provide the exact correctAnswer matching one option. For HR or Behavioral interviews, use TEXT questions with an empty options array and an empty correctAnswer. "
                + "Use exactly this schema: {\"questions\":[{\"question\":\"...\",\"category\":\"Technical\",\"difficulty\":\"Medium\"}]}. "
                + "Input details: "
                + "Job Role=" + safeValue(jobRole, "Not provided") + ", "
                + "Interview Type=" + safeValue(interviewType, "Not provided") + ", "
                + "Domain=" + safeValue(domain, "Not provided") + ", "
                + "Experience Level=" + safeValue(experienceLevel, "Not provided") + ", "
                + "Difficulty=" + safeValue(difficulty, "Medium") + ". "
                + "Distribution rules: "
                + "If Interview Type is Technical, generate 10 technical MCQs covering different concepts. "
                + "If Interview Type is HR, cover behavioural, communication, leadership, and career goals across 10 text questions. "
                + "Every question object must include non-empty question, category, and difficulty. "
                + "Difficulty values should be aligned with input difficulty.";
    }

    private List<String> parseOptions(String optionsJson) {
        if (optionsJson == null || optionsJson.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(optionsJson);
            if (!node.isArray()) return List.of();
            List<String> out = new ArrayList<>();
            node.forEach(n -> { String v=n.asText("").trim(); if(!v.isEmpty()) out.add(v); });
            return out;
        } catch (Exception ex) {
            return List.of();
        }
    }

    private String safeValue(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }
}
