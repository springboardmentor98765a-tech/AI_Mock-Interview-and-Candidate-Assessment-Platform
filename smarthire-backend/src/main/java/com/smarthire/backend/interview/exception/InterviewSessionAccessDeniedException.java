package com.smarthire.backend.interview.exception;

public class InterviewSessionAccessDeniedException extends RuntimeException {

    public InterviewSessionAccessDeniedException(String message) {
        super(message);
    }
}
