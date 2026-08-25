package com.smarthireai.dto;

public class ResumeResponse {

    private Long id;
    private String fileName;
    private String message;

    public ResumeResponse() {
    }

    public ResumeResponse(Long id, String fileName, String message) {
        this.id = id;
        this.fileName = fileName;
        this.message = message;
    }

    public Long getId() {
        return id;
    }

    public String getFileName() {
        return fileName;
    }

    public String getMessage() {
        return message;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}