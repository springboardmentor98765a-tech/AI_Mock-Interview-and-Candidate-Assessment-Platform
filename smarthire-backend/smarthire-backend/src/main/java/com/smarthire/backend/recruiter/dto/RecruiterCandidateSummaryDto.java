package com.smarthire.backend.recruiter.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class RecruiterCandidateSummaryDto {

    private Long candidateId;
    private String candidateName;
    private String jobRole;
    private Integer resumeAtsScore;
    private Integer interviewScore;
    private String recommendation;
    private String status;
    private String recruiterNotes;
    private LocalDateTime resumeUploadedDate;
    private List<String> skills = new ArrayList<>();

    public Long getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getJobRole() {
        return jobRole;
    }

    public void setJobRole(String jobRole) {
        this.jobRole = jobRole;
    }

    public Integer getResumeAtsScore() {
        return resumeAtsScore;
    }

    public void setResumeAtsScore(Integer resumeAtsScore) {
        this.resumeAtsScore = resumeAtsScore;
    }

    public Integer getInterviewScore() {
        return interviewScore;
    }

    public void setInterviewScore(Integer interviewScore) {
        this.interviewScore = interviewScore;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRecruiterNotes() {
        return recruiterNotes;
    }

    public void setRecruiterNotes(String recruiterNotes) {
        this.recruiterNotes = recruiterNotes;
    }

    public LocalDateTime getResumeUploadedDate() {
        return resumeUploadedDate;
    }

    public void setResumeUploadedDate(LocalDateTime resumeUploadedDate) {
        this.resumeUploadedDate = resumeUploadedDate;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills;
    }
}
