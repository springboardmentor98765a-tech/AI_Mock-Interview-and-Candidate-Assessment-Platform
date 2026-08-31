package com.smarthire.backend.interview.proctoring;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProctoringViolationRepository extends JpaRepository<ProctoringViolation,Long>{
    List<ProctoringViolation> findBySessionIdOrderByDetectedAtAsc(Long sessionId);
    long countBySessionId(Long sessionId);
}
