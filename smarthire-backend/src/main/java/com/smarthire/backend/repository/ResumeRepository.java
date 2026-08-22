package com.smarthire.backend.repository;

import com.smarthire.backend.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    Optional<Resume> findTopByUserIdOrderByUpdatedAtDesc(Long userId);
}
