package com.smarthire.backend.interview.dto;

import java.util.ArrayList;
import java.util.List;

public class CareerRoadmapResponse {

    private String summary;
    private List<String> careerRoadmap = new ArrayList<>();
    private List<String> recommendedSkills = new ArrayList<>();
    private List<String> certifications = new ArrayList<>();
    private List<String> learningResources = new ArrayList<>();
    private List<String> practiceProjects = new ArrayList<>();
    private String provider;

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getCareerRoadmap() {
        return careerRoadmap;
    }

    public void setCareerRoadmap(List<String> careerRoadmap) {
        this.careerRoadmap = careerRoadmap;
    }

    public List<String> getRecommendedSkills() {
        return recommendedSkills;
    }

    public void setRecommendedSkills(List<String> recommendedSkills) {
        this.recommendedSkills = recommendedSkills;
    }

    public List<String> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<String> certifications) {
        this.certifications = certifications;
    }

    public List<String> getLearningResources() {
        return learningResources;
    }

    public void setLearningResources(List<String> learningResources) {
        this.learningResources = learningResources;
    }

    public List<String> getPracticeProjects() {
        return practiceProjects;
    }

    public void setPracticeProjects(List<String> practiceProjects) {
        this.practiceProjects = practiceProjects;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }
}
