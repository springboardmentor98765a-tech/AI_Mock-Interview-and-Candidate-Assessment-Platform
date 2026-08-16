package com.smarthire.backend.resume.dto;

public class ResumeExtractResponse {

    private boolean success;
    private String fileName;
    private String extractedText;
    private int pageCount;
    private String message;
    private String filePath;

    public ResumeExtractResponse() {
    }

    public ResumeExtractResponse(boolean success, String fileName, String extractedText, int pageCount, String message) {
        this.success = success;
        this.fileName = fileName;
        this.extractedText = extractedText;
        this.pageCount = pageCount;
        this.message = message;
    }

    public ResumeExtractResponse(boolean success, String fileName, String extractedText, int pageCount, String message, String filePath) {
        this.success = success;
        this.fileName = fileName;
        this.extractedText = extractedText;
        this.pageCount = pageCount;
        this.message = message;
        this.filePath = filePath;
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

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public int getPageCount() {
        return pageCount;
    }

    public void setPageCount(int pageCount) {
        this.pageCount = pageCount;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }
}
