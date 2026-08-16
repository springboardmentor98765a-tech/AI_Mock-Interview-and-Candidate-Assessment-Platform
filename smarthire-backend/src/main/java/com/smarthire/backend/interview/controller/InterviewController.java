package com.smarthire.backend.interview.controller;

import com.smarthire.backend.interview.dto.InterviewRequest;
import com.smarthire.backend.interview.dto.InterviewFollowUpRequest;
import com.smarthire.backend.interview.dto.InterviewFollowUpResponse;
import com.smarthire.backend.interview.dto.InterviewHistoryDetailResponse;
import com.smarthire.backend.interview.dto.InterviewHistorySummaryResponse;
import com.smarthire.backend.interview.dto.CandidateAssessmentResultRequest;
import com.smarthire.backend.interview.dto.CandidateEnhancementSnapshotResponse;
import com.smarthire.backend.interview.dto.CandidateNotificationRequest;
import com.smarthire.backend.interview.dto.CandidateProfileCompletionRequest;
import com.smarthire.backend.interview.dto.CareerRoadmapRequest;
import com.smarthire.backend.interview.dto.CareerRoadmapResponse;
import com.smarthire.backend.interview.dto.InterviewEvaluationRequest;
import com.smarthire.backend.interview.dto.InterviewEvaluationResponse;
import com.smarthire.backend.interview.dto.InterviewReportResponse;
import com.smarthire.backend.interview.dto.InterviewSessionSnapshotRequest;
import com.smarthire.backend.interview.dto.InterviewResponse;
import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.service.InterviewService;
import com.smarthire.backend.repository.UserRepository;
import com.smarthire.backend.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController {

    private final InterviewService interviewService;
    private final UserRepository userRepository;

    public InterviewController(InterviewService interviewService, UserRepository userRepository) {
        this.interviewService = interviewService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Interview>> getAllInterviews(Authentication auth) {
        if (!isPrivileged(auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return new ResponseEntity<>(interviewService.getAllInterviews(), HttpStatus.OK);
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<Interview> getInterviewById(@PathVariable Long id, Authentication auth) {
        Interview interview = interviewService.getInterviewById(id);
        if (!isPrivileged(auth) && !owns(interview, auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return new ResponseEntity<>(interview, HttpStatus.OK);
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<InterviewHistorySummaryResponse>> getInterviewHistory(@PathVariable Long userId, Authentication auth) {
        if (!isPrivileged(auth) && !currentUserId(auth).equals(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return new ResponseEntity<>(interviewService.getInterviewHistory(userId), HttpStatus.OK);
    }

    @GetMapping("/history/{userId}/{interviewId}")
    public ResponseEntity<InterviewHistoryDetailResponse> getInterviewHistoryDetail(@PathVariable Long userId,
                                                                                     @PathVariable Long interviewId, Authentication auth) {
        if (!isPrivileged(auth) && !currentUserId(auth).equals(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        InterviewHistoryDetailResponse response = interviewService.getInterviewHistoryDetail(userId, interviewId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/start")
    public ResponseEntity<InterviewResponse> startInterview(@RequestBody InterviewRequest request) {
        InterviewResponse response = interviewService.startInterview(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/evaluate")
    public ResponseEntity<InterviewEvaluationResponse> evaluateInterview(@RequestBody InterviewEvaluationRequest request) {
        InterviewEvaluationResponse response = interviewService.evaluateInterview(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/{interviewId:[0-9]+}/evaluation")
    public ResponseEntity<InterviewEvaluationResponse> getInterviewEvaluation(@PathVariable Long interviewId, Authentication auth) {
        Interview interview = interviewService.getInterviewById(interviewId);
        if (!isPrivileged(auth) && !owns(interview, auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        InterviewEvaluationResponse response = interviewService.getInterviewEvaluation(interviewId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/{interviewId:[0-9]+}/session")
    public ResponseEntity<Interview> saveInterviewSession(@PathVariable Long interviewId,
                                                          @RequestBody InterviewSessionSnapshotRequest request) {
        request.setInterviewId(interviewId);
        Interview interview = interviewService.saveInterviewSessionSnapshot(request);
        return new ResponseEntity<>(interview, HttpStatus.OK);
    }

    @GetMapping("/{interviewId:[0-9]+}/report")
    public ResponseEntity<InterviewReportResponse> getInterviewReport(@PathVariable Long interviewId, Authentication auth) {
        Interview interview = interviewService.getInterviewById(interviewId);
        if (!isPrivileged(auth) && !owns(interview, auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        InterviewReportResponse response = interviewService.getInterviewReport(interviewId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/{interviewId:[0-9]+}/report/email-preview")
    public ResponseEntity<InterviewReportResponse.EmailPreview> getInterviewEmailPreview(@PathVariable Long interviewId, Authentication auth) {
        Interview interview = interviewService.getInterviewById(interviewId);
        if (!isPrivileged(auth) && !owns(interview, auth)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        InterviewReportResponse response = interviewService.getInterviewReport(interviewId);
        return new ResponseEntity<>(response.getEmailPreview(), HttpStatus.OK);
    }

    @PostMapping("/candidate/{userId:[0-9]+}/career-roadmap/generate")
    public ResponseEntity<CareerRoadmapResponse> generateCareerRoadmap(@PathVariable Long userId,
                                                                        @RequestBody(required = false) CareerRoadmapRequest request) {
        CareerRoadmapResponse response = interviewService.generateCareerRoadmap(userId, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/candidate/{userId:[0-9]+}/enhancements")
    public ResponseEntity<CandidateEnhancementSnapshotResponse> getCandidateEnhancements(@PathVariable Long userId) {
        CandidateEnhancementSnapshotResponse response = interviewService.getCandidateEnhancements(userId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/candidate/{userId:[0-9]+}/assessments")
    public ResponseEntity<CandidateEnhancementSnapshotResponse> saveAssessmentResult(@PathVariable Long userId,
                                                                                       @RequestBody CandidateAssessmentResultRequest request) {
        CandidateEnhancementSnapshotResponse response = interviewService.saveAssessmentResult(userId, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/candidate/{userId:[0-9]+}/profile-completion")
    public ResponseEntity<CandidateEnhancementSnapshotResponse> saveProfileCompletion(@PathVariable Long userId,
                                                                                        @RequestBody CandidateProfileCompletionRequest request) {
        CandidateEnhancementSnapshotResponse response = interviewService.saveProfileCompletion(userId, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/candidate/{userId:[0-9]+}/notifications")
    public ResponseEntity<CandidateEnhancementSnapshotResponse> addNotification(@PathVariable Long userId,
                                                                                 @RequestBody CandidateNotificationRequest request) {
        CandidateEnhancementSnapshotResponse response = interviewService.addNotification(userId, request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/followup")
    public ResponseEntity<InterviewFollowUpResponse> generateFollowUp(@RequestBody InterviewFollowUpRequest request) {
        InterviewFollowUpResponse response = interviewService.generateFollowUpQuestion(request);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Interview> updateInterview(@PathVariable Long id, @RequestBody InterviewRequest request) {
        Interview interview = interviewService.updateInterview(id, request);
        return new ResponseEntity<>(interview, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteInterview(@PathVariable Long id) {
        interviewService.deleteInterview(id);
        return new ResponseEntity<>("Interview deleted successfully.", HttpStatus.OK);
    }
    private Long currentUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return -1L;
        return userRepository.findByEmail(auth.getName()).map(User::getId).orElse(-1L);
    }

    private boolean owns(Interview interview, Authentication auth) {
        Long uid = currentUserId(auth);
        return interview != null && interview.getUserId() != null && interview.getUserId().equals(uid);
    }

    private boolean isPrivileged(Authentication auth) {
        if (auth == null) return false;
        for (GrantedAuthority a : auth.getAuthorities()) {
            if ("ROLE_RECRUITER".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority())) return true;
        }
        return false;
    }

}