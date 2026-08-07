package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.InterviewAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewAnswerRepository extends JpaRepository<InterviewAnswer, Long> {

    List<InterviewAnswer> findByInterviewIdOrderByIdAsc(Long interviewId);

    void deleteByInterviewId(Long interviewId);
}