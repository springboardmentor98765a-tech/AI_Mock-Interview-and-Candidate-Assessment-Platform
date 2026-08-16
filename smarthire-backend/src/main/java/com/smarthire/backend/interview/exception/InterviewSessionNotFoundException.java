package com.smarthire.backend.interview.exception;

public class InterviewSessionNotFoundException extends RuntimeException {

    public InterviewSessionNotFoundException(String message) {
        super(message);
    }
}
