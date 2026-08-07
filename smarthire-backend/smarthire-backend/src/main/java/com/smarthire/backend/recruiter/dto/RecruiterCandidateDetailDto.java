package com.smarthire.backend.recruiter.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class RecruiterCandidateDetailDto {

    private Long candidateId;
    private String candidateName;
    private String jobRole;
    private String resumeSummary;
    private Integer atsScore;
    private String status;
    private String recruiterNotes;
    private List<String> resumeStrengths = new ArrayList<>();
    private List<String> resumeWeaknesses = new ArrayList<>();
    private InterviewScores interviewScores = new InterviewScores();
    private List<String> aiFeedback = new ArrayList<>();
    private String aiRecommendation;
    private LocalDateTime resumeUploadedDate;

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

    public String getResumeSummary() {
        return resumeSummary;
    }

    public void setResumeSummary(String resumeSummary) {
        this.resumeSummary = resumeSummary;
    }

    public Integer getAtsScore() {
        return atsScore;
    }

    public void setAtsScore(Integer atsScore) {
        this.atsScore = atsScore;
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

    public List<String> getResumeStrengths() {
        return resumeStrengths;
    }

    public void setResumeStrengths(List<String> resumeStrengths) {
        this.resumeStrengths = resumeStrengths;
    }

    public List<String> getResumeWeaknesses() {
        return resumeWeaknesses;
    }

    public void setResumeWeaknesses(List<String> resumeWeaknesses) {
        this.resumeWeaknesses = resumeWeaknesses;
    }

    public InterviewScores getInterviewScores() {
        return interviewScores;
    }

    public void setInterviewScores(InterviewScores interviewScores) {
        this.interviewScores = interviewScores;
    }

    public List<String> getAiFeedback() {
        return aiFeedback;
    }

    public void setAiFeedback(List<String> aiFeedback) {
        this.aiFeedback = aiFeedback;
    }

    public String getAiRecommendation() {
        return aiRecommendation;
    }

    public void setAiRecommendation(String aiRecommendation) {
        this.aiRecommendation = aiRecommendation;
    }

    public LocalDateTime getResumeUploadedDate() {
        return resumeUploadedDate;
    }

    public void setResumeUploadedDate(LocalDateTime resumeUploadedDate) {
        this.resumeUploadedDate = resumeUploadedDate;
    }

    public static class InterviewScores {

        private Integer overallScore;
        private Integer technicalScore;
        private Integer communicationScore;
        private Integer confidenceScore;
        private Integer problemSolvingScore;
        private Integer professionalismScore;

        public Integer getOverallScore() {
            return overallScore;
        }

        public void setOverallScore(Integer overallScore) {
            this.overallScore = overallScore;
        }

        public Integer getTechnicalScore() {
            return technicalScore;
        }

        public void setTechnicalScore(Integer technicalScore) {
            this.technicalScore = technicalScore;
        }

        public Integer getCommunicationScore() {
            return communicationScore;
        }

        public void setCommunicationScore(Integer communicationScore) {
            this.communicationScore = communicationScore;
        }

        public Integer getConfidenceScore() {
            return confidenceScore;
        }

        public void setConfidenceScore(Integer confidenceScore) {
            this.confidenceScore = confidenceScore;
        }

        public Integer getProblemSolvingScore() {
            return problemSolvingScore;
        }

        public void setProblemSolvingScore(Integer problemSolvingScore) {
            this.problemSolvingScore = problemSolvingScore;
        }

        public Integer getProfessionalismScore() {
            return professionalismScore;
        }

        public void setProfessionalismScore(Integer professionalismScore) {
            this.professionalismScore = professionalismScore;
        }
    }
}
