package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class CareerRoadmapRequest {

    private Long userId;
    private String currentRole;
    private String targetRole;
    private String experienceLevel;
    private List<String> currentSkills = new ArrayList<>();

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getCurrentRole() {
        return currentRole;
    }

    public void setCurrentRole(String currentRole) {
        this.currentRole = currentRole;
    }

    public String getTargetRole() {
        return targetRole;
    }

    public void setTargetRole(String targetRole) {
        this.targetRole = targetRole;
    }

    public String getExperienceLevel() {
        return experienceLevel;
    }

    public void setExperienceLevel(String experienceLevel) {
        this.experienceLevel = experienceLevel;
    }

    public List<String> getCurrentSkills() {
        return currentSkills;
    }

    public void setCurrentSkills(List<String> currentSkills) {
        this.currentSkills = currentSkills;
    }
}
