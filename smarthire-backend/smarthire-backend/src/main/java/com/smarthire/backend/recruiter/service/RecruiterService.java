package com.smarthire.backend.recruiter.service;

import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.exception.InterviewException;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import com.smarthire.backend.platform.dto.PlatformActionRequest;
import com.smarthire.backend.platform.entity.PlatformActionLog;
import com.smarthire.backend.platform.repository.PlatformActionLogRepository;
import com.smarthire.backend.platform.service.PlatformInsightsService;
import com.smarthire.backend.recruiter.dto.RecruiterCandidateDetailDto;
import com.smarthire.backend.recruiter.dto.RecruiterCandidateSummaryDto;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RecruiterService {

    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;
    private final PlatformActionLogRepository platformActionLogRepository;
    private final PlatformInsightsService platformInsightsService;

    public RecruiterService(UserRepository userRepository,
                            ResumeRepository resumeRepository,
                            InterviewRepository interviewRepository,
                            InterviewEvaluationRepository interviewEvaluationRepository,
                            PlatformActionLogRepository platformActionLogRepository,
                            PlatformInsightsService platformInsightsService) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.interviewRepository = interviewRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
        this.platformActionLogRepository = platformActionLogRepository;
        this.platformInsightsService = platformInsightsService;
    }

    public List<RecruiterCandidateSummaryDto> getCandidateSummaries(String search,
                                                                    String skill,
                                                                    String experience,
                                                                    String status,
                                                                    Integer minAtsScore,
                                                                    Integer minInterviewScore) {
        List<User> users = userRepository.findAll();
        List<Resume> resumes = resumeRepository.findAll();

        return users.stream()
                .map(user -> toSummary(user, resumes))
                .filter(summary -> matchesName(summary, search))
                .filter(summary -> matchesSkill(summary, skill))
                .filter(summary -> matchesExperience(summary, experience))
                .filter(summary -> matchesStatus(summary, status))
                .filter(summary -> matchesAts(summary, minAtsScore))
                .filter(summary -> matchesInterviewScore(summary, minInterviewScore))
                .sorted(Comparator.comparing(RecruiterCandidateSummaryDto::getCandidateName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    public RecruiterCandidateDetailDto getCandidateDetail(Long candidateId) {
        User user = userRepository.findById(candidateId)
                .orElseThrow(() -> new InterviewException("Candidate not found"));

        List<Resume> resumes = resumeRepository.findAll();
        Resume resume = findBestResumeForUser(user, resumes).orElse(null);

        InterviewAndEvaluation latest = findLatestInterviewAndEvaluation(user.getId());

        RecruiterCandidateDetailDto detail = new RecruiterCandidateDetailDto();
        detail.setCandidateId(user.getId());
        detail.setCandidateName(safe(user.getName(), "Unknown Candidate"));
        detail.setJobRole(latest.interview == null ? "Not provided" : safe(latest.interview.getJobRole(), "Not provided"));
        detail.setStatus(resolveCandidateStatus(user.getId(), latest.interview, latest.evaluation));
        detail.setRecruiterNotes(resolveRecruiterNotes(user.getId()));

        if (resume != null) {
            detail.setResumeSummary(safe(resume.getSummary(), "Resume summary not available."));
            detail.setAtsScore(resume.getAtsScore());
            detail.setResumeStrengths(parseCsv(resume.getStrengths()));
            detail.setResumeWeaknesses(parseCsv(resume.getWeaknesses()));
            detail.setResumeUploadedDate(resume.getCreatedAt());
        } else {
            detail.setResumeSummary("Resume summary not available.");
            detail.setAtsScore(null);
            detail.setResumeStrengths(List.of());
            detail.setResumeWeaknesses(List.of());
            detail.setResumeUploadedDate(null);
        }

        RecruiterCandidateDetailDto.InterviewScores interviewScores = new RecruiterCandidateDetailDto.InterviewScores();
        if (latest.evaluation != null) {
            interviewScores.setOverallScore(latest.evaluation.getOverallScore());
            interviewScores.setTechnicalScore(latest.evaluation.getTechnicalScore());
            interviewScores.setCommunicationScore(latest.evaluation.getCommunicationScore());
            interviewScores.setConfidenceScore(latest.evaluation.getConfidenceScore());
            interviewScores.setProblemSolvingScore(latest.evaluation.getProblemSolvingScore());
            interviewScores.setProfessionalismScore(latest.evaluation.getProfessionalismScore());
            detail.setAiFeedback(parseFeedback(latest.evaluation.getFeedback()));
            detail.setAiRecommendation(safe(latest.evaluation.getRecommendation(), "Pending evaluation"));
        } else {
            detail.setAiFeedback(List.of());
            detail.setAiRecommendation("Pending evaluation");
        }

        detail.setInterviewScores(interviewScores);
        return detail;
    }

    private RecruiterCandidateSummaryDto toSummary(User user, List<Resume> resumes) {
        Resume resume = findBestResumeForUser(user, resumes).orElse(null);
        InterviewAndEvaluation latest = findLatestInterviewAndEvaluation(user.getId());

        RecruiterCandidateSummaryDto summary = new RecruiterCandidateSummaryDto();
        summary.setCandidateId(user.getId());
        summary.setCandidateName(safe(user.getName(), "Unknown Candidate"));
        summary.setJobRole(latest.interview == null ? "Not provided" : safe(latest.interview.getJobRole(), "Not provided"));
        summary.setResumeAtsScore(resume == null ? null : resume.getAtsScore());
        summary.setInterviewScore(latest.evaluation == null ? null : latest.evaluation.getOverallScore());
        summary.setRecommendation(latest.evaluation == null
            ? "Pending evaluation"
            : safe(latest.evaluation.getRecommendation(), "Pending evaluation"));
        summary.setStatus(resolveCandidateStatus(user.getId(), latest.interview, latest.evaluation));
        summary.setRecruiterNotes(resolveRecruiterNotes(user.getId()));
        summary.setResumeUploadedDate(resume == null ? null : resume.getCreatedAt());

        List<String> skills = new ArrayList<>();
        if (resume != null) {
            skills.addAll(parseCsv(resume.getSkills()));
            skills.addAll(parseCsv(resume.getTechnologies()));
        }
        summary.setSkills(skills);
        return summary;
    }

    private boolean matchesName(RecruiterCandidateSummaryDto summary, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        return safe(summary.getCandidateName(), "")
                .toLowerCase(Locale.ROOT)
                .contains(search.trim().toLowerCase(Locale.ROOT));
    }

    private boolean matchesSkill(RecruiterCandidateSummaryDto summary, String skill) {
        if (skill == null || skill.isBlank()) {
            return true;
        }
        String token = skill.trim().toLowerCase(Locale.ROOT);
        return summary.getSkills().stream()
                .map(item -> item.toLowerCase(Locale.ROOT))
                .anyMatch(item -> item.contains(token));
    }

    private boolean matchesExperience(RecruiterCandidateSummaryDto summary, String experience) {
        if (experience == null || experience.isBlank()) {
            return true;
        }
        String token = experience.trim().toLowerCase(Locale.ROOT);
        return safe(summary.getJobRole(), "").toLowerCase(Locale.ROOT).contains(token)
                || summary.getSkills().stream()
                .map(item -> item.toLowerCase(Locale.ROOT))
                .anyMatch(item -> item.contains(token));
    }

    private boolean matchesStatus(RecruiterCandidateSummaryDto summary, String status) {
        if (status == null || status.isBlank()) {
            return true;
        }
        return safe(summary.getStatus(), "new").equalsIgnoreCase(status.trim());
    }

    private boolean matchesAts(RecruiterCandidateSummaryDto summary, Integer minAtsScore) {
        if (minAtsScore == null) {
            return true;
        }
        return summary.getResumeAtsScore() != null && summary.getResumeAtsScore() >= minAtsScore;
    }

    private boolean matchesInterviewScore(RecruiterCandidateSummaryDto summary, Integer minInterviewScore) {
        if (minInterviewScore == null) {
            return true;
        }
        return summary.getInterviewScore() != null && summary.getInterviewScore() >= minInterviewScore;
    }

    private InterviewAndEvaluation findLatestInterviewAndEvaluation(Long userId) {
        List<Interview> interviews = interviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (interviews.isEmpty()) {
            return new InterviewAndEvaluation(null, null);
        }

        Interview latestInterview = interviews.get(0);
        InterviewEvaluation latestEvaluation = null;

        for (Interview interview : interviews) {
            Optional<InterviewEvaluation> evaluation = interviewEvaluationRepository.findByInterviewId(interview.getId());
            if (evaluation.isPresent()) {
                latestInterview = interview;
                latestEvaluation = evaluation.get();
                break;
            }
        }

        return new InterviewAndEvaluation(latestInterview, latestEvaluation);
    }

    private Optional<Resume> findBestResumeForUser(User user, List<Resume> resumes) {
        if (resumes == null || resumes.isEmpty()) {
            return Optional.empty();
        }

        String name = safe(user.getName(), "");
        if (name.isBlank()) {
            return resumes.stream()
                    .max(Comparator.comparing(this::resumeTimestamp));
        }

        String normalizedName = normalizeName(name);
        List<String> tokens = Arrays.stream(name.toLowerCase(Locale.ROOT).split("\\s+"))
                .filter(token -> !token.isBlank())
                .collect(Collectors.toList());

        Resume best = null;
        int bestScore = 0;

        for (Resume resume : resumes) {
            String fileName = safe(resume.getFileName(), "").toLowerCase(Locale.ROOT);
            int score = 0;

            if (!normalizedName.isBlank() && fileName.replace(" ", "").contains(normalizedName)) {
                score += 3;
            }

            for (String token : tokens) {
                if (fileName.contains(token)) {
                    score += 1;
                }
            }

            if (score > bestScore || (score == bestScore && best != null && resumeTimestamp(resume).isAfter(resumeTimestamp(best)))) {
                best = resume;
                bestScore = score;
            }

            if (best == null) {
                best = resume;
            }
        }

        if (bestScore <= 0) {
            return Optional.empty();
        }

        return Optional.ofNullable(best);
    }

    private List<String> parseCsv(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    private List<String> parseFeedback(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split("\\r?\\n"))
                .map(String::trim)
                .filter(item -> !item.isEmpty())
                .collect(Collectors.toList());
    }

    private LocalDateTime resumeTimestamp(Resume resume) {
        if (resume.getUpdatedAt() != null) {
            return resume.getUpdatedAt();
        }
        if (resume.getCreatedAt() != null) {
            return resume.getCreatedAt();
        }
        return LocalDateTime.MIN;
    }

    private String normalizeName(String name) {
        return name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private String safe(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    @Transactional
    public PlatformActionLog shortlistCandidate(Long candidateId, PlatformActionRequest request) {
        return recordAction(candidateId, "shortlisted", request, "candidate");
    }

    @Transactional
    public PlatformActionLog rejectCandidate(Long candidateId, PlatformActionRequest request) {
        return recordAction(candidateId, "rejected", request, "candidate");
    }

    @Transactional
    public PlatformActionLog addCandidateNote(Long candidateId, PlatformActionRequest request) {
        return recordAction(candidateId, "note", request, "candidate");
    }

    public List<PlatformActionLog> getCandidateActions(Long candidateId) {
        return platformActionLogRepository.findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc("candidate", candidateId);
    }

    public List<RecruiterCandidateSummaryDto> compareCandidates(List<Long> candidateIds) {
        if (candidateIds == null || candidateIds.isEmpty()) {
            return List.of();
        }
        return getCandidateSummaries(null, null, null, null, null, null).stream()
                .filter(summary -> candidateIds.contains(summary.getCandidateId()))
                .sorted(Comparator.comparing(RecruiterCandidateSummaryDto::getInterviewScore, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private PlatformActionLog recordAction(Long candidateId, String actionType, PlatformActionRequest request, String subjectType) {
        PlatformActionRequest safeRequest = request == null ? new PlatformActionRequest() : request;
        safeRequest.setSubjectId(candidateId);
        safeRequest.setActionType(actionType);
        safeRequest.setSubjectType(subjectType);
        if (safeRequest.getActorRole() == null || safeRequest.getActorRole().isBlank()) {
            safeRequest.setActorRole("recruiter");
        }
        if (safeRequest.getNotes() == null || safeRequest.getNotes().isBlank()) {
            safeRequest.setNotes(actionType);
        }
        return platformInsightsService.recordAction(safeRequest);
    }

    private String resolveRecruiterNotes(Long candidateId) {
        return platformActionLogRepository.findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc("candidate", candidateId)
                .stream()
                .map(PlatformActionLog::getNotes)
                .filter(note -> note != null && !note.isBlank())
                .findFirst()
                .orElse("No recruiter notes yet.");
    }

    private String resolveCandidateStatus(Long candidateId, Interview interview, InterviewEvaluation evaluation) {
        for (PlatformActionLog action : platformActionLogRepository.findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc("candidate", candidateId)) {
            if ("shortlisted".equalsIgnoreCase(action.getActionType())) {
                return "Shortlisted";
            }
            if ("rejected".equalsIgnoreCase(action.getActionType())) {
                return "Rejected";
            }
        }
        if (evaluation != null || interview != null) {
            return "Interviewed";
        }
        return "New";
    }

    private static class InterviewAndEvaluation {
        private final Interview interview;
        private final InterviewEvaluation evaluation;

        private InterviewAndEvaluation(Interview interview, InterviewEvaluation evaluation) {
            this.interview = interview;
            this.evaluation = evaluation;
        }
    }
}
