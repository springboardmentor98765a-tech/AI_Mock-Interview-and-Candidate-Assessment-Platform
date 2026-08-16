package com.smarthire.backend.interview.service;

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

    public InterviewService(InterviewRepository interviewRepository,
                            InterviewAnswerRepository interviewAnswerRepository,
                            InterviewEvaluationRepository interviewEvaluationRepository,
                            InterviewGeminiClient interviewGeminiClient,
                            InterviewFollowUpGeminiClient interviewFollowUpGeminiClient,
                            InterviewEvaluationGeminiClient interviewEvaluationGeminiClient,
                            InterviewCareerRoadmapGeminiClient interviewCareerRoadmapGeminiClient,
                            QuestionBankQuestionRepository questionBankQuestionRepository,
                            ObjectMapper objectMapper,
                            UserRepository userRepository) {
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
                response.setEvaluation(evaluationSummary);
                response.setFeedback(parseFeedback(evaluation.getFeedback()));
            });

        return response;
    }

    public InterviewResponse startInterview(InterviewRequest request) {
        Interview interview = createInterview(request);

        InterviewQuestionGenerationResult generationResult = interviewGeminiClient.generateQuestionsWithSource(
                request.getJobRole(),
                request.getInterviewType(),
                request.getDomain(),
                request.getExperienceLevel(),
                request.getDifficulty()
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
        interviewRepository.findById(request.getInterviewId())
                .orElseThrow(() -> new InterviewException("Interview not found"));

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
            evaluationResponse = buildDeterministicMcqEvaluation(request, totalQuestions, answeredQuestions);
        } else {
            evaluationResponse = interviewEvaluationGeminiClient.evaluateInterview(request);
            evaluationResponse = applyEvaluationGuards(request, evaluationResponse, totalQuestions, answeredQuestions);
        }

        saveInterviewSessionMetadata(request);
        saveInterviewAnswers(request);
        saveInterviewEvaluation(request.getInterviewId(), evaluationResponse);
        return evaluationResponse;
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

    private InterviewEvaluationResponse buildDeterministicMcqEvaluation(InterviewEvaluationRequest request, int totalQuestions, int answeredQuestions) {
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
        response.setOverallScore(overall);
        response.setTechnicalScore(attemptedAccuracy);
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
        response.setRecommendation(answeredQuestions < totalQuestions
                ? "Incomplete MCQ assessment: " + answeredQuestions + "/" + totalQuestions + " answered; " + correct + " correct."
                : "MCQ assessment completed: " + correct + "/" + totalQuestions + " correct (" + overall + "%).");
        response.setFeedback(List.of("Technical score is calculated from the stored MCQ answer key."));
        response.setStrengths(correct > 0 ? List.of("Answered " + correct + " objective question(s) correctly.") : List.of());
        response.setWeaknesses(answeredQuestions < totalQuestions ? List.of("Some questions were not answered.") : List.of());
        response.setImprovementSuggestions(answeredQuestions < totalQuestions
                ? List.of("Complete every question for a full assessment.")
                : List.of("Review the concepts behind any incorrect answers."));
        response.setPracticeRecommendations(List.of("Practice role-specific technical multiple-choice questions."));
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
        if (score >= 85) return "Excellent";
        if (score >= 70) return "Strong";
        if (score >= 55) return "Average";
        if (score > 0) return "Needs Improvement";
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
            InterviewHistoryDetailResponse.EvaluationSummary evaluationSummary = new InterviewHistoryDetailResponse.EvaluationSummary(
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
            response.setEvaluation(evaluationSummary);
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
        evaluation.setGrammarScore(evaluationResponse.getGrammarScore());
        evaluation.setSpeechClarityScore(evaluationResponse.getSpeechClarityScore());
        evaluation.setSpeakingPaceScore(evaluationResponse.getSpeakingPaceScore());
        evaluation.setFillerWordScore(evaluationResponse.getFillerWordScore());
        evaluation.setResponseCompletenessScore(evaluationResponse.getResponseCompletenessScore());
        evaluation.setEyeContactPercentage(evaluationResponse.getEyeContactPercentage());
        evaluation.setFacialEngagementScore(evaluationResponse.getFacialEngagementScore());
        evaluation.setResponseHesitationScore(evaluationResponse.getResponseHesitationScore());
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
        response.setGrammarScore(safeNumber(evaluation.getGrammarScore()));
        response.setSpeechClarityScore(safeNumber(evaluation.getSpeechClarityScore()));
        response.setSpeakingPaceScore(safeNumber(evaluation.getSpeakingPaceScore()));
        response.setFillerWordScore(safeNumber(evaluation.getFillerWordScore()));
        response.setResponseCompletenessScore(safeNumber(evaluation.getResponseCompletenessScore()));
        response.setEyeContactPercentage(safeNumber(evaluation.getEyeContactPercentage()));
        response.setFacialEngagementScore(safeNumber(evaluation.getFacialEngagementScore()));
        response.setResponseHesitationScore(safeNumber(evaluation.getResponseHesitationScore()));
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
