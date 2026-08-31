package com.smarthire.backend.interview.entity;

/**
 * Lifecycle states for an {@link InterviewSession}.
 *
 * Valid transitions:
 *   CREATED     -> IN_PROGRESS (start)
 *   CREATED     -> CANCELLED   (cancel)
 *   IN_PROGRESS -> PAUSED      (pause)
 *   IN_PROGRESS -> COMPLETED   (end)
 *   IN_PROGRESS -> CANCELLED   (cancel)
 *   PAUSED      -> IN_PROGRESS (resume)
 *   PAUSED      -> COMPLETED   (end)
 *   PAUSED      -> CANCELLED   (cancel)
 *
 * COMPLETED and CANCELLED are terminal states - no further transitions are allowed.
 */
public enum SessionStatus {
    CREATED,
    IN_PROGRESS,
    PAUSED,
    COMPLETED,
    CANCELLED,
    PROCTORING_TERMINATED
}
