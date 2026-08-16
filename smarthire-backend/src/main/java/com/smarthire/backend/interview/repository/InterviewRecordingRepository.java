package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.InterviewRecording;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InterviewRecordingRepository extends JpaRepository<InterviewRecording, Long> {

    Optional<InterviewRecording> findBySessionId(Long sessionId);
}
