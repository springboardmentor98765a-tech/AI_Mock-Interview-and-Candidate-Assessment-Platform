package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {

    List<InterviewSession> findByInterviewIdOrderByCreatedAtDesc(Long interviewId);

    Optional<InterviewSession> findFirstByInterviewIdOrderByCreatedAtDesc(Long interviewId);

    List<InterviewSession> findByCandidateIdOrderByCreatedAtDesc(Long candidateId);
}
