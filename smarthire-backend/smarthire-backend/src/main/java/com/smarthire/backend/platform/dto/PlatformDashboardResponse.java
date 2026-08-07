package com.smarthire.backend.platform.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PlatformDashboardResponse {

    private List<StatCard> stats = new ArrayList<>();
    private List<ActivityItem> recentActivities = new ArrayList<>();
    private List<UserItem> users = new ArrayList<>();
    private List<ConfigItem> configuration = new ArrayList<>();
    private List<TrendPoint> weeklyProgress = new ArrayList<>();
    private List<TrendPoint> monthlyProgress = new ArrayList<>();
    private List<TrendPoint> interviewHistoryCharts = new ArrayList<>();
    private List<TrendPoint> skillDistribution = new ArrayList<>();
    private List<TrendPoint> atsScoreTrends = new ArrayList<>();
    private List<TrendPoint> communicationTrends = new ArrayList<>();
    private List<TrendPoint> confidenceTrends = new ArrayList<>();
    private List<TrendPoint> technicalTrends = new ArrayList<>();
    private List<RankingItem> candidateRanking = new ArrayList<>();
    private List<RankingItem> leaderboard = new ArrayList<>();
    private List<RankingItem> topSkills = new ArrayList<>();
    private List<RankingItem> weakSkills = new ArrayList<>();

    public List<StatCard> getStats() {
        return stats;
    }

    public void setStats(List<StatCard> stats) {
        this.stats = stats;
    }

    public List<ActivityItem> getRecentActivities() {
        return recentActivities;
    }

    public void setRecentActivities(List<ActivityItem> recentActivities) {
        this.recentActivities = recentActivities;
    }

    public List<UserItem> getUsers() {
        return users;
    }

    public void setUsers(List<UserItem> users) {
        this.users = users;
    }

    public List<ConfigItem> getConfiguration() {
        return configuration;
    }

    public void setConfiguration(List<ConfigItem> configuration) {
        this.configuration = configuration;
    }

    public List<TrendPoint> getWeeklyProgress() {
        return weeklyProgress;
    }

    public void setWeeklyProgress(List<TrendPoint> weeklyProgress) {
        this.weeklyProgress = weeklyProgress;
    }

    public List<TrendPoint> getMonthlyProgress() {
        return monthlyProgress;
    }

    public void setMonthlyProgress(List<TrendPoint> monthlyProgress) {
        this.monthlyProgress = monthlyProgress;
    }

    public List<TrendPoint> getInterviewHistoryCharts() {
        return interviewHistoryCharts;
    }

    public void setInterviewHistoryCharts(List<TrendPoint> interviewHistoryCharts) {
        this.interviewHistoryCharts = interviewHistoryCharts;
    }

    public List<TrendPoint> getSkillDistribution() {
        return skillDistribution;
    }

    public void setSkillDistribution(List<TrendPoint> skillDistribution) {
        this.skillDistribution = skillDistribution;
    }

    public List<TrendPoint> getAtsScoreTrends() {
        return atsScoreTrends;
    }

    public void setAtsScoreTrends(List<TrendPoint> atsScoreTrends) {
        this.atsScoreTrends = atsScoreTrends;
    }

    public List<TrendPoint> getCommunicationTrends() {
        return communicationTrends;
    }

    public void setCommunicationTrends(List<TrendPoint> communicationTrends) {
        this.communicationTrends = communicationTrends;
    }

    public List<TrendPoint> getConfidenceTrends() {
        return confidenceTrends;
    }

    public void setConfidenceTrends(List<TrendPoint> confidenceTrends) {
        this.confidenceTrends = confidenceTrends;
    }

    public List<TrendPoint> getTechnicalTrends() {
        return technicalTrends;
    }

    public void setTechnicalTrends(List<TrendPoint> technicalTrends) {
        this.technicalTrends = technicalTrends;
    }

    public List<RankingItem> getCandidateRanking() {
        return candidateRanking;
    }

    public void setCandidateRanking(List<RankingItem> candidateRanking) {
        this.candidateRanking = candidateRanking;
    }

    public List<RankingItem> getLeaderboard() {
        return leaderboard;
    }

    public void setLeaderboard(List<RankingItem> leaderboard) {
        this.leaderboard = leaderboard;
    }

    public List<RankingItem> getTopSkills() {
        return topSkills;
    }

    public void setTopSkills(List<RankingItem> topSkills) {
        this.topSkills = topSkills;
    }

    public List<RankingItem> getWeakSkills() {
        return weakSkills;
    }

    public void setWeakSkills(List<RankingItem> weakSkills) {
        this.weakSkills = weakSkills;
    }

    public static class StatCard {
        private String label;
        private String value;
        private String subtext;

        public StatCard() {
        }

        public StatCard(String label, String value, String subtext) {
            this.label = label;
            this.value = value;
            this.subtext = subtext;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }

        public String getSubtext() {
            return subtext;
        }

        public void setSubtext(String subtext) {
            this.subtext = subtext;
        }
    }

    public static class ActivityItem {
        private String title;
        private String description;
        private LocalDateTime createdAt;

        public ActivityItem() {
        }

        public ActivityItem(String title, String description, LocalDateTime createdAt) {
            this.title = title;
            this.description = description;
            this.createdAt = createdAt;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class UserItem {
        private Long id;
        private String name;
        private String email;
        private String role;
        private String status;

        public UserItem() {
        }

        public UserItem(Long id, String name, String email, String role, String status) {
            this.id = id;
            this.name = name;
            this.email = email;
            this.role = role;
            this.status = status;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }

    public static class ConfigItem {
        private String key;
        private String value;

        public ConfigItem() {
        }

        public ConfigItem(String key, String value) {
            this.key = key;
            this.value = value;
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }

    public static class TrendPoint {
        private String label;
        private Integer value;

        public TrendPoint() {
        }

        public TrendPoint(String label, Integer value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Integer getValue() {
            return value;
        }

        public void setValue(Integer value) {
            this.value = value;
        }
    }

    public static class RankingItem {
        private Long id;
        private String label;
        private Integer score;
        private String meta;

        public RankingItem() {
        }

        public RankingItem(Long id, String label, Integer score, String meta) {
            this.id = id;
            this.label = label;
            this.score = score;
            this.meta = meta;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Integer getScore() {
            return score;
        }

        public void setScore(Integer score) {
            this.score = score;
        }

        public String getMeta() {
            return meta;
        }

        public void setMeta(String meta) {
            this.meta = meta;
        }
    }
}
