package com.smarthire.backend.recruiter.dto;
public class InterviewTemplateRequest {
    private String name, jobRole, interviewType, difficulty, instructions;
    private Integer questionCount;
    public String getName(){return name;} public void setName(String v){name=v;}
    public String getJobRole(){return jobRole;} public void setJobRole(String v){jobRole=v;}
    public String getInterviewType(){return interviewType;} public void setInterviewType(String v){interviewType=v;}
    public String getDifficulty(){return difficulty;} public void setDifficulty(String v){difficulty=v;}
    public String getInstructions(){return instructions;} public void setInstructions(String v){instructions=v;}
    public Integer getQuestionCount(){return questionCount;} public void setQuestionCount(Integer v){questionCount=v;}
}
