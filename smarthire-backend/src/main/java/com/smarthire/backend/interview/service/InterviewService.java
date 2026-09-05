package com.smarthire.backend.interview.service;

import java.util.Locale;

import com.smarthire.backend.interview.ai.InterviewEvaluationGeminiClient;
import com.smarthire.backend.interview.ai.InterviewFollowUpGeminiClient;
import com.smarthire.backend.interview.ai.InterviewGeminiClient;
import com.smarthire.backend.interview.ai.InterviewCareerRoadmapGeminiClient;
import com.smarthire.backend.interview.dto.CandidateAssessmentResultRequest;
import com.smarthire.backend.interview.dto.CandidateEnhancementSnapshotResponse;
import com.smarthire.backend.interview.dto.CandidateNotificationRequest;
import com.smarthire.backend.interview.dto.CandidateProfileCompletionRequest;
import com.smarthire.backend.interview.dto.CareerRoadmapRequest;
import com.smarthire.backend.interview.dto.CareerRoadmapResponse;
import com.smarthire.backend.interview.dto.InterviewFollowUpRequest;
import com.smarthire.backend.interview.dto.InterviewFollowUpResponse;
import com.smarthire.backend.interview.dto.InterviewHistoryDetailResponse;
import com.smarthire.backend.interview.dto.InterviewHistorySummaryResponse;
import com.smarthire.backend.interview.dto.InterviewEvaluationRequest;
import com.smarthire.backend.interview.dto.InterviewEvaluationResponse;
import com.smarthire.backend.interview.dto.InterviewQuestionDto;
import com.smarthire.backend.interview.dto.InterviewRequest;
import com.smarthire.backend.interview.dto.InterviewResponse;
import com.smarthire.backend.interview.dto.InterviewQuestionGenerationResult;
import com.smarthire.backend.interview.dto.InterviewReportResponse;
import com.smarthire.backend.interview.dto.InterviewSessionSnapshotRequest;
import com.smarthire.backend.interview.dto.InterviewSessionStepDto;
import com.smarthire.backend.interview.entity.InterviewAnswer;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.entity.QuestionBankQuestion;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.exception.InterviewException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.interview.repository.InterviewAnswerRepository;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.QuestionBankQuestionRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final InterviewAnswerRepository interviewAnswerRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;
    private final InterviewGeminiClient interviewGeminiClient;
    private final InterviewFollowUpGeminiClient interviewFollowUpGeminiClient;
    private final InterviewEvaluationGeminiClient interviewEvaluationGeminiClient;
    private final InterviewCareerRoadmapGeminiClient interviewCareerRoadmapGeminiClient;
    private final QuestionBankQuestionRepository questionBankQuestionRepository;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;

    public InterviewService(InterviewRepository interviewRepository,
                            InterviewAnswerRepository interviewAnswerRepository,
                            InterviewEvaluationRepository interviewEvaluationRepository,
                            InterviewGeminiClient interviewGeminiClient,
                            InterviewFollowUpGeminiClient interviewFollowUpGeminiClient,
                            InterviewEvaluationGeminiClient interviewEvaluationGeminiClient,
                            InterviewCareerRoadmapGeminiClient interviewCareerRoadmapGeminiClient,
                            QuestionBankQuestionRepository questionBankQuestionRepository,
                            ObjectMapper objectMapper,
                            UserRepository userRepository,
                            ResumeRepository resumeRepository) {
        this.interviewRepository = interviewRepository;
        this.interviewAnswerRepository = interviewAnswerRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
        this.interviewGeminiClient = interviewGeminiClient;
        this.interviewFollowUpGeminiClient = interviewFollowUpGeminiClient;
        this.interviewEvaluationGeminiClient = interviewEvaluationGeminiClient;
        this.interviewCareerRoadmapGeminiClient = interviewCareerRoadmapGeminiClient;
        this.questionBankQuestionRepository = questionBankQuestionRepository;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
    }

    public Interview createInterview(InterviewRequest request) {
        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null) {
            throw new InterviewException("Authenticated user is required to create an interview.");
        }

        Interview interview = new Interview(
                authenticatedUserId,
                request.getInterviewType(),
                request.getDomain(),
                request.getDifficulty(),
            normalizeValue(request.getExperienceLevel(), "Not provided"),
            normalizeValue(request.getJobRole(), "Not provided")
        );
        return interviewRepository.save(interview);
    }

    public List<Interview> getAllInterviews() {
        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null) {
            return List.of();
        }
        return interviewRepository.findByUserId(authenticatedUserId);
    }

    public Interview getInterviewById(Long id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new InterviewException("Interview not found"));

        Long authenticatedUserId = currentUserId();
        boolean privileged = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null
                && org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .anyMatch(a -> "ROLE_RECRUITER".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
        if (authenticatedUserId == null || (!privileged && !authenticatedUserId.equals(interview.getUserId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview not found");
        }

        return interview;
    }

    public Interview updateInterview(Long id, InterviewRequest request) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new InterviewException("Interview not found"));

        interview.setInterviewType(request.getInterviewType());
        interview.setDomain(request.getDomain());
        interview.setDifficulty(request.getDifficulty());
        interview.setExperienceLevel(normalizeValue(request.getExperienceLevel(), interview.getExperienceLevel()));
        interview.setJobRole(normalizeValue(request.getJobRole(), interview.getJobRole()));

        return interviewRepository.save(interview);
    }

    public void deleteInterview(Long id) {
        Interview interview = interviewRepository.findById(id)
                .orElseThrow(() -> new InterviewException("Interview not found"));

        interviewRepository.delete(interview);
    }

        public List<InterviewHistorySummaryResponse> getInterviewHistory(Long userId) {
        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null || !authenticatedUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview history not found");
        }

        List<Interview> interviews = interviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Long> interviewIds = interviews.stream().map(Interview::getId).collect(Collectors.toList());

        Map<Long, InterviewEvaluation> evaluationByInterviewId = new HashMap<>();
        if (!interviewIds.isEmpty()) {
            interviewEvaluationRepository.findByInterviewIdIn(interviewIds)
                .forEach(evaluation -> evaluationByInterviewId.put(evaluation.getInterviewId(), evaluation));
        }

        return interviews
            .stream()
            .map(interview -> toHistorySummary(interview, evaluationByInterviewId.get(interview.getId())))
            .collect(Collectors.toList());
        }

        public InterviewHistoryDetailResponse getInterviewHistoryDetail(Long userId, Long interviewId) {
        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null || !authenticatedUserId.equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview history not found");
        }

        Interview interview = interviewRepository.findById(interviewId)
            .orElseThrow(() -> new InterviewException("Interview not found"));

        if (!interview.getUserId().equals(userId)) {
            throw new InterviewException("Interview does not belong to this user");
        }

        InterviewHistoryDetailResponse response = new InterviewHistoryDetailResponse();
        response.setInterviewId(interview.getId());
        response.setInterviewDate(interview.getCreatedAt());
        response.setJobRole(normalizeValue(interview.getJobRole(), "Not provided"));

        List<InterviewHistoryDetailResponse.AnswerItem> answerItems = interviewAnswerRepository
            .findByInterviewIdOrderByIdAsc(interviewId)
            .stream()
            .map(answer -> new InterviewHistoryDetailResponse.AnswerItem(
                normalizeValue(answer.getQuestion(), ""),
                normalizeValue(answer.getAnswer(), "No answer provided."),
                normalizeValue(answer.getCategory(), "General"),
                normalizeValue(answer.getDifficulty(), "Not provided")
            ))
            .collect(Collectors.toList());
        response.setAnswers(answerItems);

        interviewEvaluationRepository.findByInterviewId(interviewId)
            .ifPresent(evaluation -> {
                InterviewHistoryDetailResponse.EvaluationSummary evaluationSummary =
                    new InterviewHistoryDetailResponse.EvaluationSummary(
                        evaluation.getOverallScore(),
                        evaluation.getTechnicalScore(),
                        safeNumber(evaluation.getCommunicationScore()),
                        safeNumber(evaluation.getConfidenceScore()),
                        evaluation.getProblemSolvingScore(),
                        safeNumber(evaluation.getProfessionalismScore()),
                        normalizeValue(evaluation.getRating(), "Not available"),
                        normalizeValue(evaluation.getRecommendation(), "Not available"),
                        evaluation.getEvaluationDate()
                    );
                int[] objectiveMetrics = calculateObjectiveMetrics(interviewId);
            evaluationSummary.setObjectiveTotalQuestions(objectiveMetrics[0]);
            evaluationSummary.setObjectiveAnsweredQuestions(objectiveMetrics[1]);
            evaluationSummary.setObjectiveCorrectAnswers(objectiveMetrics[2]);
            evaluationSummary.setObjectiveAttemptedAccuracy(objectiveMetrics[3]);
            response.setEvaluation(evaluationSummary);
                response.setFeedback(parseFeedback(evaluation.getFeedback()));
        response.setProctoringViolationCount(evaluation.getProctoringViolationCount());
        response.setMalpracticeTerminated(evaluation.isMalpracticeTerminated());
        response.setMalpracticeReason(evaluation.getMalpracticeReason());
        response.setProctoringViolationsJson(evaluation.getProctoringViolationsJson());
            });

        return response;
    }

    public InterviewResponse startInterview(InterviewRequest request) {
        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null) {
            throw new InterviewException("Authenticated user is required to create an interview.");
        }
        Interview interview = createInterview(request);

        String resumeContext = loadResumeContext(request, authenticatedUserId);
        InterviewQuestionGenerationResult generationResult = interviewGeminiClient.generateQuestionsWithSource(
                request.getJobRole(),
                request.getInterviewType(),
                request.getDomain(),
                request.getExperienceLevel(),
                request.getDifficulty(),
                resumeContext
        );

        List<InterviewQuestionDto> questions = generationResult.getQuestions();
        if (questions == null || questions.isEmpty()) {
            throw new InterviewException("No interview questions are available.");
        }

        // Persist generated MCQs server-side so their hidden answer keys can be used for
        // deterministic evaluation after the browser submits only the selected option.
        persistGeneratedMcqQuestions(request, questions);

        return new InterviewResponse(
                interview.getId(),
                "SUCCESS",
                generationResult.getSourceMessage(),
                questions
        );
    }

    private String loadResumeContext(InterviewRequest request, Long authenticatedUserId) {
        String interviewType = normalizeValue(request.getInterviewType(), "Technical");
        boolean resumeBased = interviewType.toLowerCase(java.util.Locale.ROOT).contains("resume");
        if (!resumeBased && request.getResumeId() == null) {
            return "";
        }

        Resume resume;
        if (request.getResumeId() != null) {
            resume = resumeRepository.findById(request.getResumeId())
                    .orElseThrow(() -> new InterviewException("Selected resume was not found."));
            if (resume.getUserId() == null || !resume.getUserId().equals(authenticatedUserId)) {
                throw new InterviewException("You do not have access to the selected resume.");
            }
        } else {
            resume = resumeRepository.findTopByUserIdOrderByUpdatedAtDesc(authenticatedUserId)
                    .orElseThrow(() -> new InterviewException("Upload and analyze a resume before starting a resume-based interview."));
        }

        StringBuilder context = new StringBuilder();
        context.append("RESUME PROFILE\n");
        appendResumeField(context, "Filename", resume.getFileName());
        appendResumeField(context, "Skills", resume.getSkills());
        appendResumeField(context, "Technologies", resume.getTechnologies());
        appendResumeField(context, "Experience", resume.getExperience());
        appendResumeField(context, "Education", resume.getEducation());
        appendResumeField(context, "Summary", resume.getSummary());
        appendResumeField(context, "Projects/Resume Text", resume.getExtractedText());

        String value = context.toString().trim();
        if (value.length() > 12000) {
            value = value.substring(0, 12000) + "\n[Resume context truncated for prompt size]";
        }
        return value;
    }

    private void appendResumeField(StringBuilder context, String label, String value) {
        if (value != null && !value.isBlank()) {
            context.append(label).append(": ").append(value.trim()).append("\n");
        }
    }

    private void persistGeneratedMcqQuestions(InterviewRequest request, List<InterviewQuestionDto> questions) {
        if (questions == null || questions.isEmpty()) return;
        List<QuestionBankQuestion> generated = new ArrayList<>();
        for (InterviewQuestionDto dto : questions) {
            if (dto == null || !"MCQ".equalsIgnoreCase(dto.getAnswerMode())
                    || dto.getOptions() == null || dto.getOptions().size() < 4
                    || dto.getCorrectAnswer() == null || dto.getCorrectAnswer().isBlank()) {
                continue;
            }
            if (questionBankQuestionRepository.findByQuestionIgnoreCase(dto.getQuestion()).isPresent()) continue;
            try {
                String optionsJson = objectMapper.writeValueAsString(dto.getOptions());
                generated.add(new QuestionBankQuestion(
                        normalizeValue(request.getJobRole(), "Software Engineer"),
                        normalizeValue(request.getInterviewType(), "Technical"),
                        normalizeValue(request.getDomain(), "General"),
                        normalizeValue(request.getExperienceLevel(), "Mid"),
                        normalizeValue(dto.getDifficulty(), normalizeValue(request.getDifficulty(), "Medium")),
                        normalizeValue(dto.getCategory(), "Technical"),
                        dto.getQuestion(), optionsJson, "MCQ", dto.getCorrectAnswer()));
            } catch (Exception ignored) {
                // A generated question is still usable in the current interview even if persistence fails.
            }
        }
        if (!generated.isEmpty()) questionBankQuestionRepository.saveAll(generated);
    }

    public InterviewFollowUpResponse generateFollowUpQuestion(InterviewFollowUpRequest request) {
        if (request == null) {
            throw new InterviewException("Follow-up request is required.");
        }
        if (request.getQuestion() == null || request.getQuestion().isBlank()) {
            throw new InterviewException("Current interview question is required.");
        }
        if (request.getCandidateAnswer() == null || request.getCandidateAnswer().isBlank()) {
            throw new InterviewException("Candidate answer is required to generate follow-up.");
        }

        return interviewFollowUpGeminiClient.generateFollowUpQuestion(request);
    }

    @Transactional
    public InterviewEvaluationResponse evaluateInterview(InterviewEvaluationRequest request) {
        if (request == null) {
            throw new InterviewException("Evaluation request is required.");
        }
        if (request.getInterviewId() == null) {
            throw new InterviewException("Interview ID is required for evaluation.");
        }
        Interview interview = interviewRepository.findById(request.getInterviewId())
                .orElseThrow(() -> new InterviewException("Interview not found"));
        boolean aptitudeAssessment = interview.getInterviewType() != null
                && interview.getInterviewType().toLowerCase(Locale.ROOT).contains("aptitude");

        if (request.getQuestions() == null) {
            request.setQuestions(List.of());
        }
        if (request.getAnswers() == null) {
            request.setAnswers(List.of());
        }

        int totalQuestions = request.getQuestions() == null ? 0 : request.getQuestions().size();
        int answeredQuestions = countAnsweredQuestions(request.getAnswers());

        InterviewEvaluationResponse evaluationResponse;
        if (totalQuestions > 0 && answeredQuestions == 0) {
            evaluationResponse = buildNotAttemptedEvaluation(totalQuestions);
        } else if (isAllStoredMcqQuestions(request.getQuestions())) {
            // Objective interviews are scored deterministically from the stored answer key.
            // Do not call Gemini for the numeric score; this prevents subjective drift.
            evaluationResponse = buildDeterministicMcqEvaluation(request, totalQuestions, answeredQuestions, aptitudeAssessment);
        } else {
            evaluationResponse = interviewEvaluationGeminiClient.evaluateInterview(request);
            evaluationResponse = applyEvaluationGuards(request, evaluationResponse, totalQuestions, answeredQuestions);
        }

        // Always apply measured speech/live telemetry after the base evaluator.
        // This is intentionally outside the MCQ/open-answer branch: a live voice
        // answer is still valid communication evidence even when the interview
        // contains objective questions.
        evaluationResponse = applyLiveCommunicationMetrics(request, evaluationResponse);
        enrichActionableModule7Feedback(request, evaluationResponse);

        evaluationResponse.setProctoringViolationCount(request.getProctoringViolationCount()==null?0:request.getProctoringViolationCount());
        evaluationResponse.setMalpracticeTerminated(Boolean.TRUE.equals(request.getMalpracticeTerminated()));
        evaluationResponse.setMalpracticeReason(request.getMalpracticeReason());
        evaluationResponse.setProctoringViolationsJson(request.getProctoringViolationsJson());
        saveInterviewSessionMetadata(request);
        saveInterviewAnswers(request);
        saveInterviewEvaluation(request.getInterviewId(), evaluationResponse);
        return evaluationResponse;
    }

    private InterviewEvaluationResponse applyLiveCommunicationMetrics(InterviewEvaluationRequest request, InterviewEvaluationResponse response) {
        if (response == null) response = new InterviewEvaluationResponse();
        int pronunciation = clampScore(request.getPronunciationScore() == null ? response.getPronunciationScore() : request.getPronunciationScore());
        int transcriptionConfidence = clampScore(request.getTranscriptionConfidence() == null ? response.getTranscriptionConfidence() : request.getTranscriptionConfidence());
        int grammarIssues = Math.max(0, request.getGrammarIssueCount() == null ? response.getGrammarIssueCount() : request.getGrammarIssueCount());
        if (pronunciation > 0) response.setPronunciationScore(pronunciation);
        if (transcriptionConfidence > 0) response.setTranscriptionConfidence(transcriptionConfidence);
        response.setGrammarIssueCount(grammarIssues);

        int grammar = response.getGrammarScore();
        int pace = response.getSpeakingPaceScore();
        int filler = response.getFillerWordScore();
        int completeness = response.getResponseCompletenessScore();
        int speechCommunication = 0;
        int storedSpeechPronunciation = pronunciation;
        try {
            if (request.getSpeechInsightsJson() != null && !request.getSpeechInsightsJson().isBlank()) {
                var node = objectMapper.readTree(request.getSpeechInsightsJson());
                speechCommunication = clampScore(node.path("communicationScore").asInt(0));
                storedSpeechPronunciation = clampScore(Math.max(storedSpeechPronunciation, node.path("pronunciationScore").asInt(0)));
                if (grammar <= 0) grammar = clampScore(node.path("grammarQuality").asInt(0));
                if (pace <= 0) pace = paceScoreFromWpm(node.path("speakingPaceWpm").asInt(0));
                if (filler <= 0) filler = clampScore(100 - (node.path("fillerWordCount").asInt(node.path("fillerWords").asInt(0)) * 8));
                if (completeness <= 0) completeness = completenessFromAverageResponse(node.path("averageResponseLength").asInt(0));
            }
        } catch (Exception ignored) { }
        if (storedSpeechPronunciation > 0) response.setPronunciationScore(storedSpeechPronunciation);
        if (transcriptionConfidence > 0 && response.getSpeechClarityScore() <= 0) response.setSpeechClarityScore(transcriptionConfidence);
        if (grammar <= 0) grammar = clampScore(95 - grammarIssues * 6);
        if (pace <= 0) pace = response.getSpeakingPaceScore();
        if (filler <= 0) filler = response.getFillerWordScore();
        if (completeness <= 0) completeness = response.getResponseCompletenessScore();
        int clarity = response.getSpeechClarityScore() > 0 ? response.getSpeechClarityScore() : storedSpeechPronunciation;

        int heuristicCommunication = clampScore(Math.round((grammar * 0.30f) + (Math.max(0, pace) * 0.20f)
                + (Math.max(0, filler) * 0.15f) + (Math.max(0, clarity) * 0.20f)
                + (Math.max(0, completeness) * 0.15f)));
        int communication = speechCommunication > 0 ? Math.round(speechCommunication * 0.60f + heuristicCommunication * 0.40f) : heuristicCommunication;
        response.setGrammarScore(grammar);
        response.setSpeakingPaceScore(pace);
        response.setFillerWordScore(filler);
        response.setResponseCompletenessScore(completeness);
        response.setSpeechClarityScore(clarity);
        response.setCommunicationScore(clampScore(communication));

        // Confidence score explicitly consumes actual eye-contact + emotion telemetry when available.
        int eye = response.getEyeContactPercentage();
        int engagement = response.getFacialEngagementScore();
        if (request.getLiveSignalsJson() != null && !request.getLiveSignalsJson().isBlank()) {
            try {
                var signalNode = objectMapper.readTree(request.getLiveSignalsJson());
                eye = clampScore(signalNode.path("summary").path("averageEyeContactPercentage").asInt(signalNode.path("eyeContact").path("eyeContactPercentage").asInt(eye)));
                engagement = clampScore(signalNode.path("summary").path("averageEmotionConfidence").asInt(signalNode.path("emotion").path("confidence").asInt(engagement)));
            } catch (Exception ignored) { }
        }
        response.setEyeContactPercentage(eye);
        response.setFacialEngagementScore(engagement);
        int hesitation = response.getResponseHesitationScore() > 0 ? response.getResponseHesitationScore() : 60;
        int attention = response.getAttentionScore();
        int speakingConfidence = response.getSpeakingConfidenceScore();
        if (request.getLiveSignalsJson() != null && !request.getLiveSignalsJson().isBlank()) {
            try {
                var signalNode = objectMapper.readTree(request.getLiveSignalsJson());
                attention = clampScore(signalNode.path("summary").path("averageAttentionScore").asInt(attention));
                if (attention <= 0) {
                    String level = signalNode.path("summary").path("dominantAttentionLevel").asText("");
                    attention = attentionScoreFromLevel(level);
                }
            } catch (Exception ignored) { }
        }
        if (request.getAttentionScore() != null && request.getAttentionScore() > 0) {
            attention = clampScore(request.getAttentionScore());
        }
        if (request.getSpeakingConfidenceScore() != null && request.getSpeakingConfidenceScore() > 0) {
            speakingConfidence = clampScore(request.getSpeakingConfidenceScore());
        }
        if (speakingConfidence <= 0) {
            speakingConfidence = clampScore(Math.round((Math.max(0, clarity) * 0.45f) + (Math.max(0, pace) * 0.25f) + (Math.max(0, hesitation) * 0.30f)));
        }
        response.setAttentionScore(attention);
        response.setSpeakingConfidenceScore(speakingConfidence);
        if (eye > 0 || engagement > 0 || hesitation > 0 || speakingConfidence > 0 || attention > 0) {
            response.setConfidenceScore(clampScore(Math.round(
                    eye * 0.20f + engagement * 0.20f + hesitation * 0.20f + speakingConfidence * 0.20f + attention * 0.20f)));
        }

        // Final rubric is always authoritative: Communication 30%, Confidence 25%,
        // Technical Relevance 30%, Professionalism 15%.
        int professionalCommunication = response.getProfessionalCommunicationScore() > 0
                ? response.getProfessionalCommunicationScore()
                : clampScore(Math.round((response.getAnswerOrganizationScore() + response.getInterviewEtiquetteScore()) / 2f));
        response.setProfessionalCommunicationScore(professionalCommunication);
        response.setProfessionalismScore(clampScore(Math.round((response.getTimeManagementScore() + response.getAnswerOrganizationScore() + professionalCommunication + response.getInterviewEtiquetteScore()) / 4f)));
        response.setOverallScore(clampScore(Math.round(
                response.getCommunicationScore() * 0.30f
                        + response.getConfidenceScore() * 0.25f
                        + response.getTechnicalScore() * 0.30f
                        + response.getProfessionalismScore() * 0.15f)));
        if (response.getOverallScore() > 0) {
            response.setRating(ratingForScore(response.getOverallScore()));
        }
        return response;
    }


    /**
     * Adds deterministic, score-grounded feedback to the model-generated feedback.
     * The goal is to make every weakness actionable: what is low, why it matters,
     * what to do next, what to practise, and which resource to use.
     */
    private void enrichActionableModule7Feedback(InterviewEvaluationRequest request, InterviewEvaluationResponse response) {
        if (response == null) return;
        String role = normalizeValue(request.getJobRole(), "the target role");
        String domain = normalizeValue(request.getDomain(), role);

        Set<String> strengths = new LinkedHashSet<>(safeList(response.getStrengths()));
        Set<String> weaknesses = new LinkedHashSet<>(safeList(response.getWeaknesses()));
        Set<String> improvements = new LinkedHashSet<>(safeList(response.getImprovementSuggestions()));
        Set<String> practice = new LinkedHashSet<>(safeList(response.getPracticeRecommendations()));
        Set<String> resources = new LinkedHashSet<>(safeList(response.getLearningResources()));

        addScoreEvidence("Speech clarity", response.getSpeechClarityScore(), 75,
                "Your speech clarity is strong at %d/100. Maintain clear pronunciation and finish each sentence before moving to the next point.",
                "Speech clarity is %d/100. Some responses may sound unclear or rushed, so focus on articulation and complete sentence delivery.",
                "Record 5 one-minute answers and replay them at 1x speed. Mark words that become unclear and repeat the same answer with slower articulation.",
                "NPR Training — voice and speaking practice: https://training.npr.org/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Grammar quality", response.getGrammarScore(), 75,
                "Grammar quality is %d/100, showing generally clear sentence construction.",
                "Grammar quality is %d/100. Repeated grammar issues reduce clarity and professional polish.",
                "Before each answer, use simple subject-verb-object sentences and spend 10 minutes reviewing the grammar mistakes from your transcript.",
                "British Council — English grammar: https://learnenglish.britishcouncil.org/grammar", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Filler-word control", response.getFillerWordScore(), 75,
                "Filler-word control is %d/100, indicating relatively clean verbal delivery.",
                "Filler-word control is %d/100. Frequent fillers can make otherwise good answers sound hesitant.",
                "Replace 'um', 'uh', 'like', and repeated starters with a 1–2 second silent pause before answering.",
                "Toastmasters — speaking practice: https://www.toastmasters.org/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Speaking pace", response.getSpeakingPaceScore(), 75,
                "Speaking pace is %d/100 and is generally suitable for an interview setting.",
                "Speaking pace is %d/100. Adjust your delivery toward a steady conversational pace and pause after key ideas.",
                "Practise 3 answers with a target of roughly 120–160 words per minute, then compare your pace with the previous attempt.",
                "Toastmasters — effective speaking resources: https://www.toastmasters.org/resources", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Response completeness", response.getResponseCompletenessScore(), 75,
                "Response completeness is %d/100, so your answers generally contain enough supporting detail.",
                "Response completeness is %d/100. Several answers likely need a clearer explanation, example, or conclusion.",
                "Use a three-part answer structure: direct answer → evidence/example → closing takeaway. Avoid stopping after the first sentence.",
                "Big Interview — interview answer structure: https://biginterview.com/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Eye-contact consistency", response.getEyeContactPercentage(), 75,
                "Eye-contact consistency is %d/100, supporting a confident on-camera presence.",
                "Eye-contact consistency is %d/100. Look toward the camera when delivering your main point instead of repeatedly looking away.",
                "Do 5 two-minute camera drills. Keep your eyes near the webcam while answering and review the recording after each drill.",
                "Microsoft Support — video meeting camera tips: https://support.microsoft.com/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Facial engagement", response.getFacialEngagementScore(), 75,
                "Facial engagement is %d/100, showing useful visual engagement during the interview.",
                "Facial engagement is %d/100. Aim for a natural, attentive expression that matches the tone of your answer.",
                "Record answers to 5 common questions and practise a relaxed neutral expression with a small natural smile where appropriate.",
                "Coursera — communication and presentation skills: https://www.coursera.org/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Response hesitation", response.getResponseHesitationScore(), 75,
                "Response hesitation is %d/100, indicating relatively steady answer delivery.",
                "Response hesitation is %d/100. Long pauses or uncertain starts can reduce perceived confidence.",
                "Use the 3-second rule: think silently for up to three seconds, then begin with a direct sentence instead of filler words.",
                "Big Interview — mock interview practice: https://biginterview.com/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Speaking confidence", response.getSpeakingConfidenceScore(), 75,
                "Speaking confidence is %d/100, supporting a composed verbal delivery.",
                "Speaking confidence is %d/100. Strengthen your opening sentence, reduce hesitation, and finish statements decisively.",
                "Practise a 30-second self-introduction and 5 role-specific answers every day while maintaining steady pace and eye contact.",
                "Google Career Certificates — career communication resources: https://grow.google/certificates/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Attention level", response.getAttentionScore(), 75,
                "Attention level is %d/100, indicating consistent interview focus.",
                "Attention level is %d/100. Reduce visual distractions and keep your focus on the interviewer/camera throughout the answer.",
                "Run one 10-minute distraction-free mock interview with notifications disabled and review moments where attention dropped.",
                "Microsoft Learn — focused remote-work guidance: https://learn.microsoft.com/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Technical accuracy", response.getTechnicalAccuracyScore(), 75,
                "Technical accuracy is %d/100 for %s, showing sound technical reasoning.",
                "Technical accuracy is %d/100 for %s. Review core concepts and explain why your proposed solution works, not only what it does.",
                "For 5 %s questions, write the key concept, explain the mechanism in simple terms, and state one trade-off or limitation.",
                "GeeksforGeeks — technical interview preparation: https://www.geeksforgeeks.org/", strengths, weaknesses, improvements, practice, resources, role, domain);

        addScoreEvidence("Keyword relevance", response.getKeywordMatchingScore(), 75,
                "Keyword relevance is %d/100, showing that your answers generally address the question's expected concepts.",
                "Keyword relevance is %d/100. Use the exact concepts and terminology expected for %s interviews when they are genuinely relevant.",
                "For each %s question, identify 3–5 essential concepts before answering and deliberately cover them without keyword stuffing.",
                "LeetCode — interview question practice: https://leetcode.com/problemset/", strengths, weaknesses, improvements, practice, resources, role);

        addScoreEvidence("Problem-solving ability", response.getProblemSolvingScore(), 75,
                "Problem-solving ability is %d/100, indicating structured reasoning in your answers.",
                "Problem-solving ability is %d/100. Show your reasoning step by step before giving the final solution.",
                "Practise one problem daily using: clarify → assumptions → approach → complexity → solution → validation.",
                "LeetCode — problems and solutions practice: https://leetcode.com/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Domain knowledge", response.getDomainRelevanceScore(), 75,
                "Domain knowledge is %d/100 for %s, showing useful relevance to the target area.",
                "Domain knowledge is %d/100 for %s. Revise the fundamental concepts and current terminology most likely to appear in this interview.",
                "Create a one-page %s revision sheet with 20 core concepts, one practical example for each, and one likely interview question.",
                "MIT OpenCourseWare — free technical courses: https://ocw.mit.edu/", strengths, weaknesses, improvements, practice, resources, domain);

        addScoreEvidence("Technical answer completeness", response.getAnswerCompletenessScore(), 75,
                "Technical answer completeness is %d/100, so your solutions usually include enough explanation.",
                "Technical answer completeness is %d/100. Add assumptions, implementation details, examples, and a concise conclusion to technical answers.",
                "Use the pattern: requirement → approach → example → edge case → complexity/trade-off → conclusion for every second technical question.",
                "Amazon interview preparation — technical and behavioral guidance: https://www.amazon.jobs/content/en/how-we-hire/interviewing", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Time management", response.getTimeManagementScore(), 75,
                "Time management is %d/100, indicating answers are generally paced within the interview flow.",
                "Time management is %d/100. Keep answers focused so you have enough time for the key reasoning and conclusion.",
                "Set a 90-second timer for short answers and a 2-minute timer for technical explanations. Practise finishing with a one-sentence takeaway.",
                "Indeed Career Guide — interview preparation: https://www.indeed.com/career-advice/interviewing", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Response organization", response.getAnswerOrganizationScore(), 75,
                "Response organization is %d/100, indicating reasonably structured answers.",
                "Response organization is %d/100. Start with the answer, then support it with two or three logical points instead of thinking aloud.",
                "Use the PREP format for opinion questions: Point → Reason → Example → Point. Use STAR for behavioural questions.",
                "Harvard Business Review — interview communication guidance: https://hbr.org/topic/interviewing", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Professional communication", response.getProfessionalCommunicationScore(), 75,
                "Professional communication is %d/100, showing an appropriate interview tone.",
                "Professional communication is %d/100. Use concise, respectful wording and avoid overly casual or vague phrases.",
                "Rewrite 5 casual interview answers into professional versions and read them aloud until the wording sounds natural.",
                "LinkedIn Learning — professional communication: https://www.linkedin.com/learning/", strengths, weaknesses, improvements, practice, resources);

        addScoreEvidence("Interview etiquette", response.getInterviewEtiquetteScore(), 75,
                "Interview etiquette is %d/100, showing good professional behaviour signals.",
                "Interview etiquette is %d/100. Improve greetings, listening, turn-taking, and closing statements to create a stronger professional impression.",
                "Practise a complete mock-interview routine: greeting → listen → answer → ask one relevant question → thank the interviewer.",
                "Coursera — professional development courses: https://www.coursera.org/browse/personal-development", strengths, weaknesses, improvements, practice, resources);

        if (response.getOverallScore() >= 90) {
            strengths.add("Performance rating: Excellent. Overall score is " + response.getOverallScore() + "/100, meeting the 90+ excellence band.");
        } else if (response.getOverallScore() >= 75) {
            strengths.add("Performance rating: Good. Overall score is " + response.getOverallScore() + "/100; targeted polishing of the lowest-scoring areas can move you toward Excellent.");
        } else if (response.getOverallScore() >= 60) {
            weaknesses.add("Performance rating: Average. Overall score is " + response.getOverallScore() + "/100; focus first on the lowest two Module 7 parameters before the next mock interview.");
        } else if (response.getOverallScore() >= 40) {
            weaknesses.add("Performance rating: Needs Improvement. Overall score is " + response.getOverallScore() + "/100; a focused practice cycle is needed before the next attempt.");
        } else {
            weaknesses.add("Performance rating: Poor. Overall score is " + response.getOverallScore() + "/100; rebuild fundamentals and use guided practice before repeating the full interview.");
        }

        improvements.add("Priority rule: practise the two lowest-scoring Module 7 parameters first; do not spend equal time on strong areas.");
        practice.add("Next mock interview target: improve the two lowest-scoring parameters by at least 10 points and compare the new report with this baseline.");
        resources.add("SmartHire practice strategy: use the Learning Resources above only for your lowest-scoring skills, then retake a targeted mock interview.");

        response.setStrengths(new ArrayList<>(limitFeedback(strengths, 8)));
        response.setWeaknesses(new ArrayList<>(limitFeedback(weaknesses, 8)));
        response.setImprovementSuggestions(new ArrayList<>(limitFeedback(improvements, 8)));
        response.setPracticeRecommendations(new ArrayList<>(limitFeedback(practice, 8)));
        response.setLearningResources(new ArrayList<>(limitFeedback(resources, 10)));
    }

    private void addScoreEvidence(String label, int score, int threshold, String strongFmt, String weakFmt, String action, String resource,
                                   Set<String> strengths, Set<String> weaknesses, Set<String> improvements, Set<String> practice, Set<String> resources, Object... args) {
        int safe = clampScore(score);
        String strong = strongFmt.replace("%d", String.valueOf(safe));
        String weak = weakFmt.replace("%d", String.valueOf(safe));
        if (weakFmt.contains("%s") || strongFmt.contains("%s") || action.contains("%s")) {
            // Parameter-specific overloads use formatted strings below through String.format.
            try {
                strong = String.format(strongFmt, prepend(safe, args));
                weak = String.format(weakFmt, prepend(safe, args));
                action = String.format(action, args);
            } catch (Exception ignored) { }
        }
        if (safe >= threshold) {
            strengths.add(strong);
        } else {
            weaknesses.add(weak);
            improvements.add("" + label + ": " + action);
            practice.add("" + label + " practice: " + action);
            resources.add(label + " resource: " + resource);
        }
    }

    private Object[] prepend(int value, Object[] args) {
        Object[] out = new Object[args.length + 1];
        out[0] = value;
        System.arraycopy(args, 0, out, 1, args.length);
        return out;
    }

    private List<String> safeList(List<String> values) {
        return values == null ? List.of() : values.stream().filter(v -> v != null && !v.isBlank()).map(String::trim).collect(Collectors.toList());
    }

    private Set<String> limitFeedback(Set<String> values, int limit) {
        return values.stream().filter(v -> v != null && !v.isBlank()).limit(limit).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private int attentionScoreFromLevel(String level) {
        return switch (String.valueOf(level).toLowerCase(Locale.ROOT)) {
            case "high" -> 100;
            case "medium" -> 65;
            case "low" -> 30;
            default -> 0;
        };
    }

    private int paceScoreFromWpm(int wpm) {
        if (wpm <= 0) return 0;
        return clampScore(wpm >= 100 && wpm <= 160 ? 92 : Math.max(40, 100 - Math.abs(130 - wpm) / 2));
    }

    private int completenessFromAverageResponse(int words) {
        if (words >= 15) return 92;
        if (words >= 8) return 76;
        return Math.max(30, words * 5);
    }

    private int countAnsweredQuestions(List<String> answers) {
        if (answers == null) return 0;
        int count = 0;
        for (String answer : answers) {
            if (answer != null && !answer.isBlank() && !"No answer provided.".equalsIgnoreCase(answer.trim())) {
                count++;
            }
        }
        return count;
    }

    private boolean isAllStoredMcqQuestions(List<String> questions) {
        if (questions == null || questions.isEmpty()) return false;
        for (String question : questions) {
            if (question == null || question.isBlank()) return false;
            QuestionBankQuestion row = questionBankQuestionRepository.findByQuestionIgnoreCase(question.trim()).orElse(null);
            if (row == null || !"MCQ".equalsIgnoreCase(row.getAnswerMode())
                    || row.getCorrectAnswer() == null || row.getCorrectAnswer().isBlank()) return false;
        }
        return true;
    }

    private InterviewEvaluationResponse buildDeterministicMcqEvaluation(InterviewEvaluationRequest request, int totalQuestions, int answeredQuestions, boolean aptitudeAssessment) {
        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        List<String> questions = request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request.getAnswers() == null ? List.of() : request.getAnswers();
        int correct = 0;
        for (int i = 0; i < questions.size(); i++) {
            QuestionBankQuestion row = questionBankQuestionRepository.findByQuestionIgnoreCase(questions.get(i).trim()).orElse(null);
            String answer = i < answers.size() ? answers.get(i) : "";
            if (row != null && answer != null && !answer.isBlank() && !"No answer provided.".equalsIgnoreCase(answer.trim())
                    && row.getCorrectAnswer().trim().equalsIgnoreCase(answer.trim())) {
                correct++;
            }
        }
        int overall = totalQuestions == 0 ? 0 : clampScore((int) Math.round(correct * 100.0 / totalQuestions));
        int attemptedAccuracy = answeredQuestions == 0 ? 0 : clampScore((int) Math.round(correct * 100.0 / answeredQuestions));
        // For aptitude assessments, unanswered questions count as incorrect.
        // The primary score therefore uses the full assessment denominator (correct/total),
        // while attemptedAccuracy remains useful for diagnostics.
        response.setOverallScore(overall);
        response.setTechnicalScore(aptitudeAssessment ? overall : attemptedAccuracy);
        response.setObjectiveTotalQuestions(totalQuestions);
        response.setObjectiveAnsweredQuestions(answeredQuestions);
        response.setObjectiveCorrectAnswers(correct);
        response.setObjectiveAttemptedAccuracy(attemptedAccuracy);
        response.setCommunicationScore(0);
        response.setConfidenceScore(0);
        response.setProfessionalismScore(0);
        response.setGrammarScore(0);
        response.setSpeechClarityScore(0);
        response.setSpeakingPaceScore(0);
        response.setFillerWordScore(0);
        response.setResponseCompletenessScore(0);
        response.setEyeContactPercentage(0);
        response.setFacialEngagementScore(0);
        response.setResponseHesitationScore(0);
        response.setKeywordMatchingScore(0);
        response.setDomainRelevanceScore(0);
        response.setTechnicalAccuracyScore(attemptedAccuracy);
        response.setProblemSolvingScore(0);
        response.setAnswerCompletenessScore(0);
        response.setTimeManagementScore(0);
        response.setAnswerOrganizationScore(0);
        response.setInterviewEtiquetteScore(0);
        response.setRating(answeredQuestions < totalQuestions ? "Incomplete" : ratingForScore(overall));
        String assessmentLabel = aptitudeAssessment ? "Aptitude" : "Objective";
        response.setRecommendation(answeredQuestions < totalQuestions
                ? "Incomplete " + assessmentLabel + " assessment: " + answeredQuestions + "/" + totalQuestions + " answered; " + correct + " correct. Score: " + overall + "%."
                : assessmentLabel + " assessment completed: " + correct + "/" + totalQuestions + " correct (" + overall + "%).");
        response.setFeedback(List.of(aptitudeAssessment
                ? "Aptitude score is calculated deterministically from the stored MCQ answer key; unanswered questions count as incorrect."
                : "Objective score is calculated deterministically from the stored MCQ answer key."));
        response.setStrengths(correct > 0 ? List.of("Answered " + correct + " objective question(s) correctly.") : List.of());
        response.setWeaknesses(answeredQuestions < totalQuestions
                ? List.of("Some questions were not answered; unanswered questions count toward the assessment denominator.")
                : List.of("Some objective questions were answered incorrectly."));
        response.setImprovementSuggestions(answeredQuestions < totalQuestions
                ? List.of("Complete every question for a full assessment and review missed concepts.")
                : List.of("Review the concepts behind any incorrect answers."));
        response.setPracticeRecommendations(List.of(aptitudeAssessment
                ? "Practice timed aptitude MCQs across quantitative and logical reasoning topics."
                : "Practice role-specific technical multiple-choice questions."));
        response.setLearningResources(List.of("SmartHire interview preparation guide"));
        return response;
    }

    private InterviewEvaluationResponse applyEvaluationGuards(InterviewEvaluationRequest request,
                                                               InterviewEvaluationResponse response,
                                                               int totalQuestions,
                                                               int answeredQuestions) {
        if (totalQuestions <= 0 || answeredQuestions <= 0) {
            return buildNotAttemptedEvaluation(totalQuestions);
        }
        if (response == null) {
            response = interviewEvaluationGeminiClient.evaluateInterview(request);
        }
        if (response == null) {
            response = buildNotAttemptedEvaluation(totalQuestions);
        }

        List<String> questions = request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request.getAnswers() == null ? List.of() : request.getAnswers();
        int mcqAttempted = 0;
        int mcqCorrect = 0;
        int mcqTotal = 0;
        for (int i = 0; i < questions.size(); i++) {
            String question = questions.get(i);
            if (question == null || question.isBlank()) continue;
            QuestionBankQuestion row = questionBankQuestionRepository.findByQuestionIgnoreCase(question.trim()).orElse(null);
            if (row == null || !"MCQ".equalsIgnoreCase(row.getAnswerMode())
                    || row.getCorrectAnswer() == null || row.getCorrectAnswer().isBlank()) continue;
            mcqTotal++;
            String answer = i < answers.size() ? answers.get(i) : "";
            if (answer == null || answer.isBlank() || "No answer provided.".equalsIgnoreCase(answer.trim())) continue;
            mcqAttempted++;
            if (row.getCorrectAnswer().trim().equalsIgnoreCase(answer.trim())) mcqCorrect++;
        }

        boolean allQuestionsAreMcq = mcqTotal == totalQuestions && totalQuestions > 0;
        if (allQuestionsAreMcq) {
            int technicalAccuracy = mcqAttempted == 0 ? 0 : (int) Math.round(mcqCorrect * 100.0 / mcqAttempted);
            int overall = (int) Math.round(mcqCorrect * 100.0 / totalQuestions);
            response.setOverallScore(clampScore(overall));
            response.setTechnicalScore(clampScore(technicalAccuracy));
            response.setCommunicationScore(0);
            response.setConfidenceScore(0);
            response.setProfessionalismScore(0);
            response.setGrammarScore(0);
            response.setSpeechClarityScore(0);
            response.setSpeakingPaceScore(0);
            response.setFillerWordScore(0);
            response.setResponseCompletenessScore(0);
            response.setEyeContactPercentage(0);
            response.setFacialEngagementScore(0);
            response.setResponseHesitationScore(0);
            response.setKeywordMatchingScore(0);
            response.setDomainRelevanceScore(0);
            response.setTechnicalAccuracyScore(clampScore(technicalAccuracy));
            response.setObjectiveTotalQuestions(totalQuestions);
            response.setObjectiveAnsweredQuestions(answeredQuestions);
            response.setObjectiveCorrectAnswers(mcqCorrect);
            response.setObjectiveAttemptedAccuracy(clampScore(technicalAccuracy));
            response.setProblemSolvingScore(0);
            response.setAnswerCompletenessScore(0);
            response.setTimeManagementScore(0);
            response.setAnswerOrganizationScore(0);
            response.setInterviewEtiquetteScore(0);
            response.setRating(answeredQuestions < totalQuestions ? "Incomplete" : ratingForScore(overall));
            response.setRecommendation(answeredQuestions < totalQuestions
                    ? "Incomplete MCQ assessment: " + answeredQuestions + "/" + totalQuestions + " questions answered. " + mcqCorrect + " correct."
                    : "MCQ assessment completed: " + mcqCorrect + "/" + totalQuestions + " correct (" + overall + "%). Communication and confidence were not scored because this assessment used objective questions only.");
            response.setFeedback(List.of("MCQ accuracy is scored deterministically from the stored answer key."));
            response.setStrengths(mcqCorrect > 0 ? List.of("Completed " + mcqCorrect + " objective question(s) correctly.") : List.of());
            response.setWeaknesses(answeredQuestions < totalQuestions ? List.of("Some interview questions were not answered.") : List.of());
            response.setImprovementSuggestions(answeredQuestions < totalQuestions
                    ? List.of("Complete all questions to receive a full assessment.")
                    : List.of("Review the questions answered incorrectly and revisit those technical concepts."));
            response.setPracticeRecommendations(List.of("Practice technical MCQs covering the role-specific topics in this interview."));
            return response;
        }

        // Open-answer interviews: prevent skipped questions from receiving positive credit.
        double completionRatio = Math.min(1.0, Math.max(0.0, answeredQuestions / (double) totalQuestions));
        scaleEvaluationScores(response, completionRatio);
        if (answeredQuestions < totalQuestions) {
            response.setRecommendation("Incomplete interview: " + answeredQuestions + "/" + totalQuestions + " questions answered.");
            response.setRating("Incomplete");
        }
        return response;
    }

    private void scaleEvaluationScores(InterviewEvaluationResponse response, double ratio) {
        response.setOverallScore(scaleScore(response.getOverallScore(), ratio));
        response.setCommunicationScore(scaleScore(response.getCommunicationScore(), ratio));
        response.setConfidenceScore(scaleScore(response.getConfidenceScore(), ratio));
        response.setTechnicalScore(scaleScore(response.getTechnicalScore(), ratio));
        response.setProfessionalismScore(scaleScore(response.getProfessionalismScore(), ratio));
        response.setProfessionalCommunicationScore(scaleScore(response.getProfessionalCommunicationScore(), ratio));
        response.setSpeakingConfidenceScore(scaleScore(response.getSpeakingConfidenceScore(), ratio));
        response.setAttentionScore(scaleScore(response.getAttentionScore(), ratio));
        response.setGrammarScore(scaleScore(response.getGrammarScore(), ratio));
        response.setSpeechClarityScore(scaleScore(response.getSpeechClarityScore(), ratio));
        response.setSpeakingPaceScore(scaleScore(response.getSpeakingPaceScore(), ratio));
        response.setFillerWordScore(scaleScore(response.getFillerWordScore(), ratio));
        response.setResponseCompletenessScore(scaleScore(response.getResponseCompletenessScore(), ratio));
        response.setEyeContactPercentage(scaleScore(response.getEyeContactPercentage(), ratio));
        response.setFacialEngagementScore(scaleScore(response.getFacialEngagementScore(), ratio));
        response.setResponseHesitationScore(scaleScore(response.getResponseHesitationScore(), ratio));
        response.setKeywordMatchingScore(scaleScore(response.getKeywordMatchingScore(), ratio));
        response.setDomainRelevanceScore(scaleScore(response.getDomainRelevanceScore(), ratio));
        response.setTechnicalAccuracyScore(scaleScore(response.getTechnicalAccuracyScore(), ratio));
        response.setProblemSolvingScore(scaleScore(response.getProblemSolvingScore(), ratio));
        response.setAnswerCompletenessScore(scaleScore(response.getAnswerCompletenessScore(), ratio));
        response.setTimeManagementScore(scaleScore(response.getTimeManagementScore(), ratio));
        response.setAnswerOrganizationScore(scaleScore(response.getAnswerOrganizationScore(), ratio));
        response.setInterviewEtiquetteScore(scaleScore(response.getInterviewEtiquetteScore(), ratio));
    }

    private int scaleScore(int value, double ratio) {
        return clampScore((int) Math.round(Math.max(0, value) * ratio));
    }

    private String ratingForScore(int score) {
        if (score >= 90) return "Excellent";
        if (score >= 75) return "Good";
        if (score >= 60) return "Average";
        if (score >= 40) return "Needs Improvement";
        if (score > 0) return "Poor";
        return "Not Attempted";
    }

    private InterviewEvaluationResponse buildNotAttemptedEvaluation(int totalQuestions) {
        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        response.setOverallScore(0);
        response.setCommunicationScore(0);
        response.setConfidenceScore(0);
        response.setTechnicalScore(0);
        response.setProfessionalismScore(0);
        response.setGrammarScore(0);
        response.setSpeechClarityScore(0);
        response.setSpeakingPaceScore(0);
        response.setFillerWordScore(0);
        response.setResponseCompletenessScore(0);
        response.setEyeContactPercentage(0);
        response.setFacialEngagementScore(0);
        response.setResponseHesitationScore(0);
        response.setKeywordMatchingScore(0);
        response.setDomainRelevanceScore(0);
        response.setTechnicalAccuracyScore(0);
        response.setProblemSolvingScore(0);
        response.setAnswerCompletenessScore(0);
        response.setTimeManagementScore(0);
        response.setAnswerOrganizationScore(0);
        response.setInterviewEtiquetteScore(0);
        response.setRating("Not Attempted");
        response.setRecommendation("No score awarded: 0/" + Math.max(totalQuestions, 0) + " questions answered.");
        response.setStrengths(List.of());
        response.setWeaknesses(List.of("No interview questions were answered."));
        response.setImprovementSuggestions(List.of("Answer at least one interview question to receive a meaningful evaluation."));
        response.setPracticeRecommendations(List.of("Start another mock interview and complete the questions."));
        response.setLearningResources(List.of("SmartHire interview preparation guide"));
        response.setFeedback(List.of("The interview ended without any answered questions. No performance score was awarded."));
        return response;
    }

    private int clampScore(int value) {
        return Math.max(0, Math.min(100, value));
    }

    public InterviewEvaluationResponse getInterviewEvaluation(Long interviewId) {
        InterviewEvaluation evaluation = interviewEvaluationRepository.findByInterviewId(interviewId)
                .orElseThrow(() -> new InterviewException("Interview evaluation not found"));
        return toEvaluationResponse(evaluation);
    }

        @Transactional
        public Interview saveInterviewSessionSnapshot(InterviewSessionSnapshotRequest request) {
        Interview interview = interviewRepository.findById(request.getInterviewId())
            .orElseThrow(() -> new InterviewException("Interview not found"));

        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null || !authenticatedUserId.equals(interview.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview not found");
        }

        applySessionSnapshot(interview, request);
        return interviewRepository.save(interview);
        }

        public InterviewReportResponse getInterviewReport(Long interviewId) {
        Interview interview = interviewRepository.findById(interviewId)
            .orElseThrow(() -> new InterviewException("Interview not found"));

        Long authenticatedUserId = currentUserId();
        if (authenticatedUserId == null || !authenticatedUserId.equals(interview.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview not found");
        }

        InterviewReportResponse response = new InterviewReportResponse();
        response.setInterviewId(interview.getId());
        response.setUserId(interview.getUserId());
        response.setJobRole(normalizeValue(interview.getJobRole(), "Not provided"));
        response.setInterviewType(normalizeValue(interview.getInterviewType(), "Not provided"));
        response.setDomain(normalizeValue(interview.getDomain(), "Not provided"));
        response.setDifficulty(normalizeValue(interview.getDifficulty(), "Not provided"));
        response.setExperienceLevel(normalizeValue(interview.getExperienceLevel(), "Not provided"));
        response.setTranscript(normalizeValue(interview.getTranscriptText(), ""));
        response.setSessionSummary(normalizeValue(interview.getSessionSummary(), buildSessionSummary(interview, interview.getTranscriptText())));
        response.setTimeline(parseTimeline(interview.getSessionTimeline()));
        response.setLiveSignalsJson(normalizeValue(interview.getLiveSignalsJson(), "{}"));
        response.setSpeechInsightsJson(normalizeValue(interview.getSpeechInsightsJson(), "{}"));
        response.setMonitoringSamples(interview.getMonitoringSamples());
        response.setRealEmotionSamples(interview.getRealEmotionSamples());
        response.setRealEyeTrackingSamples(interview.getRealEyeTrackingSamples());
        response.setMonitoringProviderSummary(normalizeValue(interview.getMonitoringProviderSummary(), "{}"));

        interviewAnswerRepository.findByInterviewIdOrderByIdAsc(interviewId)
            .stream()
            .map(answer -> new InterviewHistoryDetailResponse.AnswerItem(
                normalizeValue(answer.getQuestion(), ""),
                normalizeValue(answer.getAnswer(), "No answer provided."),
                normalizeValue(answer.getCategory(), "General"),
                normalizeValue(answer.getDifficulty(), "Not provided")
            ))
            .forEach(response.getAnswers()::add);

        interviewEvaluationRepository.findByInterviewId(interviewId).ifPresent(evaluation -> {
            response.setEvaluation(toEvaluationResponse(evaluation));
        });

        response.getRecording().setVideoRecordingName(interview.getVideoRecordingName());
        response.getRecording().setAudioRecordingName(interview.getAudioRecordingName());
        response.getRecording().setRecordingActive(Boolean.TRUE.equals(interview.getRecordingActive()));
        response.getRecording().setRecordingSupported(Boolean.TRUE.equals(interview.getRecordingSupported()));
        response.getRecording().setDurationSeconds(interview.getRecordingDurationSeconds());
        response.getRecording().setTimerSecondsRemaining(interview.getTimerSecondsRemaining());

        InterviewReportResponse.EmailPreview emailPreview = new InterviewReportResponse.EmailPreview();
        emailPreview.setRecipient("candidate-" + interview.getUserId() + "@smarthire.local");
        emailPreview.setSubject("SmartHire AI Interview Report - Interview #" + interview.getId());
        emailPreview.setBody(buildEmailBody(response));
        emailPreview.setAttachments(List.of(
            defaultText(interview.getVideoRecordingName(), "video-recording.webm"),
            defaultText(interview.getAudioRecordingName(), "audio-recording.webm"),
            "interview-transcript.txt"
        ));
        response.setEmailPreview(emailPreview);

        return response;
        }

    private int[] calculateObjectiveMetrics(Long interviewId) {
        int total = 0;
        int answered = 0;
        int correct = 0;

        List<InterviewAnswer> storedAnswers = interviewAnswerRepository.findByInterviewIdOrderByIdAsc(interviewId);
        for (InterviewAnswer answerRow : storedAnswers) {
            if (answerRow == null || answerRow.getQuestion() == null || answerRow.getQuestion().isBlank()) continue;
            QuestionBankQuestion bankRow = questionBankQuestionRepository
                    .findByQuestionIgnoreCase(answerRow.getQuestion().trim())
                    .orElse(null);
            if (bankRow == null || !"MCQ".equalsIgnoreCase(bankRow.getAnswerMode())
                    || bankRow.getCorrectAnswer() == null || bankRow.getCorrectAnswer().isBlank()) continue;

            total++;
            String answer = answerRow.getAnswer();
            if (answer == null || answer.isBlank() || "No answer provided.".equalsIgnoreCase(answer.trim())) continue;
            answered++;
            if (bankRow.getCorrectAnswer().trim().equalsIgnoreCase(answer.trim())) correct++;
        }

        int attemptedAccuracy = answered == 0 ? 0 : clampScore((int) Math.round(correct * 100.0 / answered));
        return new int[]{total, answered, correct, attemptedAccuracy};
    }

    @Transactional
    public CareerRoadmapResponse generateCareerRoadmap(Long userId, CareerRoadmapRequest request) {
        if (userId == null || userId <= 0) {
            throw new InterviewException("User ID is required for roadmap generation.");
        }

        CareerRoadmapRequest safeRequest = request == null ? new CareerRoadmapRequest() : request;
        safeRequest.setUserId(userId);

        CareerRoadmapResponse roadmap = interviewCareerRoadmapGeminiClient.generateRoadmap(safeRequest);
        Interview interview = getOrCreateLatestInterviewForUser(userId);
        interview.setCareerRoadmapJson(writeJson(roadmap, "{}"));
        appendNotification(interview, "Career", "Career roadmap generated", "Your AI roadmap has been updated.");
        interviewRepository.save(interview);
        return roadmap;
    }

    public CandidateEnhancementSnapshotResponse getCandidateEnhancements(Long userId) {
        if (userId == null || userId <= 0) {
            throw new InterviewException("User ID is required.");
        }

        Interview interview = getOrCreateLatestInterviewForUser(userId);
        CandidateEnhancementSnapshotResponse response = new CandidateEnhancementSnapshotResponse();

        CareerRoadmapResponse roadmap = readJson(interview.getCareerRoadmapJson(), CareerRoadmapResponse.class, null);
        if (roadmap != null) {
            response.setCareerRoadmap(roadmap);
        }

        List<CandidateEnhancementSnapshotResponse.NotificationItem> notifications = readJsonList(
                interview.getNotificationCenterJson(),
                CandidateEnhancementSnapshotResponse.NotificationItem[].class
        );
        if (notifications.isEmpty()) {
            notifications = defaultNotifications();
        }
        response.setNotifications(notifications);

        CandidateEnhancementSnapshotResponse.ProfileCompletion profileCompletion = readJson(
                interview.getProfileCompletionJson(),
                CandidateEnhancementSnapshotResponse.ProfileCompletion.class,
                null
        );
        if (profileCompletion == null) {
            profileCompletion = new CandidateEnhancementSnapshotResponse.ProfileCompletion();
            profileCompletion.setCompletionPercentage(55);
            profileCompletion.setChecklist(List.of(
                    "Upload resume",
                    "Complete profile summary",
                    "Add primary skills",
                    "Finish one mock interview"
            ));
            profileCompletion.setMissingItems(List.of(
                    "Add certifications",
                    "Add GitHub/portfolio link"
            ));
        }
        response.setProfileCompletion(profileCompletion);

        List<CandidateEnhancementSnapshotResponse.AssessmentSummary> assessments = readJsonList(
                interview.getAssessmentResultsJson(),
                CandidateEnhancementSnapshotResponse.AssessmentSummary[].class
        );
        response.setAssessments(assessments);
        return response;
    }

    @Transactional
    public CandidateEnhancementSnapshotResponse saveAssessmentResult(Long userId, CandidateAssessmentResultRequest request) {
        if (userId == null || userId <= 0) {
            throw new InterviewException("User ID is required.");
        }
        if (request == null || request.getAssessmentType() == null || request.getAssessmentType().isBlank()) {
            throw new InterviewException("Assessment type is required.");
        }

        Interview interview = getOrCreateLatestInterviewForUser(userId);
        List<CandidateEnhancementSnapshotResponse.AssessmentSummary> current = readJsonList(
                interview.getAssessmentResultsJson(),
                CandidateEnhancementSnapshotResponse.AssessmentSummary[].class
        );

        String type = normalizeValue(request.getAssessmentType(), "General");
        current.removeIf(item -> type.equalsIgnoreCase(normalizeValue(item.getAssessmentType(), "")));

        CandidateEnhancementSnapshotResponse.AssessmentSummary summary = new CandidateEnhancementSnapshotResponse.AssessmentSummary();
        summary.setAssessmentType(type);
        summary.setScore(request.getScore());
        summary.setTotal(request.getTotal());
        summary.setDurationSeconds(request.getDurationSeconds());
        summary.setInsights(request.getInsights() == null ? List.of() : request.getInsights());
        current.add(summary);

        interview.setAssessmentResultsJson(writeJson(current, "[]"));
        appendNotification(interview, "Assessment", type + " test completed", "Your result summary is now available.");
        interviewRepository.save(interview);
        return getCandidateEnhancements(userId);
    }

    @Transactional
    public CandidateEnhancementSnapshotResponse saveProfileCompletion(Long userId, CandidateProfileCompletionRequest request) {
        if (userId == null || userId <= 0) {
            throw new InterviewException("User ID is required.");
        }
        if (request == null) {
            throw new InterviewException("Profile completion payload is required.");
        }

        Interview interview = getOrCreateLatestInterviewForUser(userId);
        CandidateEnhancementSnapshotResponse.ProfileCompletion completion = new CandidateEnhancementSnapshotResponse.ProfileCompletion();
        completion.setCompletionPercentage(clamp(request.getCompletionPercentage()));
        completion.setChecklist(request.getChecklist() == null ? List.of() : request.getChecklist());
        completion.setMissingItems(request.getMissingItems() == null ? List.of() : request.getMissingItems());

        interview.setProfileCompletionJson(writeJson(completion, "{}"));
        interviewRepository.save(interview);
        return getCandidateEnhancements(userId);
    }

    @Transactional
    public CandidateEnhancementSnapshotResponse addNotification(Long userId, CandidateNotificationRequest request) {
        if (userId == null || userId <= 0) {
            throw new InterviewException("User ID is required.");
        }
        if (request == null) {
            throw new InterviewException("Notification payload is required.");
        }

        Interview interview = getOrCreateLatestInterviewForUser(userId);
        appendNotification(
                interview,
                normalizeValue(request.getType(), "Update"),
                normalizeValue(request.getTitle(), "Platform update"),
                normalizeValue(request.getMessage(), "A new update is available.")
        );
        interviewRepository.save(interview);
        return getCandidateEnhancements(userId);
    }

    private void saveInterviewAnswers(InterviewEvaluationRequest request) {
        interviewAnswerRepository.deleteByInterviewId(request.getInterviewId());

        List<String> questions = request.getQuestions() == null ? List.of() : request.getQuestions();
        List<String> answers = request.getAnswers() == null ? List.of() : request.getAnswers();
        String defaultDifficulty = normalizeValue(request.getDifficulty(), "Not provided");

        List<InterviewAnswer> answerEntities = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            String question = normalizeValue(questions.get(i), "");
            if (question.isBlank()) {
                continue;
            }

            String answer = i < answers.size() ? answers.get(i) : "No answer provided.";
            answerEntities.add(new InterviewAnswer(
                    request.getInterviewId(),
                    question,
                    normalizeValue(answer, "No answer provided."),
                    "General",
                    defaultDifficulty
            ));
        }

        if (!answerEntities.isEmpty()) {
            interviewAnswerRepository.saveAll(answerEntities);
        }
    }

    private void saveInterviewEvaluation(Long interviewId, InterviewEvaluationResponse evaluationResponse) {
        interviewEvaluationRepository.deleteByInterviewId(interviewId);

        InterviewEvaluation evaluation = new InterviewEvaluation();
        evaluation.setInterviewId(interviewId);
        evaluation.setOverallScore(evaluationResponse.getOverallScore());
        evaluation.setTechnicalScore(evaluationResponse.getTechnicalScore());
        evaluation.setCommunicationScore(evaluationResponse.getCommunicationScore());
        evaluation.setConfidenceScore(evaluationResponse.getConfidenceScore());
        evaluation.setProfessionalismScore(evaluationResponse.getProfessionalismScore());
        evaluation.setProfessionalCommunicationScore(evaluationResponse.getProfessionalCommunicationScore());
        evaluation.setGrammarScore(evaluationResponse.getGrammarScore());
        evaluation.setSpeechClarityScore(evaluationResponse.getSpeechClarityScore());
        evaluation.setSpeakingPaceScore(evaluationResponse.getSpeakingPaceScore());
        evaluation.setFillerWordScore(evaluationResponse.getFillerWordScore());
        evaluation.setResponseCompletenessScore(evaluationResponse.getResponseCompletenessScore());
        evaluation.setPronunciationScore(evaluationResponse.getPronunciationScore());
        evaluation.setTranscriptionConfidence(evaluationResponse.getTranscriptionConfidence());
        evaluation.setGrammarIssueCount(evaluationResponse.getGrammarIssueCount());
        evaluation.setEyeContactPercentage(evaluationResponse.getEyeContactPercentage());
        evaluation.setFacialEngagementScore(evaluationResponse.getFacialEngagementScore());
        evaluation.setResponseHesitationScore(evaluationResponse.getResponseHesitationScore());
        evaluation.setSpeakingConfidenceScore(evaluationResponse.getSpeakingConfidenceScore());
        evaluation.setAttentionScore(evaluationResponse.getAttentionScore());
        evaluation.setKeywordMatchingScore(evaluationResponse.getKeywordMatchingScore());
        evaluation.setDomainRelevanceScore(evaluationResponse.getDomainRelevanceScore());
        evaluation.setTechnicalAccuracyScore(evaluationResponse.getTechnicalAccuracyScore());
        evaluation.setProblemSolvingScore(evaluationResponse.getProblemSolvingScore());
        evaluation.setAnswerCompletenessScore(evaluationResponse.getAnswerCompletenessScore());
        evaluation.setTimeManagementScore(evaluationResponse.getTimeManagementScore());
        evaluation.setAnswerOrganizationScore(evaluationResponse.getAnswerOrganizationScore());
        evaluation.setInterviewEtiquetteScore(evaluationResponse.getInterviewEtiquetteScore());
        evaluation.setRating(normalizeValue(evaluationResponse.getRating(), "Not available"));
        evaluation.setStrengths(joinFeedback(evaluationResponse.getStrengths()));
        evaluation.setWeaknesses(joinFeedback(evaluationResponse.getWeaknesses()));
        evaluation.setImprovementSuggestions(joinFeedback(evaluationResponse.getImprovementSuggestions()));
        evaluation.setPracticeRecommendations(joinFeedback(evaluationResponse.getPracticeRecommendations()));
        evaluation.setLearningResources(joinFeedback(evaluationResponse.getLearningResources()));
        evaluation.setRecommendation(normalizeValue(evaluationResponse.getRecommendation(), "Not available"));
        evaluation.setFeedback(joinFeedback(evaluationResponse.getFeedback()));
        evaluation.setProctoringViolationCount(evaluationResponse.getProctoringViolationCount());
        evaluation.setMalpracticeTerminated(Boolean.TRUE.equals(evaluationResponse.getMalpracticeTerminated()));
        evaluation.setMalpracticeReason(evaluationResponse.getMalpracticeReason());
        evaluation.setProctoringViolationsJson(evaluationResponse.getProctoringViolationsJson());

        interviewEvaluationRepository.save(evaluation);
    }

    private void saveInterviewSessionMetadata(InterviewEvaluationRequest request) {
        Interview interview = interviewRepository.findById(request.getInterviewId())
                .orElseThrow(() -> new InterviewException("Interview not found"));

        interview.setTranscriptText(normalizeValue(request.getTranscript(), interview.getTranscriptText()));
        interview.setSessionSummary(normalizeValue(request.getSessionSummary(), buildSessionSummary(interview, request.getTranscript())));
        interview.setVideoRecordingName(normalizeValue(request.getVideoRecordingName(), interview.getVideoRecordingName()));
        interview.setAudioRecordingName(normalizeValue(request.getAudioRecordingName(), interview.getAudioRecordingName()));
        interview.setRecordingSupported(request.getRecordingSupported());
        interview.setRecordingActive(request.getRecordingActive());
        interview.setRecordingDurationSeconds(request.getRecordingDurationSeconds());
        interview.setTimerSecondsRemaining(request.getTimerSecondsRemaining());
        interview.setLiveSignalsJson(mergeJsonPayload(request.getLiveSignalsJson(), interview.getLiveSignalsJson()));
        interview.setSpeechInsightsJson(mergeJsonPayload(request.getSpeechInsightsJson(), interview.getSpeechInsightsJson()));
        interview.setMonitoringSamples(request.getMonitoringSamples());
        interview.setRealEmotionSamples(request.getRealEmotionSamples());
        interview.setRealEyeTrackingSamples(request.getRealEyeTrackingSamples());
        interview.setMonitoringProviderSummary(request.getMonitoringProviderSummary());
        interview.setTranscriptUpdatedAt(LocalDateTime.now());
        interview.setSessionTimeline(serializeTimeline(request.getSessionTimeline()));
        interviewRepository.save(interview);
    }

    private void applySessionSnapshot(Interview interview, InterviewSessionSnapshotRequest request) {
        interview.setTranscriptText(normalizeValue(request.getTranscript(), interview.getTranscriptText()));
        interview.setSessionSummary(normalizeValue(request.getSessionSummary(), interview.getSessionSummary()));
        interview.setVideoRecordingName(normalizeValue(request.getVideoRecordingName(), interview.getVideoRecordingName()));
        interview.setAudioRecordingName(normalizeValue(request.getAudioRecordingName(), interview.getAudioRecordingName()));
        interview.setRecordingSupported(request.getRecordingSupported());
        interview.setRecordingActive(request.getRecordingActive());
        interview.setRecordingDurationSeconds(request.getDurationSeconds());
        interview.setTimerSecondsRemaining(request.getTimerSecondsRemaining());
        interview.setRecoveryState(normalizeValue(request.getRecoveryState(), interview.getRecoveryState()));
        interview.setLiveSignalsJson(mergeJsonPayload(request.getLiveSignalsJson(), interview.getLiveSignalsJson()));
        interview.setSpeechInsightsJson(mergeJsonPayload(request.getSpeechInsightsJson(), interview.getSpeechInsightsJson()));
        interview.setMonitoringSamples(request.getMonitoringSamples());
        interview.setRealEmotionSamples(request.getRealEmotionSamples());
        interview.setRealEyeTrackingSamples(request.getRealEyeTrackingSamples());
        interview.setMonitoringProviderSummary(request.getMonitoringProviderSummary());
        interview.setSessionTimeline(serializeTimeline(request.getTimeline()));
        interview.setTranscriptUpdatedAt(LocalDateTime.now());
    }

    private InterviewEvaluationResponse toEvaluationResponse(InterviewEvaluation evaluation) {
        InterviewEvaluationResponse response = new InterviewEvaluationResponse();
        response.setOverallScore(evaluation.getOverallScore());
        response.setTechnicalScore(evaluation.getTechnicalScore());
        response.setCommunicationScore(safeNumber(evaluation.getCommunicationScore()));
        response.setConfidenceScore(safeNumber(evaluation.getConfidenceScore()));
        response.setProfessionalismScore(safeNumber(evaluation.getProfessionalismScore()));
        response.setProfessionalCommunicationScore(safeNumber(evaluation.getProfessionalCommunicationScore()));
        response.setGrammarScore(safeNumber(evaluation.getGrammarScore()));
        response.setSpeechClarityScore(safeNumber(evaluation.getSpeechClarityScore()));
        response.setSpeakingPaceScore(safeNumber(evaluation.getSpeakingPaceScore()));
        response.setFillerWordScore(safeNumber(evaluation.getFillerWordScore()));
        response.setResponseCompletenessScore(safeNumber(evaluation.getResponseCompletenessScore()));
        response.setPronunciationScore(safeNumber(evaluation.getPronunciationScore()));
        response.setTranscriptionConfidence(safeNumber(evaluation.getTranscriptionConfidence()));
        response.setGrammarIssueCount(safeNumber(evaluation.getGrammarIssueCount()));
        response.setEyeContactPercentage(safeNumber(evaluation.getEyeContactPercentage()));
        response.setFacialEngagementScore(safeNumber(evaluation.getFacialEngagementScore()));
        response.setResponseHesitationScore(safeNumber(evaluation.getResponseHesitationScore()));
        response.setSpeakingConfidenceScore(safeNumber(evaluation.getSpeakingConfidenceScore()));
        response.setAttentionScore(safeNumber(evaluation.getAttentionScore()));
        response.setKeywordMatchingScore(safeNumber(evaluation.getKeywordMatchingScore()));
        response.setDomainRelevanceScore(safeNumber(evaluation.getDomainRelevanceScore()));
        response.setTechnicalAccuracyScore(safeNumber(evaluation.getTechnicalAccuracyScore()));
        response.setProblemSolvingScore(evaluation.getProblemSolvingScore());
        response.setAnswerCompletenessScore(safeNumber(evaluation.getAnswerCompletenessScore()));
        response.setTimeManagementScore(safeNumber(evaluation.getTimeManagementScore()));
        response.setAnswerOrganizationScore(safeNumber(evaluation.getAnswerOrganizationScore()));
        response.setInterviewEtiquetteScore(safeNumber(evaluation.getInterviewEtiquetteScore()));
        response.setRating(normalizeValue(evaluation.getRating(), "Not available"));
        response.setStrengths(parseFeedback(evaluation.getStrengths()));
        response.setWeaknesses(parseFeedback(evaluation.getWeaknesses()));
        response.setImprovementSuggestions(parseFeedback(evaluation.getImprovementSuggestions()));
        response.setPracticeRecommendations(parseFeedback(evaluation.getPracticeRecommendations()));
        response.setLearningResources(parseFeedback(evaluation.getLearningResources()));
        response.setFeedback(parseFeedback(evaluation.getFeedback()));
        response.setProctoringViolationCount(evaluation.getProctoringViolationCount());
        response.setMalpracticeTerminated(evaluation.isMalpracticeTerminated());
        response.setMalpracticeReason(evaluation.getMalpracticeReason());
        response.setProctoringViolationsJson(evaluation.getProctoringViolationsJson());
        response.setRecommendation(normalizeValue(evaluation.getRecommendation(), "Not available"));
        return response;
    }

    private InterviewHistorySummaryResponse toHistorySummary(Interview interview, InterviewEvaluation evaluation) {
        Integer overallScore = evaluation == null ? null : evaluation.getOverallScore();
        String recommendation = evaluation == null ? "Pending evaluation" : evaluation.getRecommendation();

        return new InterviewHistorySummaryResponse(
                interview.getId(),
                interview.getCreatedAt(),
                normalizeValue(interview.getJobRole(), "Not provided"),
                overallScore,
                normalizeValue(recommendation, "Pending evaluation")
        );
    }

    private String joinFeedback(List<String> feedback) {
        if (feedback == null || feedback.isEmpty()) {
            return "";
        }
        return feedback.stream()
                .filter(item -> item != null && !item.isBlank())
                .map(String::trim)
                .collect(Collectors.joining("\n"));
    }

    private List<String> parseFeedback(String feedback) {
        if (feedback == null || feedback.isBlank()) {
            return List.of();
        }
        return Arrays.stream(feedback.split("\\r?\\n"))
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .collect(Collectors.toList());
    }

    private String normalizeValue(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback == null || fallback.isBlank() ? "Not provided" : fallback;
        }
        return value.trim();
    }

    private int safeNumber(Integer value) {
        return value == null ? 0 : value;
    }

    private String buildSessionSummary(Interview interview, String transcript) {
        int transcriptWords = transcript == null || transcript.isBlank() ? 0 : transcript.trim().split("\\s+").length;
        return "Interview for " + normalizeValue(interview.getJobRole(), "Not provided")
                + " completed with " + transcriptWords + " transcript words.";
    }

    private String buildEmailBody(InterviewReportResponse response) {
        String overall = response.getEvaluation() == null ? "Pending" : response.getEvaluation().getOverallScore() + "%";
        return "Hello,\n\nYour SmartHire AI interview report is ready.\n\n"
                + "Job Role: " + response.getJobRole() + "\n"
                + "Overall Score: " + overall + "\n"
                + "Summary: " + normalizeValue(response.getSessionSummary(), "Not available") + "\n\n"
                + "Attachments: video, audio, and transcript files.\n";
    }

    private String serializeTimeline(List<InterviewSessionStepDto> timeline) {
        if (timeline == null || timeline.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(timeline);
        } catch (JsonProcessingException exception) {
            return "[]";
        }
    }

    private List<InterviewSessionStepDto> parseTimeline(String rawTimeline) {
        if (rawTimeline == null || rawTimeline.isBlank()) {
            return List.of();
        }
        try {
            InterviewSessionStepDto[] items = objectMapper.readValue(rawTimeline, InterviewSessionStepDto[].class);
            return Arrays.asList(items);
        } catch (Exception exception) {
            return List.of();
        }
    }

    private Interview getOrCreateLatestInterviewForUser(Long userId) {
        List<Interview> items = interviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (!items.isEmpty()) {
            return items.get(0);
        }

        Interview interview = new Interview(
                userId,
                "technical",
                "general",
                "medium",
                "mid",
                "Candidate"
        );
        return interviewRepository.save(interview);
    }

    private void appendNotification(Interview interview, String type, String title, String message) {
        List<CandidateEnhancementSnapshotResponse.NotificationItem> notifications = readJsonList(
                interview.getNotificationCenterJson(),
                CandidateEnhancementSnapshotResponse.NotificationItem[].class
        );

        CandidateEnhancementSnapshotResponse.NotificationItem item = new CandidateEnhancementSnapshotResponse.NotificationItem();
        item.setType(normalizeValue(type, "Update"));
        item.setTitle(normalizeValue(title, "Platform update"));
        item.setMessage(normalizeValue(message, "A new update is available."));
        item.setCreatedAt(LocalDateTime.now().toString());
        notifications.add(0, item);

        if (notifications.size() > 40) {
            notifications = new ArrayList<>(notifications.subList(0, 40));
        }

        interview.setNotificationCenterJson(writeJson(notifications, "[]"));
    }

    private List<CandidateEnhancementSnapshotResponse.NotificationItem> defaultNotifications() {
        List<CandidateEnhancementSnapshotResponse.NotificationItem> items = new ArrayList<>();

        CandidateEnhancementSnapshotResponse.NotificationItem one = new CandidateEnhancementSnapshotResponse.NotificationItem();
        one.setType("Resume");
        one.setTitle("Resume analysis completed");
        one.setMessage("Your AI resume analysis is available in the ATS section.");
        one.setCreatedAt(LocalDateTime.now().toString());
        items.add(one);

        CandidateEnhancementSnapshotResponse.NotificationItem two = new CandidateEnhancementSnapshotResponse.NotificationItem();
        two.setType("Interview");
        two.setTitle("Interview reminder");
        two.setMessage("Mock interview practice is scheduled for today.");
        two.setCreatedAt(LocalDateTime.now().minusHours(2).toString());
        items.add(two);

        CandidateEnhancementSnapshotResponse.NotificationItem three = new CandidateEnhancementSnapshotResponse.NotificationItem();
        three.setType("Recruiter");
        three.setTitle("Recruiter update");
        three.setMessage("A recruiter viewed your latest profile summary.");
        three.setCreatedAt(LocalDateTime.now().minusDays(1).toString());
        items.add(three);

        return items;
    }

    private <T> T readJson(String rawJson, Class<T> clazz, T fallback) {
        if (rawJson == null || rawJson.isBlank()) {
            return fallback;
        }
        try {
            return objectMapper.readValue(rawJson, clazz);
        } catch (Exception exception) {
            return fallback;
        }
    }

    private <T> List<T> readJsonList(String rawJson, Class<T[]> clazz) {
        if (rawJson == null || rawJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            T[] items = objectMapper.readValue(rawJson, clazz);
            return new ArrayList<>(Arrays.asList(items));
        } catch (Exception exception) {
            return new ArrayList<>();
        }
    }

    private String writeJson(Object value, String fallback) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception exception) {
            return fallback;
        }
    }

    private int clamp(Integer value) {
        if (value == null) {
            return 0;
        }
        if (value < 0) {
            return 0;
        }
        if (value > 100) {
            return 100;
        }
        return value;
    }

    private String mergeJsonPayload(String incoming, String existing) {
        if (incoming != null && !incoming.isBlank()) {
            return incoming.trim();
        }
        if (existing != null && !existing.isBlank()) {
            return existing;
        }
        return "{}";
    }

    private String defaultText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        String email = null;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            email = (String) principal;
        }
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }
}
