package com.smarthire.backend.platform.service;

import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import com.smarthire.backend.platform.dto.PlatformActionRequest;
import com.smarthire.backend.platform.dto.PlatformDashboardResponse;
import com.smarthire.backend.platform.entity.PlatformActionLog;
import com.smarthire.backend.platform.repository.PlatformActionLogRepository;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PlatformInsightsService {

    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;
    private final PlatformActionLogRepository platformActionLogRepository;

    public PlatformInsightsService(UserRepository userRepository,
                                   ResumeRepository resumeRepository,
                                   InterviewRepository interviewRepository,
                                   InterviewEvaluationRepository interviewEvaluationRepository,
                                   PlatformActionLogRepository platformActionLogRepository) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.interviewRepository = interviewRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
        this.platformActionLogRepository = platformActionLogRepository;
    }

    @Transactional
    public PlatformActionLog recordAction(PlatformActionRequest request) {
        PlatformActionLog actionLog = new PlatformActionLog();
        actionLog.setActorId(request.getActorId());
        actionLog.setActorRole(normalize(request.getActorRole(), "recruiter"));
        actionLog.setActionType(normalize(request.getActionType(), "update"));
        actionLog.setSubjectType(normalize(request.getSubjectType(), "candidate"));
        actionLog.setSubjectId(request.getSubjectId());
        actionLog.setNotes(normalize(request.getNotes(), ""));
        actionLog.setDetails(normalize(request.getDetails(), ""));
        return platformActionLogRepository.save(actionLog);
    }

    public PlatformDashboardResponse buildDashboard() {
        PlatformDashboardResponse response = new PlatformDashboardResponse();

        List<User> users = userRepository.findAll();
        List<Resume> resumes = resumeRepository.findAll();
        List<Interview> interviews = interviewRepository.findAll();
        List<InterviewEvaluation> evaluations = interviewRepository.findAll().stream()
                .map(interview -> interviewEvaluationRepository.findByInterviewId(interview.getId()).orElse(null))
                .filter(item -> item != null)
                .collect(Collectors.toList());
        List<PlatformActionLog> actions = platformActionLogRepository.findTop20ByOrderByCreatedAtDesc();

        response.setStats(buildStats(users, resumes, interviews, evaluations, actions));
        response.setRecentActivities(actions.stream()
                .map(action -> new PlatformDashboardResponse.ActivityItem(
                        action.getActionType(),
                        buildActionDescription(action),
                        action.getCreatedAt()
                ))
                .collect(Collectors.toList()));
        response.setUsers(users.stream()
                .map(user -> new PlatformDashboardResponse.UserItem(
                        user.getId(),
                        normalize(user.getName(), "Unknown User"),
                        normalize(user.getEmail(), "Not available"),
                        normalize(user.getRole(), "candidate"),
                        resolveUserStatus(user)
                ))
                .collect(Collectors.toList()));
        response.setConfiguration(List.of(
                new PlatformDashboardResponse.ConfigItem("Database", "Enabled"),
                new PlatformDashboardResponse.ConfigItem("AI Engine", "Gemini"),
                new PlatformDashboardResponse.ConfigItem("Interview Module", "Active"),
                new PlatformDashboardResponse.ConfigItem("Recruiter Actions", "Persisted"),
                new PlatformDashboardResponse.ConfigItem("Admin Portal", "Active")
        ));
        response.setWeeklyProgress(buildWeeklyProgress(interviews));
        response.setMonthlyProgress(buildMonthlyProgress(interviews));
        response.setInterviewHistoryCharts(buildInterviewHistoryCharts(interviews));
        response.setSkillDistribution(buildSkillDistribution(resumes));
        response.setAtsScoreTrends(buildAtsTrends(resumes));
        response.setCommunicationTrends(buildCommunicationTrends(evaluations));
        response.setConfidenceTrends(buildConfidenceTrends(evaluations));
        response.setTechnicalTrends(buildTechnicalTrends(evaluations));
        response.setCandidateRanking(buildCandidateRanking(users, interviews, evaluations, resumes));
        response.setLeaderboard(buildLeaderboard(users, interviews, evaluations, resumes));
        response.setTopSkills(buildTopSkills(resumes));
        response.setWeakSkills(buildWeakSkills(resumes));
        return response;
    }

    private List<PlatformDashboardResponse.StatCard> buildStats(List<User> users,
                                                                List<Resume> resumes,
                                                                List<Interview> interviews,
                                                                List<InterviewEvaluation> evaluations,
                                                                List<PlatformActionLog> actions) {
        long recruiters = users.stream().filter(user -> "recruiter".equalsIgnoreCase(user.getRole())).count();
        long candidates = users.stream().filter(user -> "candidate".equalsIgnoreCase(user.getRole())).count();
        long admins = users.stream().filter(user -> "admin".equalsIgnoreCase(user.getRole())).count();

        return List.of(
                new PlatformDashboardResponse.StatCard("Total Users", String.valueOf(users.size()), candidates + " candidates / " + recruiters + " recruiters / " + admins + " admins"),
                new PlatformDashboardResponse.StatCard("Resumes", String.valueOf(resumes.size()), "Uploaded and analyzed profiles"),
                new PlatformDashboardResponse.StatCard("Interviews", String.valueOf(interviews.size()), evaluations.size() + " evaluated sessions"),
                new PlatformDashboardResponse.StatCard("Platform Actions", String.valueOf(actions.size()), "Latest recruiter/admin activity"),
                new PlatformDashboardResponse.StatCard("AI Usage", String.valueOf(evaluations.size() + resumes.size()), "Resume and interview AI requests"),
                new PlatformDashboardResponse.StatCard("System Health", "99%", "Stable")
        );
    }

    private String buildActionDescription(PlatformActionLog action) {
        String subject = normalize(action.getSubjectType(), "candidate");
        String notes = normalize(action.getNotes(), "");
        if (!notes.isBlank()) {
            return subject + ": " + notes;
        }
        return normalize(action.getActionType(), "update") + " on " + subject;
    }

    private String resolveUserStatus(User user) {
        if (user == null || user.getRole() == null) {
            return "Active";
        }
        if ("admin".equalsIgnoreCase(user.getRole())) {
            return "Active";
        }
        return "Active";
    }

    private List<PlatformDashboardResponse.TrendPoint> buildWeeklyProgress(List<Interview> interviews) {
        Map<String, Integer> counts = interviews.stream()
                .collect(Collectors.groupingBy(interview -> interview.getCreatedAt().getDayOfWeek().name().substring(0, 3), Collectors.summingInt(item -> 1)));
        return List.of("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN").stream()
                .map(day -> new PlatformDashboardResponse.TrendPoint(day, counts.getOrDefault(day, 0)))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildMonthlyProgress(List<Interview> interviews) {
        Map<String, Integer> counts = interviews.stream()
                .collect(Collectors.groupingBy(interview -> String.valueOf(interview.getCreatedAt().getMonthValue()), Collectors.summingInt(item -> 1)));
        return List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12").stream()
                .map(month -> new PlatformDashboardResponse.TrendPoint(month, counts.getOrDefault(month, 0)))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildInterviewHistoryCharts(List<Interview> interviews) {
        return interviews.stream()
                .sorted(Comparator.comparing(Interview::getCreatedAt).reversed())
                .limit(10)
                .map(interview -> new PlatformDashboardResponse.TrendPoint(
                        normalize(interview.getJobRole(), "Interview"),
                        interview.getCreatedAt().getDayOfMonth()
                ))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildSkillDistribution(List<Resume> resumes) {
        Map<String, Integer> skillCounts = resumes.stream()
                .flatMap(resume -> splitList(resume.getSkills()).stream())
                .collect(Collectors.groupingBy(item -> item.toLowerCase(Locale.ROOT), Collectors.summingInt(item -> 1)));
        return skillCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(entry -> new PlatformDashboardResponse.TrendPoint(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildAtsTrends(List<Resume> resumes) {
        return resumes.stream()
                .sorted(Comparator.comparing(Resume::getUpdatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(8)
                .map(resume -> new PlatformDashboardResponse.TrendPoint(
                        normalize(resume.getFileName(), "Resume"),
                        resume.getAtsScore() == null ? 0 : resume.getAtsScore()
                ))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildCommunicationTrends(List<InterviewEvaluation> evaluations) {
        return evaluations.stream()
                .sorted(Comparator.comparing(InterviewEvaluation::getEvaluationDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(8)
                .map(evaluation -> new PlatformDashboardResponse.TrendPoint("Communication", safeNumber(evaluation.getCommunicationScore())))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildConfidenceTrends(List<InterviewEvaluation> evaluations) {
        return evaluations.stream()
                .sorted(Comparator.comparing(InterviewEvaluation::getEvaluationDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(8)
                .map(evaluation -> new PlatformDashboardResponse.TrendPoint("Confidence", safeNumber(evaluation.getConfidenceScore())))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.TrendPoint> buildTechnicalTrends(List<InterviewEvaluation> evaluations) {
        return evaluations.stream()
                .sorted(Comparator.comparing(InterviewEvaluation::getEvaluationDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(8)
                .map(evaluation -> new PlatformDashboardResponse.TrendPoint("Technical", evaluation.getTechnicalScore()))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.RankingItem> buildCandidateRanking(List<User> users,
                                                                              List<Interview> interviews,
                                                                              List<InterviewEvaluation> evaluations,
                                                                              List<Resume> resumes) {
        return users.stream()
                .filter(user -> "candidate".equalsIgnoreCase(user.getRole()))
                .map(user -> {
                    int score = evaluations.stream()
                            .filter(evaluation -> evaluation.getInterviewId() != null
                                    && interviews.stream()
                                            .anyMatch(interview -> interview.getId().equals(evaluation.getInterviewId())
                                                    && user.getId().equals(interview.getUserId())))
                            .mapToInt(InterviewEvaluation::getOverallScore)
                            .max()
                            .orElse(0);
                    Integer ats = maxAtsScoreForUser(user, resumes);
                    int atsValue = ats == null ? 0 : ats;
                    int overall = Math.round((score * 2 + atsValue) / 3.0f);
                    return new PlatformDashboardResponse.RankingItem(user.getId(), normalize(user.getName(), "Candidate"), overall, "Candidate");
                })
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.RankingItem> buildLeaderboard(List<User> users,
                                                                          List<Interview> interviews,
                                                                          List<InterviewEvaluation> evaluations,
                                                                          List<Resume> resumes) {
        return users.stream()
                .filter(user -> "candidate".equalsIgnoreCase(user.getRole()))
                .map(user -> {
                    int score = evaluations.stream()
                            .filter(evaluation -> evaluation.getInterviewId() != null
                                    && interviews.stream()
                                            .anyMatch(interview -> interview.getId().equals(evaluation.getInterviewId())
                                                    && user.getId().equals(interview.getUserId())))
                            .mapToInt(InterviewEvaluation::getOverallScore)
                            .max()
                            .orElse(0);
                    Integer ats = maxAtsScoreForUser(user, resumes);
                    int atsValue = ats == null ? 0 : ats;
                    int overall = Math.round((score * 2 + atsValue) / 3.0f);
                    return new PlatformDashboardResponse.RankingItem(user.getId(), normalize(user.getName(), "Candidate"), overall, normalize(user.getEmail(), ""));
                })
                .sorted(Comparator.comparing(PlatformDashboardResponse.RankingItem::getScore, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(10)
                .collect(Collectors.toList());
    }

    private Integer maxAtsScoreForUser(User user, List<Resume> resumes) {
        if (resumes == null || resumes.isEmpty()) {
            return null;
        }

        // Primary lookup: resumes actually owned by this candidate.
        List<Resume> owned = resumes.stream()
                .filter(resume -> resume.getUserId() != null && resume.getUserId().equals(user.getId()))
                .collect(Collectors.toList());
        if (!owned.isEmpty()) {
            return owned.stream()
                    .map(Resume::getAtsScore)
                    .filter(value -> value != null)
                    .max(Integer::compareTo)
                    .orElse(null);
        }

        // Legacy fallback: only unowned resumes (userId == null) may be
        // filename-matched. A resume owned by another candidate must never
        // be selected for this candidate.
        String userName = normalize(user.getName(), "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return resumes.stream()
                .filter(resume -> resume.getUserId() == null)
                .filter(resume -> {
                    String resumeName = normalize(resume.getFileName(), "").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
                    return userName.isBlank() || resumeName.contains(userName);
                })
                .map(Resume::getAtsScore)
                .filter(value -> value != null)
                .max(Integer::compareTo)
                .orElse(null);
    }

    private List<PlatformDashboardResponse.RankingItem> buildTopSkills(List<Resume> resumes) {
        Map<String, Integer> counts = resumes.stream()
                .flatMap(resume -> splitList(resume.getTechnologies()).stream())
                .collect(Collectors.groupingBy(item -> item.toLowerCase(Locale.ROOT), Collectors.summingInt(item -> 1)));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(entry -> new PlatformDashboardResponse.RankingItem(null, entry.getKey(), entry.getValue(), "Top skill"))
                .collect(Collectors.toList());
    }

    private List<PlatformDashboardResponse.RankingItem> buildWeakSkills(List<Resume> resumes) {
        Map<String, Integer> counts = resumes.stream()
                .flatMap(resume -> splitList(resume.getMissingSkills()).stream())
                .collect(Collectors.groupingBy(item -> item.toLowerCase(Locale.ROOT), Collectors.summingInt(item -> 1)));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .map(entry -> new PlatformDashboardResponse.RankingItem(null, entry.getKey(), entry.getValue(), "Needs improvement"))
                .collect(Collectors.toList());
    }

    private List<String> splitList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return List.of(raw.split(","));
    }

    private int safeNumber(Integer value) {
        return value == null ? 0 : value;
    }

    private String normalize(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
