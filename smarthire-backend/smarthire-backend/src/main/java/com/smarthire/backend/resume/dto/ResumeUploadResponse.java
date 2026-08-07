package com.smarthire.backend.resume.dto;

public class ResumeUploadResponse {

    private boolean success;
    private String fileName;
    private String filePath;
    private String message;

    public ResumeUploadResponse() {
    }

    public ResumeUploadResponse(boolean success, String fileName, String filePath, String message) {
        this.success = success;
        this.fileName = fileName;
        this.filePath = filePath;
        this.message = message;
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

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}