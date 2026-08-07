package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.InterviewEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewEvaluationRepository extends JpaRepository<InterviewEvaluation, Long> {

    Optional<InterviewEvaluation> findByInterviewId(Long interviewId);

    List<InterviewEvaluation> findByInterviewIdIn(List<Long> interviewIds);

    void deleteByInterviewId(Long interviewId);
}
