package com.smarthire.backend.interview.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.dto.InterviewEvaluationRequest;
import com.smarthire.backend.interview.dto.InterviewEvaluationResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class InterviewEvaluationGeminiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public InterviewEvaluationGeminiClient(RestClient.Builder restClientBuilder,
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

    public InterviewEvaluationResponse evaluateInterview(InterviewEvaluationRequest request) {
        if (request == null) {
            return buildFallbackEvaluation(null);
        }

        try {
            if (apiKey == null || apiKey.isBlank()) {
                return buildFallbackEvaluation(request);
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
                return buildFallbackEvaluation(request);
            }

            JsonNode candidates = response.path("candidates");
            if (!candidates.isArray() || candidates.isEmpty()) {
                return buildFallbackEvaluation(request);
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
                return buildFallbackEvaluation(request);
            }

            InterviewEvaluationResponse parsed = parseEvaluation(textBuilder.toString());
            if (parsed.getOverallScore() <= 0) {
                return buildFallbackEvaluation(request);
            }
            return parsed;
        } catch (Exception ignored) {
            return buildFallbackEvaluation(request);
        }
    }

    private InterviewEvaluationResponse parseEvaluation(String rawResponse) {
        try {
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
                cleaned = cleaned.replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            InterviewEvaluationResponse parsed = objectMapper.treeToValue(root, InterviewEvaluationResponse.class);
            InterviewEvaluationResponse safe = new InterviewEvaluationResponse();

            safe.setCommunicationScore(clamp(parsed.getCommunicationScore()));
            safe.setConfidenceScore(clamp(parsed.getConfidenceScore()));
            safe.setTechnicalScore(clamp(parsed.getTechnicalScore()));
            safe.setProfessionalismScore(clamp(parsed.getProfessionalismScore()));
            safe.setGrammarScore(clamp(parsed.getGrammarScore()));
            safe.setSpeechClarityScore(clamp(parsed.getSpeechClarityScore()));
            safe.setSpeakingPaceScore(clamp(parsed.getSpeakingPaceScore()));
            safe.setFillerWordScore(clamp(parsed.getFillerWordScore()));
            safe.setResponseCompletenessScore(clamp(parsed.getResponseCompletenessScore()));
            safe.setEyeContactPercentage(clamp(parsed.getEyeContactPercentage()));
            safe.setFacialEngagementScore(clamp(parsed.getFacialEngagementScore()));
            safe.setResponseHesitationScore(clamp(parsed.getResponseHesitationScore()));
            safe.setKeywordMatchingScore(clamp(parsed.getKeywordMatchingScore()));
            safe.setDomainRelevanceScore(clamp(parsed.getDomainRelevanceScore()));
            safe.setTechnicalAccuracyScore(clamp(parsed.getTechnicalAccuracyScore()));
            safe.setProblemSolvingScore(clamp(parsed.getProblemSolvingScore()));
            safe.setAnswerCompletenessScore(clamp(parsed.getAnswerCompletenessScore()));
            safe.setTimeManagementScore(clamp(parsed.getTimeManagementScore()));
            safe.setAnswerOrganizationScore(clamp(parsed.getAnswerOrganizationScore()));
            safe.setInterviewEtiquetteScore(clamp(parsed.getInterviewEtiquetteScore()));
            safe.setStrengths(normalizeList(parsed.getStrengths()));
            safe.setWeaknesses(normalizeList(parsed.getWeaknesses()));
            safe.setImprovementSuggestions(normalizeList(parsed.getImprovementSuggestions()));
            safe.setPracticeRecommendations(normalizeList(parsed.getPracticeRecommendations()));
            safe.setLearningResources(normalizeList(parsed.getLearningResources()));
            safe.setFeedback(normalizeList(parsed.getFeedback()));
            safe.setRecommendation(safeText(parsed.getRecommendation()));
            safe.setRating(normalizeRating(parsed.getRating(), safe.getOverallScore()));

            if (safe.getCommunicationScore() == 0 && safe.getTechnicalScore() == 0 && safe.getProfessionalismScore() == 0) {
                return buildFallbackEvaluation(null);
            }

            if (safe.getOverallScore() <= 0) {
                safe.setOverallScore(weightedOverall(safe.getCommunicationScore(), safe.getConfidenceScore(), safe.getTechnicalScore(), safe.getProfessionalismScore()));
            }
            return safe;
        } catch (Exception e) {
            return buildFallbackEvaluation(null);
        }
    }

    private InterviewEvaluationResponse buildFallbackEvaluation(InterviewEvaluationRequest request) {
        List<String> questions = request == null || request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request == null || request.getAnswers() == null ? List.of() : request.getAnswers();
        int pairCount = Math.max(questions.size(), answers.size());
        List<String> effectiveQuestions = new ArrayList<>();
        List<String> effectiveAnswers = new ArrayList<>();

        for (int i = 0; i < pairCount; i++) {
            String question = i < questions.size() ? safeText(questions.get(i)) : "General interview question";
            String answer = i < answers.size() ? safeText(answers.get(i)) : "";
            if (question.isBlank()) {
                continue;
            }
            effectiveQuestions.add(question);
            effectiveAnswers.add(answer.isBlank() ? "No answer provided." : answer);
        }

        if (effectiveQuestions.isEmpty()) {
            effectiveQuestions = List.of("General interview question");
            String transcript = request == null ? "" : safeText(request.getTranscript());
            effectiveAnswers = List.of(transcript.isBlank() ? "No answer provided." : transcript);
        }

        Set<String> roleKeywords = keywordSet(
                request == null ? null : request.getJobRole(),
                request == null ? null : request.getInterviewType(),
                request == null ? null : request.getDifficulty()
        );
        Set<String> answerKeywords = keywordSet(String.join(" ", effectiveAnswers));

        List<Integer> grammarScores = new ArrayList<>();
        List<Integer> clarityScores = new ArrayList<>();
        List<Integer> paceScores = new ArrayList<>();
        List<Integer> fillerScores = new ArrayList<>();
        List<Integer> completenessScores = new ArrayList<>();
        List<Integer> eyeContactScores = new ArrayList<>();
        List<Integer> engagementScores = new ArrayList<>();
        List<Integer> hesitationScores = new ArrayList<>();
        List<Integer> keywordScores = new ArrayList<>();
        List<Integer> domainScores = new ArrayList<>();
        List<Integer> accuracyScores = new ArrayList<>();
        List<Integer> problemSolvingScores = new ArrayList<>();
        List<Integer> answerCompletenessScores = new ArrayList<>();
        List<Integer> timeScores = new ArrayList<>();
        List<Integer> organizationScores = new ArrayList<>();
        List<Integer> etiquetteScores = new ArrayList<>();

        String transcript = request == null ? "" : safeText(request.getTranscript());
        int durationSeconds = request == null || request.getDurationSeconds() == null ? 0 : Math.max(0, request.getDurationSeconds());
        boolean cameraAvailable = request != null && Boolean.TRUE.equals(request.getCameraAvailable());
        boolean microphoneAvailable = request != null && Boolean.TRUE.equals(request.getMicrophoneAvailable());
        boolean cameraActive = request != null && Boolean.TRUE.equals(request.getCameraActive());
        boolean microphoneActive = request != null && Boolean.TRUE.equals(request.getMicrophoneActive());

        for (int i = 0; i < effectiveQuestions.size(); i++) {
            String question = effectiveQuestions.get(i);
            String answer = effectiveAnswers.get(i);
            int words = countWords(answer);
            int fillers = countFillerWords(answer);
            int questionWords = countWords(question);

            grammarScores.add(clamp(92 - fillers * 4 - punctuationPenalty(answer) - shortAnswerPenalty(words)));
            clarityScores.add(clamp(90 - fillers * 3 - repeatedWordPenalty(answer) + structureBonus(answer)));
            paceScores.add(clamp(paceScore(words, durationSeconds, effectiveAnswers.size(), transcript)));
            fillerScores.add(clamp(100 - fillers * 12));
            completenessScores.add(clamp(completenessScore(words, questionWords, answer)));

            int eyeContactBase = cameraAvailable ? 70 : 45;
            if (cameraActive) {
                eyeContactBase += 10;
            }
            eyeContactScores.add(clamp(eyeContactBase + Math.min(10, words / 12) - fillers * 2));
            engagementScores.add(clamp((cameraActive ? 72 : 48) + Math.min(12, words / 10) + structureBonus(answer)));
            hesitationScores.add(clamp(100 - fillers * 10 - hesitationPenalty(words, durationSeconds)));

            keywordScores.add(clamp(keywordMatchScore(answer, question, roleKeywords, answerKeywords)));
            domainScores.add(clamp(keywordMatchScore(answer, request == null ? null : request.getJobRole(), roleKeywords, answerKeywords)));
            accuracyScores.add(clamp(technicalAccuracyScore(answer)));
            problemSolvingScores.add(clamp(problemSolvingScore(answer)));
            answerCompletenessScores.add(clamp(completenessScore(words, questionWords, answer)));

            timeScores.add(clamp(timeManagementScore(words, durationSeconds, effectiveAnswers.size())));
            organizationScores.add(clamp(organizationScore(answer)));
            etiquetteScores.add(clamp(interviewEtiquetteScore(answer)));
        }

        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        response.setGrammarScore(average(grammarScores));
        response.setSpeechClarityScore(average(clarityScores));
        response.setSpeakingPaceScore(average(paceScores));
        response.setFillerWordScore(average(fillerScores));
        response.setResponseCompletenessScore(average(completenessScores));
        response.setCommunicationScore(average(List.of(
                response.getGrammarScore(),
                response.getSpeechClarityScore(),
                response.getSpeakingPaceScore(),
                response.getFillerWordScore(),
                response.getResponseCompletenessScore()
        )));

        int eyeContact = request != null && request.getEyeContactPercentage() != null
                ? clamp(request.getEyeContactPercentage())
                : average(eyeContactScores);
        int facialEngagement = request != null && request.getFacialEngagementScore() != null
                ? clamp(request.getFacialEngagementScore())
                : average(engagementScores);
        int responseHesitation = request != null && request.getResponseHesitationScore() != null
                ? clamp(request.getResponseHesitationScore())
                : average(hesitationScores);

        response.setEyeContactPercentage(eyeContact);
        response.setFacialEngagementScore(facialEngagement);
        response.setResponseHesitationScore(responseHesitation);
        int confidenceScore = average(List.of(eyeContact, facialEngagement, responseHesitation));
        if (!cameraAvailable || !microphoneAvailable || !microphoneActive) {
            confidenceScore = clamp(confidenceScore - 8);
        }
        response.setConfidenceScore(confidenceScore);

        response.setKeywordMatchingScore(average(keywordScores));
        response.setDomainRelevanceScore(average(domainScores));
        response.setTechnicalAccuracyScore(average(accuracyScores));
        response.setProblemSolvingScore(average(problemSolvingScores));
        response.setAnswerCompletenessScore(average(answerCompletenessScores));
        response.setTechnicalScore(average(List.of(
                response.getKeywordMatchingScore(),
                response.getDomainRelevanceScore(),
                response.getTechnicalAccuracyScore(),
                response.getProblemSolvingScore(),
                response.getAnswerCompletenessScore()
        )));

        response.setTimeManagementScore(average(timeScores));
        response.setAnswerOrganizationScore(average(organizationScores));
        response.setInterviewEtiquetteScore(average(etiquetteScores));
        response.setProfessionalismScore(average(List.of(
                response.getTimeManagementScore(),
                response.getAnswerOrganizationScore(),
                response.getInterviewEtiquetteScore()
        )));

        response.setOverallScore(weightedOverall(
                response.getCommunicationScore(),
                response.getConfidenceScore(),
                response.getTechnicalScore(),
                response.getProfessionalismScore()
        ));
        response.setRating(normalizeRating(null, response.getOverallScore()));
        response.setStrengths(buildStrengths(response));
        response.setWeaknesses(buildWeaknesses(response, transcript, cameraAvailable, microphoneAvailable, microphoneActive));
        response.setImprovementSuggestions(buildImprovementSuggestions(response, transcript, cameraAvailable));
        response.setPracticeRecommendations(buildPracticeRecommendations(response));
        response.setLearningResources(buildLearningResources(request));
        response.setFeedback(buildFeedback(response));
        response.setRecommendation(buildRecommendation(response));
        return response;
    }

    private List<String> buildStrengths(InterviewEvaluationResponse response) {
        List<String> strengths = new ArrayList<>();
        if (response.getTechnicalScore() >= 75) {
            strengths.add("Technical explanations are relevant to the job role.");
        }
        if (response.getCommunicationScore() >= 75) {
            strengths.add("Communication is clear and easy to follow.");
        }
        if (response.getConfidenceScore() >= 70) {
            strengths.add("Confidence indicators suggest strong interview presence.");
        }
        if (response.getProfessionalismScore() >= 70) {
            strengths.add("Professionalism and answer organization are solid.");
        }
        if (strengths.isEmpty()) {
            strengths.add("Candidate provided enough data for a full evaluation.");
        }
        return strengths;
    }

    private List<String> buildWeaknesses(InterviewEvaluationResponse response,
                                         String transcript,
                                         boolean cameraAvailable,
                                         boolean microphoneAvailable,
                                         boolean microphoneActive) {
        List<String> weaknesses = new ArrayList<>();
        if (response.getCommunicationScore() < 70) {
            weaknesses.add("Communication needs stronger pacing, grammar, or clarity.");
        }
        if (response.getConfidenceScore() < 70) {
            weaknesses.add("Confidence signals are limited or inconsistent in the live session.");
        }
        if (response.getTechnicalScore() < 70) {
            weaknesses.add("Technical depth and keyword coverage need more detail.");
        }
        if (response.getProfessionalismScore() < 70) {
            weaknesses.add("Answer structure and interview etiquette can be improved.");
        }
        if (transcript.isBlank()) {
            weaknesses.add("No transcript text was available for speech-based analysis.");
        }
        if (!cameraAvailable || !microphoneAvailable || !microphoneActive) {
            weaknesses.add("Camera or microphone telemetry was missing, so confidence was estimated conservatively.");
        }
        if (weaknesses.isEmpty()) {
            weaknesses.add("No critical weaknesses detected from the available interview signals.");
        }
        return weaknesses;
    }

    private List<String> buildImprovementSuggestions(InterviewEvaluationResponse response, String transcript, boolean cameraAvailable) {
        List<String> suggestions = new ArrayList<>();
        if (response.getGrammarScore() < 75) {
            suggestions.add("Use shorter sentences and review grammar before answering.");
        }
        if (response.getSpeakingPaceScore() < 75) {
            suggestions.add("Slow down slightly and keep a steadier speaking pace.");
        }
        if (response.getConfidenceScore() < 75) {
            suggestions.add("Practice on-camera mock interviews to improve eye contact and comfort.");
        }
        if (response.getTechnicalScore() < 75) {
            suggestions.add("Use a structure like context, approach, implementation, and outcome.");
        }
        if (response.getProfessionalismScore() < 75) {
            suggestions.add("Open with a concise acknowledgement and close with a summary sentence.");
        }
        if (!cameraAvailable) {
            suggestions.add("Enable webcam access to improve confidence analysis fidelity.");
        }
        if (!transcript.isBlank() && countWords(transcript) < 60) {
            suggestions.add("Expand answers with examples and trade-offs instead of one-line responses.");
        }
        if (suggestions.isEmpty()) {
            suggestions.add("Keep practicing harder questions to continue improving the overall score.");
        }
        return suggestions;
    }

    private List<String> buildPracticeRecommendations(InterviewEvaluationResponse response) {
        List<String> recommendations = new ArrayList<>();
        recommendations.add("Run timed mock interviews and keep each answer focused.");
        recommendations.add("Practice the STAR method for behavioral questions and structured reasoning for technical ones.");
        if (response.getConfidenceScore() < 70) {
            recommendations.add("Record answers on camera and review eye contact and posture.");
        }
        if (response.getTechnicalScore() < 70) {
            recommendations.add("Work through role-specific question banks and explain answers aloud.");
        }
        return recommendations;
    }

    private List<String> buildLearningResources(InterviewEvaluationRequest request) {
        String role = safeText(request == null ? null : request.getJobRole());
        String interviewType = safeText(request == null ? null : request.getInterviewType());
        List<String> resources = new ArrayList<>();
        resources.add("STAR method interview guide");
        resources.add("Timed mock interview transcripts");
        resources.add(role.isBlank() ? "Role-specific interview handbook" : role + " interview preparation notes");
        resources.add(interviewType.isBlank() ? "Technical and HR interview fundamentals" : interviewType + " interview fundamentals");
        return resources;
    }

    private List<String> buildFeedback(InterviewEvaluationResponse response) {
        return List.of(
                "Overall score: " + response.getOverallScore() + "/100",
                "Rating: " + response.getRating(),
                "Communication: " + response.getCommunicationScore() + "/100",
                "Confidence: " + response.getConfidenceScore() + "/100",
                "Technical: " + response.getTechnicalScore() + "/100",
                "Professionalism: " + response.getProfessionalismScore() + "/100"
        );
    }

    private String buildRecommendation(InterviewEvaluationResponse response) {
        if (response.getOverallScore() >= 90) {
            return "Excellent interview performance with strong readiness for the next stage.";
        }
        if (response.getOverallScore() >= 75) {
            return "Good interview performance. A little more polish on delivery and depth will raise the result further.";
        }
        if (response.getOverallScore() >= 60) {
            return "Average interview performance. Focus on structure, confidence, and technical depth.";
        }
        if (response.getOverallScore() >= 45) {
            return "Needs improvement. The next practice cycle should focus on complete answers and steady delivery.";
        }
        return "Poor interview performance. More repetition with guided mock interviews is recommended before the next attempt.";
    }

    private String buildPrompt(InterviewEvaluationRequest request) {
        List<String> questions = request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request.getAnswers() == null ? List.of() : request.getAnswers();
        int pairCount = Math.max(questions.size(), answers.size());

        StringBuilder pairsBuilder = new StringBuilder();
        for (int i = 0; i < pairCount; i++) {
            String question = i < questions.size() ? safeText(questions.get(i)) : "General interview question";
            String answer = i < answers.size() ? safeText(answers.get(i)) : "No answer provided.";
            if (question.isBlank()) {
                continue;
            }
            pairsBuilder.append("Q").append(i + 1).append(": ").append(question).append("\n");
            pairsBuilder.append("A").append(i + 1).append(": ").append(answer.isEmpty() ? "No answer provided." : answer).append("\n\n");
        }

        return "You are an expert interview evaluator. Evaluate the candidate using only the provided answers and telemetry. Return ONLY valid JSON. "
                + "Use exactly this schema: "
                + "{\"overallScore\":0,\"communicationScore\":0,\"confidenceScore\":0,\"technicalScore\":0,\"professionalismScore\":0,"
                + "\"grammarScore\":0,\"speechClarityScore\":0,\"speakingPaceScore\":0,\"fillerWordScore\":0,\"responseCompletenessScore\":0,"
                + "\"eyeContactPercentage\":0,\"facialEngagementScore\":0,\"responseHesitationScore\":0,\"keywordMatchingScore\":0,"
                + "\"domainRelevanceScore\":0,\"technicalAccuracyScore\":0,\"problemSolvingScore\":0,\"answerCompletenessScore\":0,"
                + "\"timeManagementScore\":0,\"answerOrganizationScore\":0,\"interviewEtiquetteScore\":0,\"strengths\":[],\"weaknesses\":[],"
                + "\"improvementSuggestions\":[],\"practiceRecommendations\":[],\"learningResources\":[],\"feedback\":[],\"recommendation\":\"\",\"rating\":\"Good\"}. "
                + "Scoring rules: all scores must be integers between 0 and 100. Overall score must use Communication 30%, Confidence 25%, Technical 30%, Professionalism 15%. "
                + "If browser telemetry is missing, infer conservatively and still return a complete JSON object. "
                + "Input metadata: Job Role=" + safeText(request.getJobRole()) + ", "
                + "Interview Type=" + safeText(request.getInterviewType()) + ", "
                + "Difficulty=" + safeText(request.getDifficulty()) + ", "
                + "Transcript=" + safeText(request.getTranscript()) + ", "
                + "DurationSeconds=" + safeNumber(request.getDurationSeconds()) + ", "
                + "CameraAvailable=" + safeBoolean(request.getCameraAvailable()) + ", "
                + "MicrophoneAvailable=" + safeBoolean(request.getMicrophoneAvailable()) + ", "
                + "CameraActive=" + safeBoolean(request.getCameraActive()) + ", "
                + "MicrophoneActive=" + safeBoolean(request.getMicrophoneActive()) + ", "
                + "EyeContactPercentage=" + safeNumber(request.getEyeContactPercentage()) + ", "
                + "FacialEngagementScore=" + safeNumber(request.getFacialEngagementScore()) + ", "
                + "ResponseHesitationScore=" + safeNumber(request.getResponseHesitationScore()) + ". "
                + "Question and Answer pairs:\n"
                + pairsBuilder;
    }

    private int weightedOverall(int communication, int confidence, int technical, int professionalism) {
        return clamp(Math.round((communication * 30f + confidence * 25f + technical * 30f + professionalism * 15f) / 100f));
    }

    private Set<String> keywordSet(String... sources) {
        Set<String> keywords = new HashSet<>();
        if (sources == null) {
            return keywords;
        }
        for (String source : sources) {
            if (source == null || source.isBlank()) {
                continue;
            }
            keywords.addAll(Arrays.stream(source.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
                    .filter(token -> token.length() > 2)
                    .collect(Collectors.toSet()));
        }
        return keywords;
    }

    private int keywordMatchScore(String answer, String question, Set<String>... keywordSets) {
        Set<String> tokens = keywordSet(answer, question);
        if (tokens.isEmpty()) {
            return 0;
        }
        Set<String> allKeywords = new HashSet<>();
        if (keywordSets != null) {
            for (Set<String> keywordSet : keywordSets) {
                if (keywordSet != null) {
                    allKeywords.addAll(keywordSet);
                }
            }
        }
        if (allKeywords.isEmpty()) {
            return clamp(55 + Math.min(25, countWords(answer) * 2));
        }
        long matches = tokens.stream().filter(allKeywords::contains).count();
        return clamp((int) Math.round((matches * 100.0) / Math.max(4, allKeywords.size())));
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return (int) Arrays.stream(text.trim().split("\\s+")).filter(item -> !item.isBlank()).count();
    }

    private int countFillerWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        String lowered = text.toLowerCase(Locale.ROOT);
        int count = 0;
        for (String filler : List.of("um", "uh", "like", "you know", "basically", "actually", "literally", "sort of", "kind of", "hmm")) {
            int index = 0;
            while ((index = lowered.indexOf(filler, index)) >= 0) {
                count++;
                index += filler.length();
            }
        }
        return count;
    }

    private int punctuationPenalty(String answer) {
        if (answer == null || answer.isBlank()) {
            return 15;
        }
        int penalty = 0;
        if (!answer.endsWith(".") && !answer.endsWith("!") && !answer.endsWith("?")) {
            penalty += 5;
        }
        if (answer.contains("!!") || answer.contains("??")) {
            penalty += 3;
        }
        return penalty;
    }

    private int shortAnswerPenalty(int words) {
        if (words == 0) {
            return 20;
        }
        if (words < 4) {
            return 15;
        }
        if (words < 8) {
            return 8;
        }
        return 0;
    }

    private int repeatedWordPenalty(String answer) {
        if (answer == null || answer.isBlank()) {
            return 10;
        }
        int penalty = 0;
        String lowered = answer.toLowerCase(Locale.ROOT);
        if (lowered.contains(" and and ") || lowered.contains(" like like ")) {
            penalty += 4;
        }
        if (lowered.contains(", and ")) {
            penalty += 2;
        }
        return penalty;
    }

    private int structureBonus(String answer) {
        if (answer == null || answer.isBlank()) {
            return 0;
        }
        String lowered = answer.toLowerCase(Locale.ROOT);
        int bonus = 0;
        if (lowered.contains("first") || lowered.contains("second") || lowered.contains("then")) {
            bonus += 6;
        }
        if (lowered.contains("for example") || lowered.contains("example")) {
            bonus += 4;
        }
        if (lowered.contains("in summary") || lowered.contains("to summarize")) {
            bonus += 4;
        }
        return bonus;
    }

    private int completenessScore(int words, int questionWords, String answer) {
        if (words == 0) {
            return 0;
        }
        int score = 30 + words * 3;
        if (words >= questionWords * 2) {
            score += 10;
        }
        if (answer != null && answer.toLowerCase(Locale.ROOT).contains("because")) {
            score += 5;
        }
        return score;
    }

    private int hesitationPenalty(int words, int durationSeconds) {
        if (words == 0) {
            return 25;
        }
        if (durationSeconds <= 0) {
            return 0;
        }
        double wpm = words / Math.max(1.0, durationSeconds / 60.0);
        if (wpm < 60) {
            return 18;
        }
        if (wpm < 85) {
            return 8;
        }
        if (wpm > 220) {
            return 12;
        }
        return 0;
    }

    private int paceScore(int words, int durationSeconds, int totalAnswers, String transcript) {
        if (words == 0) {
            return 0;
        }
        int transcriptWords = countWords(transcript);
        int effectiveWords = transcriptWords > 0 ? transcriptWords : words;
        if (durationSeconds <= 0) {
            return clamp(75 + Math.min(15, effectiveWords / 8));
        }
        double wpm = effectiveWords / Math.max(1.0, durationSeconds / 60.0);
        if (wpm < 70) {
            return clamp((int) (50 + wpm / 2));
        }
        if (wpm <= 160) {
            return clamp(95 - Math.abs(110 - (int) wpm) / 2);
        }
        return clamp(80 - (int) ((wpm - 160) / 2));
    }

    private int technicalAccuracyScore(String answer) {
        if (answer == null || answer.isBlank()) {
            return 0;
        }
        String lowered = answer.toLowerCase(Locale.ROOT);
        int score = 40;
        for (String token : List.of("api", "database", "algorithm", "architecture", "scalable", "security", "testing", "performance", "optimization", "trade-off", "design pattern", "system")) {
            if (lowered.contains(token)) {
                score += 7;
            }
        }
        return score;
    }

    private int problemSolvingScore(String answer) {
        if (answer == null || answer.isBlank()) {
            return 0;
        }
        String lowered = answer.toLowerCase(Locale.ROOT);
        int score = 40;
        for (String token : List.of("because", "therefore", "approach", "solve", "handle", "optimize", "debug", "root cause", "trade-off", "first", "then")) {
            if (lowered.contains(token)) {
                score += 6;
            }
        }
        return score;
    }

    private int organizationScore(String answer) {
        if (answer == null || answer.isBlank()) {
            return 0;
        }
        String lowered = answer.toLowerCase(Locale.ROOT);
        int score = 55;
        if (lowered.contains("first") || lowered.contains("second") || lowered.contains("then")) {
            score += 15;
        }
        if (lowered.contains("in summary") || lowered.contains("to summarize")) {
            score += 10;
        }
        if (lowered.contains("for example")) {
            score += 5;
        }
        return score;
    }

    private int interviewEtiquetteScore(String answer) {
        if (answer == null || answer.isBlank()) {
            return 45;
        }
        String lowered = answer.toLowerCase(Locale.ROOT);
        int score = 65;
        if (lowered.contains("thank you") || lowered.contains("appreciate")) {
            score += 10;
        }
        if (lowered.contains("please") || lowered.contains("excuse me")) {
            score += 5;
        }
        if (lowered.contains("sorry")) {
            score += 2;
        }
        return score;
    }

    private int timeManagementScore(int words, int durationSeconds, int totalAnswers) {
        if (words == 0) {
            return 0;
        }
        if (durationSeconds <= 0) {
            return clamp(78 - Math.max(0, words - 160) / 5);
        }
        double averageSeconds = Math.max(1.0, durationSeconds / Math.max(1.0, totalAnswers));
        if (averageSeconds < 35) {
            return 70;
        }
        if (averageSeconds <= 120) {
            return 92;
        }
        return 65;
    }

    private List<String> normalizeList(List<String> items) {
        List<String> safeItems = new ArrayList<>();
        if (items == null) {
            return safeItems;
        }
        for (String item : items) {
            String value = safeText(item);
            if (!value.isEmpty()) {
                safeItems.add(value);
            }
        }
        return safeItems;
    }

    private int average(List<Integer> values) {
        if (values == null || values.isEmpty()) {
            return 0;
        }
        int sum = 0;
        int count = 0;
        for (Integer value : values) {
            if (value == null) {
                continue;
            }
            sum += clamp(value);
            count++;
        }
        return count == 0 ? 0 : clamp(Math.round((float) sum / count));
    }

    private int clamp(int value) {
        if (value < 0) {
            return 0;
        }
        return Math.min(value, 100);
    }

    private String normalizeRating(String rating, int overallScore) {
        String trimmed = safeText(rating);
        if (!trimmed.isBlank()) {
            return trimmed;
        }
        if (overallScore >= 90) {
            return "Excellent";
        }
        if (overallScore >= 75) {
            return "Good";
        }
        if (overallScore >= 60) {
            return "Average";
        }
        if (overallScore >= 45) {
            return "Needs Improvement";
        }
        return "Poor";
    }

    private String safeText(String text) {
        return text == null ? "" : text.trim();
    }

    private String safeBoolean(Boolean value) {
        return Boolean.TRUE.equals(value) ? "true" : "false";
    }

    private String safeNumber(Integer value) {
        return value == null ? "0" : String.valueOf(value);
    }
}
