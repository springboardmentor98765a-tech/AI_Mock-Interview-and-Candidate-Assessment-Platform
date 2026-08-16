package com.smarthire.backend.recruiter.repository;
import com.smarthire.backend.recruiter.entity.InterviewTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InterviewTemplateRepository extends JpaRepository<InterviewTemplate, Long> {
    List<InterviewTemplate> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);
}
