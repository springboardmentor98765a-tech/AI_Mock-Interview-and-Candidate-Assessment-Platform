package com.smarthire.backend.recruiter.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_templates")
public class InterviewTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false) private Long recruiterId;
    @Column(nullable=false) private String name;
    private String jobRole;
    private String interviewType;
    private String difficulty;
    private Integer questionCount = 10;
    @Column(columnDefinition="TEXT") private String instructions;
    private boolean active = true;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @PrePersist void create(){ createdAt=LocalDateTime.now(); updatedAt=createdAt; }
    @PreUpdate void update(){ updatedAt=LocalDateTime.now(); }
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public Long getRecruiterId(){return recruiterId;} public void setRecruiterId(Long v){recruiterId=v;}
    public String getName(){return name;} public void setName(String v){name=v;}
    public String getJobRole(){return jobRole;} public void setJobRole(String v){jobRole=v;}
    public String getInterviewType(){return interviewType;} public void setInterviewType(String v){interviewType=v;}
    public String getDifficulty(){return difficulty;} public void setDifficulty(String v){difficulty=v;}
    public Integer getQuestionCount(){return questionCount;} public void setQuestionCount(Integer v){questionCount=v;}
    public String getInstructions(){return instructions;} public void setInstructions(String v){instructions=v;}
    public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
    public LocalDateTime getCreatedAt(){return createdAt;} public void setCreatedAt(LocalDateTime v){createdAt=v;}
    public LocalDateTime getUpdatedAt(){return updatedAt;} public void setUpdatedAt(LocalDateTime v){updatedAt=v;}
}
