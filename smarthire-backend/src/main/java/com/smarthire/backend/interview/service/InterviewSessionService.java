package com.smarthire.backend.interview.service;

import com.smarthire.backend.interview.dto.CreateInterviewSessionRequest;
import com.smarthire.backend.interview.dto.InterviewRecordingResponse;
import com.smarthire.backend.interview.dto.InterviewSessionResponse;
import com.smarthire.backend.interview.dto.InterviewQuestionTimingRequest;
import com.smarthire.backend.interview.dto.SubmitSessionAnswerRequest;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewAnswer;
import com.smarthire.backend.interview.entity.InterviewRecording;
import com.smarthire.backend.interview.entity.InterviewQuestionAttempt;
import com.smarthire.backend.interview.entity.InterviewSession;
import com.smarthire.backend.interview.entity.RecordingStatus;
import com.smarthire.backend.interview.entity.SessionStatus;
import com.smarthire.backend.interview.exception.InterviewException;
import com.smarthire.backend.interview.exception.InterviewSessionAccessDeniedException;
import com.smarthire.backend.interview.exception.InterviewSessionNotFoundException;
import com.smarthire.backend.interview.repository.InterviewAnswerRepository;
import com.smarthire.backend.interview.repository.InterviewRecordingRepository;
import com.smarthire.backend.interview.repository.InterviewQuestionAttemptRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import com.smarthire.backend.interview.repository.InterviewSessionRepository;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Instant;
import java.time.ZoneId;

/**
 * Owns the interview session state machine (Module 4):
 *   CREATED -> IN_PROGRESS -> PAUSED -> IN_PROGRESS -> COMPLETED
 *                          \-> COMPLETED
 *   any non-terminal state -> CANCELLED
 *
 * All transitions are validated server-side; the frontend's own state is never
 * trusted for authorization or transition legality.
 */
@Service
public class InterviewSessionService {

    private static final int DEFAULT_MAX_DURATION_SECONDS = 20 * 60;

    private final InterviewSessionRepository sessionRepository;
    private final InterviewRepository interviewRepository;
    private final InterviewAnswerRepository answerRepository;
    private final InterviewRecordingRepository recordingRepository;
    private final InterviewQuestionAttemptRepository questionAttemptRepository;
    private final RecordingStorageService recordingStorageService;

    public InterviewSessionService(InterviewSessionRepository sessionRepository,
                                    InterviewRepository interviewRepository,
                                    InterviewAnswerRepository answerRepository,
                                    InterviewRecordingRepository recordingRepository,
                                    InterviewQuestionAttemptRepository questionAttemptRepository,
                                    RecordingStorageService recordingStorageService) {
        this.sessionRepository = sessionRepository;
        this.interviewRepository = interviewRepository;
        this.answerRepository = answerRepository;
        this.recordingRepository = recordingRepository;
        this.questionAttemptRepository = questionAttemptRepository;
        this.recordingStorageService = recordingStorageService;
    }

    @Transactional
    public InterviewSessionResponse createSession(CreateInterviewSessionRequest request, Long currentUserId) {
        if (request.getInterviewId() == null) {
            throw new InterviewException("interviewId is required to create a session.");
        }
        Interview interview = interviewRepository.findById(request.getInterviewId())
                .orElseThrow(() -> new InterviewSessionNotFoundException(
                        "Interview not found with id: " + request.getInterviewId()));

        if (interview.getUserId() != null && !interview.getUserId().equals(currentUserId)) {
            throw new InterviewSessionAccessDeniedException("You do not own this interview.");
        }

        int totalQuestions = request.getTotalQuestions() != null && request.getTotalQuestions() > 0
                ? request.getTotalQuestions() : 0;
        int maxDuration = request.getMaxDurationSeconds() != null && request.getMaxDurationSeconds() > 0
                ? request.getMaxDurationSeconds() : DEFAULT_MAX_DURATION_SECONDS;

        InterviewSession session = new InterviewSession(interview.getId(), currentUserId, totalQuestions, maxDuration);
        session = sessionRepository.save(session);
        return toResponse(session);
    }

    @Transactional
    public InterviewSessionResponse start(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "start", SessionStatus.CREATED);

        session.setStatus(SessionStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse pause(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "pause", SessionStatus.IN_PROGRESS);

        session.setStatus(SessionStatus.PAUSED);
        session.setPausedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse resume(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "resume", SessionStatus.PAUSED);

        if (session.getPausedAt() != null) {
            long pausedSeconds = Duration.between(session.getPausedAt(), LocalDateTime.now()).getSeconds();
            session.setTotalPausedSeconds(session.getTotalPausedSeconds() + Math.max(0, pausedSeconds));
            session.setPausedAt(null);
        }
        session.setStatus(SessionStatus.IN_PROGRESS);
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse end(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "end", SessionStatus.IN_PROGRESS, SessionStatus.PAUSED);

        LocalDateTime now = LocalDateTime.now();
        if (session.getStatus() == SessionStatus.PAUSED && session.getPausedAt() != null) {
            long pausedSeconds = Duration.between(session.getPausedAt(), now).getSeconds();
            session.setTotalPausedSeconds(session.getTotalPausedSeconds() + Math.max(0, pausedSeconds));
            session.setPausedAt(null);
        }

        session.setStatus(SessionStatus.COMPLETED);
        session.setEndedAt(now);
        if (session.getStartedAt() != null) {
            long totalSeconds = Duration.between(session.getStartedAt(), now).getSeconds();
            long activeSeconds = Math.max(0, totalSeconds - session.getTotalPausedSeconds());
            session.setDurationSeconds(activeSeconds);
        }
        session.setQuestionsAttempted((int) questionAttemptRepository
                .findBySessionIdOrderByQuestionIndexAsc(sessionId).size());
        session.setQuestionsCompleted((int) questionAttemptRepository
                .countBySessionIdAndCompletedTrue(sessionId));
        session.setUpdatedAt(now);
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse cancel(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "cancel", SessionStatus.CREATED, SessionStatus.IN_PROGRESS, SessionStatus.PAUSED);

        session.setStatus(SessionStatus.CANCELLED);
        session.setEndedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse nextQuestion(Long sessionId, Long currentUserId) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "advance to the next question", SessionStatus.IN_PROGRESS);

        if (session.getTotalQuestions() != null && session.getTotalQuestions() > 0
                && session.getCurrentQuestionIndex() >= session.getTotalQuestions() - 1) {
            throw new InterviewException("Already on the final question - cannot go beyond it.");
        }

        session.setCurrentQuestionIndex(session.getCurrentQuestionIndex() + 1);
        session.setQuestionsAttempted((int) questionAttemptRepository.findBySessionIdOrderByQuestionIndexAsc(sessionId).size());
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse submitAnswer(Long sessionId, Long currentUserId, SubmitSessionAnswerRequest request) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "submit an answer", SessionStatus.IN_PROGRESS);

        String question = request.getQuestion() != null ? request.getQuestion() : "";
        String answer = request.getAnswer() != null ? request.getAnswer() : "";
        String category = request.getCategory() != null ? request.getCategory() : "general";
        String difficulty = request.getDifficulty() != null ? request.getDifficulty() : "medium";

        answerRepository.save(new InterviewAnswer(session.getInterviewId(), question, answer, category, difficulty));

        InterviewQuestionAttempt attempt = questionAttemptRepository
                .findBySessionIdAndQuestionIndex(sessionId, session.getCurrentQuestionIndex())
                .orElseGet(() -> new InterviewQuestionAttempt(
                        sessionId,
                        session.getCurrentQuestionIndex(),
                        question
                ));
        if (attempt.getQuestionText() == null || attempt.getQuestionText().isBlank()) {
            attempt.setQuestionText(question);
        }
        attempt.setCompleted(!answer.isBlank() || attempt.isCompleted());
        questionAttemptRepository.save(attempt);

        session.setQuestionsAttempted((int) questionAttemptRepository
                .findBySessionIdOrderByQuestionIndexAsc(sessionId).size());
        session.setQuestionsCompleted((int) questionAttemptRepository
                .countBySessionIdAndCompletedTrue(sessionId));
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    @Transactional
    public InterviewSessionResponse saveQuestionTiming(Long sessionId, Long currentUserId,
                                                       InterviewQuestionTimingRequest request) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        requireStatus(session, "save question timing", SessionStatus.IN_PROGRESS, SessionStatus.PAUSED);

        if (request == null || request.getQuestionIndex() == null || request.getQuestionIndex() < 0) {
            throw new InterviewException("questionIndex is required and must be non-negative.");
        }
        if (session.getTotalQuestions() != null && session.getTotalQuestions() > 0
                && request.getQuestionIndex() >= session.getTotalQuestions()) {
            throw new InterviewException("questionIndex is outside the current interview.");
        }

        long segmentSeconds = Math.max(0L, request.getDurationSeconds() == null ? 0L : request.getDurationSeconds());
        long maxSegment = session.getMaxDurationSeconds() == null ? DEFAULT_MAX_DURATION_SECONDS : Math.max(1L, session.getMaxDurationSeconds());
        segmentSeconds = Math.min(segmentSeconds, maxSegment);
        LocalDateTime startedAt = parseClientTime(request.getStartedAt());
        LocalDateTime endedAt = parseClientTime(request.getEndedAt());
        if (endedAt == null) {
            endedAt = LocalDateTime.now();
        }

        InterviewQuestionAttempt attempt = questionAttemptRepository
                .findBySessionIdAndQuestionIndex(sessionId, request.getQuestionIndex())
                .orElseGet(() -> new InterviewQuestionAttempt(
                        sessionId, request.getQuestionIndex(), request.getQuestion()));

        if ((attempt.getQuestionText() == null || attempt.getQuestionText().isBlank())
                && request.getQuestion() != null) {
            attempt.setQuestionText(request.getQuestion());
        }
        if (attempt.getStartedAt() == null && startedAt != null) {
            attempt.setStartedAt(startedAt);
        }
        attempt.setEndedAt(endedAt);
        long accumulated = Math.max(0L, (attempt.getDurationSeconds() == null ? 0L : attempt.getDurationSeconds()) + segmentSeconds);
        attempt.setDurationSeconds(Math.min(accumulated, maxSegment));
        attempt.setCompleted(Boolean.TRUE.equals(request.getCompleted()) || attempt.isCompleted());
        questionAttemptRepository.save(attempt);

        session.setQuestionsAttempted((int) questionAttemptRepository
                .findBySessionIdOrderByQuestionIndexAsc(sessionId).size());
        session.setQuestionsCompleted((int) questionAttemptRepository
                .countBySessionIdAndCompletedTrue(sessionId));
        session.setUpdatedAt(LocalDateTime.now());
        return toResponse(sessionRepository.save(session));
    }

    private LocalDateTime parseClientTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value).atZone(ZoneId.systemDefault()).toLocalDateTime();
        } catch (Exception ignored) {
            try {
                return LocalDateTime.parse(value);
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    @Transactional(readOnly = true)
    public InterviewSessionResponse getSession(Long sessionId, Long currentUserId, boolean isPrivileged) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("Session not found with id: " + sessionId));
        assertReadAccess(session, currentUserId, isPrivileged);
        return toResponse(session);
    }

    // ---------------------------------------------------------------
    // Recording upload / retrieval
    // ---------------------------------------------------------------

    @Transactional
    public InterviewRecordingResponse uploadRecording(Long sessionId, Long currentUserId,
                                                        MultipartFile video, MultipartFile audio) {
        InterviewSession session = getOwnedSession(sessionId, currentUserId);
        if (session.getStatus() == SessionStatus.CREATED) {
            throw new InterviewException("Cannot attach a recording before the session has started.");
        }

        InterviewRecording recording = recordingRepository.findBySessionId(sessionId)
                .orElseGet(() -> new InterviewRecording(session.getInterviewId(), session.getId(), currentUserId));
        recording.setStatus(RecordingStatus.UPLOADING);

        try {
            if (video != null && !video.isEmpty()) {
                String key = recordingStorageService.store(session.getInterviewId(), session.getId(), "video", video);
                recording.setVideoStorageKey(key);
                recording.setVideoContentType(video.getContentType());
            }
            if (audio != null && !audio.isEmpty()) {
                String key = recordingStorageService.store(session.getInterviewId(), session.getId(), "audio", audio);
                recording.setAudioStorageKey(key);
                recording.setAudioContentType(audio.getContentType());
            }
            recording.setStatus(RecordingStatus.STORED);
        } catch (IOException e) {
            recording.setStatus(RecordingStatus.FAILED);
            recordingRepository.save(recording);
            throw new InterviewException("Failed to store interview recording: " + e.getMessage());
        }

        recording = recordingRepository.save(recording);
        return toRecordingResponse(recording);
    }

    @Transactional(readOnly = true)
    public InterviewRecordingResponse getRecordingMetadata(Long sessionId, Long currentUserId, boolean isPrivileged) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("Session not found with id: " + sessionId));
        assertReadAccess(session, currentUserId, isPrivileged);

        InterviewRecording recording = recordingRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("No recording found for session: " + sessionId));
        return toRecordingResponse(recording);
    }

    @Transactional(readOnly = true)
    public Resource loadRecordingFile(Long sessionId, Long currentUserId, boolean isPrivileged, String kind) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("Session not found with id: " + sessionId));
        assertReadAccess(session, currentUserId, isPrivileged);

        InterviewRecording recording = recordingRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("No recording found for session: " + sessionId));

        String key = "video".equals(kind) ? recording.getVideoStorageKey() : recording.getAudioStorageKey();
        if (key == null) {
            throw new InterviewSessionNotFoundException("No " + kind + " recording is available for this session.");
        }
        try {
            return recordingStorageService.load(key);
        } catch (IOException e) {
            throw new InterviewSessionNotFoundException("Unable to load recording: " + e.getMessage());
        }
    }

    // ---------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------

    private InterviewSession getOwnedSession(Long sessionId, Long currentUserId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new InterviewSessionNotFoundException("Session not found with id: " + sessionId));
        if (currentUserId == null || !currentUserId.equals(session.getCandidateId())) {
            throw new InterviewSessionAccessDeniedException("You are not authorized to modify this session.");
        }
        return session;
    }

    private void assertReadAccess(InterviewSession session, Long currentUserId, boolean isPrivileged) {
        if (isPrivileged) {
            return;
        }
        if (currentUserId == null || !currentUserId.equals(session.getCandidateId())) {
            throw new InterviewSessionAccessDeniedException("You are not authorized to view this session.");
        }
    }

    private void requireStatus(InterviewSession session, String action, SessionStatus... allowed) {
        for (SessionStatus status : allowed) {
            if (session.getStatus() == status) {
                return;
            }
        }
        throw new InterviewException("Cannot " + action + " while session is " + session.getStatus() + ".");
    }

    private InterviewSessionResponse toResponse(InterviewSession session) {
        InterviewSessionResponse response = new InterviewSessionResponse();
        response.setId(session.getId());
        response.setInterviewId(session.getInterviewId());
        response.setCandidateId(session.getCandidateId());
        response.setStatus(session.getStatus());
        response.setTotalQuestions(session.getTotalQuestions());
        response.setCurrentQuestionIndex(session.getCurrentQuestionIndex());
        response.setQuestionsAttempted(session.getQuestionsAttempted());
        response.setQuestionsCompleted(session.getQuestionsCompleted());
        response.setMaxDurationSeconds(session.getMaxDurationSeconds());
        response.setStartedAt(session.getStartedAt());
        response.setPausedAt(session.getPausedAt());
        response.setEndedAt(session.getEndedAt());
        response.setDurationSeconds(session.getDurationSeconds());
        response.setCreatedAt(session.getCreatedAt());

        long elapsedActive = computeElapsedActiveSeconds(session);
        response.setElapsedActiveSeconds(elapsedActive);
        if (session.getMaxDurationSeconds() != null) {
            response.setRemainingSeconds(Math.max(0, session.getMaxDurationSeconds() - elapsedActive));
        }
        return response;
    }

    private long computeElapsedActiveSeconds(InterviewSession session) {
        if (session.getStartedAt() == null) {
            return 0;
        }
        LocalDateTime reference = session.getEndedAt() != null ? session.getEndedAt()
                : (session.getStatus() == SessionStatus.PAUSED && session.getPausedAt() != null
                        ? session.getPausedAt() : LocalDateTime.now());
        long totalSeconds = Duration.between(session.getStartedAt(), reference).getSeconds();
        long pausedSeconds = session.getTotalPausedSeconds() != null ? session.getTotalPausedSeconds() : 0L;
        return Math.max(0, totalSeconds - pausedSeconds);
    }

    private InterviewRecordingResponse toRecordingResponse(InterviewRecording recording) {
        InterviewRecordingResponse response = new InterviewRecordingResponse();
        response.setId(recording.getId());
        response.setSessionId(recording.getSessionId());
        response.setInterviewId(recording.getInterviewId());
        response.setVideoAvailable(recording.getVideoStorageKey() != null);
        response.setAudioAvailable(recording.getAudioStorageKey() != null);
        response.setStatus(recording.getStatus());
        response.setCreatedAt(recording.getCreatedAt());
        response.setUpdatedAt(recording.getUpdatedAt());
        return response;
    }
}
