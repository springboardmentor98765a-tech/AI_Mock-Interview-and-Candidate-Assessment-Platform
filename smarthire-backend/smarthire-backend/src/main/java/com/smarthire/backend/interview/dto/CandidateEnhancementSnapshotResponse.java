package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class CandidateEnhancementSnapshotResponse {

    private CareerRoadmapResponse careerRoadmap = new CareerRoadmapResponse();
    private List<NotificationItem> notifications = new ArrayList<>();
    private ProfileCompletion profileCompletion = new ProfileCompletion();
    private List<AssessmentSummary> assessments = new ArrayList<>();

    public CareerRoadmapResponse getCareerRoadmap() {
        return careerRoadmap;
    }

    public void setCareerRoadmap(CareerRoadmapResponse careerRoadmap) {
        this.careerRoadmap = careerRoadmap;
    }

    public List<NotificationItem> getNotifications() {
        return notifications;
    }

    public void setNotifications(List<NotificationItem> notifications) {
        this.notifications = notifications;
    }

    public ProfileCompletion getProfileCompletion() {
        return profileCompletion;
    }

    public void setProfileCompletion(ProfileCompletion profileCompletion) {
        this.profileCompletion = profileCompletion;
    }

    public List<AssessmentSummary> getAssessments() {
        return assessments;
    }

    public void setAssessments(List<AssessmentSummary> assessments) {
        this.assessments = assessments;
    }

    public static class NotificationItem {
        private String type;
        private String title;
        private String message;
        private String createdAt;

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public String getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(String createdAt) {
            this.createdAt = createdAt;
        }
    }

    public static class ProfileCompletion {
        private int completionPercentage;
        private List<String> checklist = new ArrayList<>();
        private List<String> missingItems = new ArrayList<>();

        public int getCompletionPercentage() {
            return completionPercentage;
        }

        public void setCompletionPercentage(int completionPercentage) {
            this.completionPercentage = completionPercentage;
        }

        public List<String> getChecklist() {
            return checklist;
        }

        public void setChecklist(List<String> checklist) {
            this.checklist = checklist;
        }

        public List<String> getMissingItems() {
            return missingItems;
        }

        public void setMissingItems(List<String> missingItems) {
            this.missingItems = missingItems;
        }
    }

    public static class AssessmentSummary {
        private String assessmentType;
        private Integer score;
        private Integer total;
        private Integer durationSeconds;
        private List<String> insights = new ArrayList<>();

        public String getAssessmentType() {
            return assessmentType;
        }

        public void setAssessmentType(String assessmentType) {
            this.assessmentType = assessmentType;
        }

        public Integer getScore() {
            return score;
        }

        public void setScore(Integer score) {
            this.score = score;
        }

        public Integer getTotal() {
            return total;
        }

        public void setTotal(Integer total) {
            this.total = total;
        }

        public Integer getDurationSeconds() {
            return durationSeconds;
        }

        public void setDurationSeconds(Integer durationSeconds) {
            this.durationSeconds = durationSeconds;
        }

        public List<String> getInsights() {
            return insights;
        }

        public void setInsights(List<String> insights) {
            this.insights = insights;
        }
    }
}
