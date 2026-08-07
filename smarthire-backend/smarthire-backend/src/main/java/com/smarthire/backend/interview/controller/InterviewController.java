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

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    @GetMapping
    public ResponseEntity<List<Interview>> getAllInterviews() {
        List<Interview> interviews = interviewService.getAllInterviews();
        return new ResponseEntity<>(interviews, HttpStatus.OK);
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<Interview> getInterviewById(@PathVariable Long id) {
        Interview interview = interviewService.getInterviewById(id);
        return new ResponseEntity<>(interview, HttpStatus.OK);
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<List<InterviewHistorySummaryResponse>> getInterviewHistory(@PathVariable Long userId) {
        List<InterviewHistorySummaryResponse> interviews = interviewService.getInterviewHistory(userId);
        return new ResponseEntity<>(interviews, HttpStatus.OK);
    }

    @GetMapping("/history/{userId}/{interviewId}")
    public ResponseEntity<InterviewHistoryDetailResponse> getInterviewHistoryDetail(@PathVariable Long userId,
                                                                                     @PathVariable Long interviewId) {
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
    public ResponseEntity<InterviewEvaluationResponse> getInterviewEvaluation(@PathVariable Long interviewId) {
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
    public ResponseEntity<InterviewReportResponse> getInterviewReport(@PathVariable Long interviewId) {
        InterviewReportResponse response = interviewService.getInterviewReport(interviewId);
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/{interviewId:[0-9]+}/report/email-preview")
    public ResponseEntity<InterviewReportResponse.EmailPreview> getInterviewEmailPreview(@PathVariable Long interviewId) {
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
}