package com.smarthire.backend.interview.repository;

import com.smarthire.backend.interview.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {

    Optional<Interview> findById(Long id);

    List<Interview> findAll();

    List<Interview> findByUserId(Long userId);

    List<Interview> findByUserIdOrderByCreatedAtDesc(Long userId);
}