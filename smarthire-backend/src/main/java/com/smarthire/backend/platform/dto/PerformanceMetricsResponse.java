package com.smarthire.backend.platform.dto;

import java.util.LinkedHashMap;
import java.util.Map;

public class PerformanceMetricsResponse {
    private long totalUsers;
    private long totalResumes;
    private long totalInterviews;
    private long evaluatedInterviews;
    private double averageOverallScore;
    private double averageCommunicationScore;
    private double averageConfidenceScore;
    private double averageTechnicalScore;
    private double averageProfessionalismScore;
    private double averagePronunciationScore;
    private double evaluationCoveragePercent;
    private Map<String,String> benchmarkStatus = new LinkedHashMap<>();

    public long getTotalUsers(){return totalUsers;} public void setTotalUsers(long v){totalUsers=v;}
    public long getTotalResumes(){return totalResumes;} public void setTotalResumes(long v){totalResumes=v;}
    public long getTotalInterviews(){return totalInterviews;} public void setTotalInterviews(long v){totalInterviews=v;}
    public long getEvaluatedInterviews(){return evaluatedInterviews;} public void setEvaluatedInterviews(long v){evaluatedInterviews=v;}
    public double getAverageOverallScore(){return averageOverallScore;} public void setAverageOverallScore(double v){averageOverallScore=v;}
    public double getAverageCommunicationScore(){return averageCommunicationScore;} public void setAverageCommunicationScore(double v){averageCommunicationScore=v;}
    public double getAverageConfidenceScore(){return averageConfidenceScore;} public void setAverageConfidenceScore(double v){averageConfidenceScore=v;}
    public double getAverageTechnicalScore(){return averageTechnicalScore;} public void setAverageTechnicalScore(double v){averageTechnicalScore=v;}
    public double getAverageProfessionalismScore(){return averageProfessionalismScore;} public void setAverageProfessionalismScore(double v){averageProfessionalismScore=v;}
    public double getAveragePronunciationScore(){return averagePronunciationScore;} public void setAveragePronunciationScore(double v){averagePronunciationScore=v;}
    public double getEvaluationCoveragePercent(){return evaluationCoveragePercent;} public void setEvaluationCoveragePercent(double v){evaluationCoveragePercent=v;}
    public Map<String,String> getBenchmarkStatus(){return benchmarkStatus;} public void setBenchmarkStatus(Map<String,String> v){benchmarkStatus=v==null?new LinkedHashMap<>():v;}
}
