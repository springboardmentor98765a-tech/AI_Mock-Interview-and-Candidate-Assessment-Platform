package com.smarthireai.Repository;

import com.smarthireai.Entity.InterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewQuestionRepository
        extends JpaRepository<InterviewQuestion, Long> {
}