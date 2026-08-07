package com.smarthire.backend.platform.repository;

import com.smarthire.backend.platform.entity.PlatformActionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlatformActionLogRepository extends JpaRepository<PlatformActionLog, Long> {

    List<PlatformActionLog> findTop20ByOrderByCreatedAtDesc();

    List<PlatformActionLog> findBySubjectTypeAndSubjectIdOrderByCreatedAtDesc(String subjectType, Long subjectId);
}
