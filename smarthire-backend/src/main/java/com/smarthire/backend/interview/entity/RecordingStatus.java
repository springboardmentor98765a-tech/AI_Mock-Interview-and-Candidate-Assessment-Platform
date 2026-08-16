package com.smarthire.backend.interview.entity;

/**
 * Status of an interview recording as it moves through upload/storage.
 */
public enum RecordingStatus {
    PENDING,
    UPLOADING,
    STORED,
    FAILED
}
