package com.smarthireai.service;

import com.smarthireai.entity.InterviewSession;
import com.smarthireai.entity.User;
import com.smarthireai.repository.InterviewSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class InterviewSessionService {

    private final InterviewSessionRepository sessionRepository;

    public InterviewSessionService(
            InterviewSessionRepository sessionRepository) {

        this.sessionRepository = sessionRepository;
    }

    // Create and start interview
    public InterviewSession startInterview(
            User user,
            String interviewType) {

        InterviewSession session = new InterviewSession();

        session.setUser(user);
        session.setInterviewType(interviewType);
        session.setStatus("IN_PROGRESS");
        session.setStartTime(LocalDateTime.now());

        return sessionRepository.save(session);
    }

    // End interview
    public InterviewSession endInterview(Long sessionId) {

        InterviewSession session =
                sessionRepository.findById(sessionId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Interview session not found"));

        session.setEndTime(LocalDateTime.now());
        session.setStatus("COMPLETED");

        if (session.getStartTime() != null) {

            long duration =
                    Duration.between(
                            session.getStartTime(),
                            session.getEndTime()
                    ).getSeconds();

            session.setTotalDuration(duration);
        }

        return sessionRepository.save(session);
    }

    // Get candidate interview history
    public List<InterviewSession> getUserSessions(User user) {

        return sessionRepository.findByUser(user);
    }
}