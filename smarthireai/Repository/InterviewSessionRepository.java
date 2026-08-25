package com.smarthireai.repository;

import com.smarthireai.entity.InterviewSession;
import com.smarthireai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewSessionRepository
        extends JpaRepository<InterviewSession, Long> {

    List<InterviewSession> findByUser(User user);
}