package com.smarthire.backend.recruiter.controller;

import com.smarthire.backend.platform.dto.PlatformActionRequest;
import com.smarthire.backend.platform.entity.PlatformActionLog;
import com.smarthire.backend.recruiter.dto.RecruiterCandidateDetailDto;
import com.smarthire.backend.recruiter.dto.RecruiterCandidateSummaryDto;
import com.smarthire.backend.recruiter.dto.RecruiterInterviewSummaryDto;
import com.smarthire.backend.recruiter.service.RecruiterService;
import com.smarthire.backend.entity.Resume;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/recruiter")
public class RecruiterController {

    private final RecruiterService recruiterService;

    public RecruiterController(RecruiterService recruiterService) {
        this.recruiterService = recruiterService;
    }

    @GetMapping("/candidates")
    public ResponseEntity<List<RecruiterCandidateSummaryDto>> getCandidates(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String experience,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer minAtsScore,
            @RequestParam(required = false) Integer minInterviewScore
    ) {
        List<RecruiterCandidateSummaryDto> summaries = recruiterService.getCandidateSummaries(
                search,
                skill,
            experience,
            status,
                minAtsScore,
                minInterviewScore
        );
        return ResponseEntity.ok(summaries);
    }

    @GetMapping("/interviews")
    public ResponseEntity<List<RecruiterInterviewSummaryDto>> getInterviewSummaries() {
        return ResponseEntity.ok(recruiterService.getInterviewSummaries());
    }

    @GetMapping("/candidates/{candidateId}")
    public ResponseEntity<RecruiterCandidateDetailDto> getCandidateDetail(@PathVariable Long candidateId) {
        return ResponseEntity.ok(recruiterService.getCandidateDetail(candidateId));
    }

    @GetMapping("/candidates/{candidateId}/resume")
    public ResponseEntity<byte[]> downloadCandidateResume(@PathVariable Long candidateId) {
        try {
            Resume resume = recruiterService.getCandidateResume(candidateId);
            Path file = Paths.get(resume.getFilePath()).toAbsolutePath().normalize();
            if (!Files.exists(file) || !Files.isRegularFile(file)) {
                return ResponseEntity.notFound().build();
            }
            byte[] bytes = Files.readAllBytes(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resume.getFileName().replace("\"", "") + "\"")
                    .contentLength(bytes.length)
                    .body(bytes);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping("/candidates/{candidateId}/shortlist")
    public ResponseEntity<PlatformActionLog> shortlistCandidate(@PathVariable Long candidateId,
                                                                @RequestBody(required = false) PlatformActionRequest request) {
        return ResponseEntity.ok(recruiterService.shortlistCandidate(candidateId, request));
    }

    @PostMapping("/candidates/{candidateId}/reject")
    public ResponseEntity<PlatformActionLog> rejectCandidate(@PathVariable Long candidateId,
                                                             @RequestBody(required = false) PlatformActionRequest request) {
        return ResponseEntity.ok(recruiterService.rejectCandidate(candidateId, request));
    }

    @PostMapping("/candidates/{candidateId}/notes")
    public ResponseEntity<PlatformActionLog> addCandidateNote(@PathVariable Long candidateId,
                                                             @RequestBody(required = false) PlatformActionRequest request) {
        return ResponseEntity.ok(recruiterService.addCandidateNote(candidateId, request));
    }

    @GetMapping("/candidates/{candidateId}/actions")
    public ResponseEntity<List<PlatformActionLog>> getCandidateActions(@PathVariable Long candidateId) {
        return ResponseEntity.ok(recruiterService.getCandidateActions(candidateId));
    }

    @GetMapping("/candidates/compare")
    public ResponseEntity<List<RecruiterCandidateSummaryDto>> compareCandidates(@RequestParam List<Long> ids) {
        return ResponseEntity.ok(recruiterService.compareCandidates(new ArrayList<>(ids)));
    }
}
