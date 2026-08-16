package com.smarthire.backend.recruiter.repository;
import com.smarthire.backend.recruiter.entity.JobPosting; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface JobPostingRepository extends JpaRepository<JobPosting,Long>{List<JobPosting> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId); long countByRecruiterIdAndStatus(Long recruiterId,String status);}
