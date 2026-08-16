package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.InterviewQuestionAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewQuestionAttemptRepository extends JpaRepository<InterviewQuestionAttempt, Long> {

    Optional<InterviewQuestionAttempt> findBySessionIdAndQuestionIndex(Long sessionId, Integer questionIndex);

    List<InterviewQuestionAttempt> findBySessionIdOrderByQuestionIndexAsc(Long sessionId);

    long countBySessionIdAndCompletedTrue(Long sessionId);
}
