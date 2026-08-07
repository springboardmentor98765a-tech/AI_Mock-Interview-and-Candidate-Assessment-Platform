package com.smarthire.backend.resume.dto;

import java.util.List;

public class ResumeAnalysisResponse {

    private boolean success;
    private String fileName;
    private int pageCount;
    private List<String> skills;
    private String experience;
    private List<String> technologies;
    private String education;
    private String summary;
    private String message;

    // AI Skill Extraction Fields
    private List<String> technicalSkills;
    private List<String> softSkills;
    private List<String> programmingLanguages;
    private List<String> frameworks;
    private List<String> libraries;
    private List<String> databases;
    private List<String> tools;
    private List<String> cloudTechnologies;
    private List<String> certifications;
    private List<String> experienceSummary;
    private List<String> projects;

    // ATS Scoring fields
    private Integer atsScore;
    private Integer keywordScore;
    private Integer formattingScore;
    private Integer skillsScore;
    private Integer experienceScore;
    private Integer educationScore;

    // Missing Skills Detection
    private List<String> missingSkills;

    // Resume Improvement fields
    private List<String> strengths;
    private List<String> weaknesses;
    private List<String> improvementSuggestions;

    public ResumeAnalysisResponse() {
    }

    public ResumeAnalysisResponse(boolean success, String fileName, int pageCount,
                                  List<String> skills, String experience,
                                  List<String> technologies, String education,
                                  String summary, String message) {
        this.success = success;
        this.fileName = fileName;
        this.pageCount = pageCount;
        this.skills = skills;
        this.experience = experience;
        this.technologies = technologies;
        this.education = education;
        this.summary = summary;
        this.message = message;
    }

    public ResumeAnalysisResponse(boolean success, String fileName, int pageCount,
                                  List<String> skills, String experience,
                                  List<String> technologies, String education,
                                  String summary, String message,
                                  Integer atsScore, Integer keywordScore,
                                  Integer formattingScore, Integer skillsScore,
                                  Integer experienceScore, Integer educationScore) {
        this(success, fileName, pageCount, skills, experience, technologies, education, summary, message);
        this.atsScore = atsScore;
        this.keywordScore = keywordScore;
        this.formattingScore = formattingScore;
        this.skillsScore = skillsScore;
        this.experienceScore = experienceScore;
        this.educationScore = educationScore;
    }

    public ResumeAnalysisResponse(boolean success, String fileName, int pageCount,
                                  List<String> skills, String experience,
                                  List<String> technologies, String education,
                                  String summary, String message,
                                  Integer atsScore, Integer keywordScore,
                                  Integer formattingScore, Integer skillsScore,
                                  Integer experienceScore, Integer educationScore,
                                  List<String> missingSkills,
                                  List<String> strengths,
                                  List<String> weaknesses,
                                  List<String> improvementSuggestions) {
        this(success, fileName, pageCount, skills, experience, technologies, education, summary, message,
                atsScore, keywordScore, formattingScore, skillsScore, experienceScore, educationScore);
        this.missingSkills = missingSkills;
        this.strengths = strengths;
        this.weaknesses = weaknesses;
        this.improvementSuggestions = improvementSuggestions;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public int getPageCount() {
        return pageCount;
    }

    public void setPageCount(int pageCount) {
        this.pageCount = pageCount;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }

    public String getExperience() {
        return experience;
    }

    public void setExperience(String experience) {
        this.experience = experience;
    }

    public List<String> getTechnologies() {
        return technologies;
    }

    public void setTechnologies(List<String> technologies) {
        this.technologies = technologies;
    }

    public String getEducation() {
        return education;
    }

    public void setEducation(String education) {
        this.education = education;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<String> getTechnicalSkills() {
        return technicalSkills;
    }

    public void setTechnicalSkills(List<String> technicalSkills) {
        this.technicalSkills = technicalSkills;
    }

    public List<String> getSoftSkills() {
        return softSkills;
    }

    public void setSoftSkills(List<String> softSkills) {
        this.softSkills = softSkills;
    }

    public List<String> getProgrammingLanguages() {
        return programmingLanguages;
    }

    public void setProgrammingLanguages(List<String> programmingLanguages) {
        this.programmingLanguages = programmingLanguages;
    }

    public List<String> getFrameworks() {
        return frameworks;
    }

    public void setFrameworks(List<String> frameworks) {
        this.frameworks = frameworks;
    }

    public List<String> getLibraries() {
        return libraries;
    }

    public void setLibraries(List<String> libraries) {
        this.libraries = libraries;
    }

    public List<String> getDatabases() {
        return databases;
    }

    public void setDatabases(List<String> databases) {
        this.databases = databases;
    }

    public List<String> getTools() {
        return tools;
    }

    public void setTools(List<String> tools) {
        this.tools = tools;
    }

    public List<String> getCloudTechnologies() {
        return cloudTechnologies;
    }

    public void setCloudTechnologies(List<String> cloudTechnologies) {
        this.cloudTechnologies = cloudTechnologies;
    }

    public List<String> getCertifications() {
        return certifications;
    }

    public void setCertifications(List<String> certifications) {
        this.certifications = certifications;
    }

    public List<String> getExperienceSummary() {
        return experienceSummary;
    }

    public void setExperienceSummary(List<String> experienceSummary) {
        this.experienceSummary = experienceSummary;
    }

    public List<String> getProjects() {
        return projects;
    }

    public void setProjects(List<String> projects) {
        this.projects = projects;
    }

    public Integer getAtsScore() {
        return atsScore;
    }

    public void setAtsScore(Integer atsScore) {
        this.atsScore = atsScore;
    }

    public Integer getKeywordScore() {
        return keywordScore;
    }

    public void setKeywordScore(Integer keywordScore) {
        this.keywordScore = keywordScore;
    }

    public Integer getFormattingScore() {
        return formattingScore;
    }

    public void setFormattingScore(Integer formattingScore) {
        this.formattingScore = formattingScore;
    }

    public Integer getSkillsScore() {
        return skillsScore;
    }

    public void setSkillsScore(Integer skillsScore) {
        this.skillsScore = skillsScore;
    }

    public Integer getExperienceScore() {
        return experienceScore;
    }

    public void setExperienceScore(Integer experienceScore) {
        this.experienceScore = experienceScore;
    }

    public Integer getEducationScore() {
        return educationScore;
    }

    public void setEducationScore(Integer educationScore) {
        this.educationScore = educationScore;
    }

    public List<String> getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(List<String> missingSkills) {
        this.missingSkills = missingSkills;
    }

    public List<String> getStrengths() {
        return strengths;
    }

    public void setStrengths(List<String> strengths) {
        this.strengths = strengths;
    }

    public List<String> getWeaknesses() {
        return weaknesses;
    }

    public void setWeaknesses(List<String> weaknesses) {
        this.weaknesses = weaknesses;
    }

    public List<String> getImprovementSuggestions() {
        return improvementSuggestions;
    }

    public void setImprovementSuggestions(List<String> improvementSuggestions) {
        this.improvementSuggestions = improvementSuggestions;
    }
}
