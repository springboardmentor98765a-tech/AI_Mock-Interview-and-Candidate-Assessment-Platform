package com.smarthire.backend.interview.controller;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.interview.dto.CreateInterviewSessionRequest;
import com.smarthire.backend.interview.dto.InterviewRecordingResponse;
import com.smarthire.backend.interview.dto.InterviewSessionResponse;
import com.smarthire.backend.interview.dto.InterviewQuestionTimingRequest;
import com.smarthire.backend.interview.dto.SubmitSessionAnswerRequest;
import com.smarthire.backend.interview.exception.InterviewSessionAccessDeniedException;
import com.smarthire.backend.interview.service.InterviewSessionService;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Module 4: Interview Session Management.
 *
 * Complements the existing {@code /api/interviews/**} endpoints (interview
 * generation, evaluation, the free-form session "snapshot"). This controller owns
 * the formal state machine, question-progress tracking and secured recording
 * storage that the existing snapshot mechanism did not provide.
 */
@RestController
@RequestMapping("/api/interview-sessions")
@CrossOrigin("*")
public class InterviewSessionController {

    private final InterviewSessionService sessionService;
    private final UserRepository userRepository;

    public InterviewSessionController(InterviewSessionService sessionService, UserRepository userRepository) {
        this.sessionService = sessionService;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<InterviewSessionResponse> createSession(@RequestBody CreateInterviewSessionRequest request) {
        InterviewSessionResponse response = sessionService.createSession(request, requireCurrentUserId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id:[0-9]+}/start")
    public ResponseEntity<InterviewSessionResponse> start(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.start(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/pause")
    public ResponseEntity<InterviewSessionResponse> pause(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.pause(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/resume")
    public ResponseEntity<InterviewSessionResponse> resume(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.resume(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/end")
    public ResponseEntity<InterviewSessionResponse> end(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.end(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/cancel")
    public ResponseEntity<InterviewSessionResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.cancel(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/next-question")
    public ResponseEntity<InterviewSessionResponse> nextQuestion(@PathVariable Long id) {
        return ResponseEntity.ok(sessionService.nextQuestion(id, requireCurrentUserId()));
    }

    @PostMapping("/{id:[0-9]+}/question-timing")
    public ResponseEntity<InterviewSessionResponse> saveQuestionTiming(
            @PathVariable Long id,
            @RequestBody InterviewQuestionTimingRequest request) {
        return ResponseEntity.ok(
                sessionService.saveQuestionTiming(id, requireCurrentUserId(), request));
    }

    @PostMapping("/{id:[0-9]+}/answers")
    public ResponseEntity<InterviewSessionResponse> submitAnswer(@PathVariable Long id,
                                                                   @RequestBody SubmitSessionAnswerRequest request) {
        return ResponseEntity.ok(sessionService.submitAnswer(id, requireCurrentUserId(), request));
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<InterviewSessionResponse> getSession(@PathVariable Long id) {
        InterviewSessionResponse response = sessionService.getSession(id, currentUserId(), isPrivilegedViewer());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id:[0-9]+}/recording")
    public ResponseEntity<InterviewRecordingResponse> uploadRecording(
            @PathVariable Long id,
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(value = "audio", required = false) MultipartFile audio) {
        InterviewRecordingResponse response = sessionService.uploadRecording(id, requireCurrentUserId(), video, audio);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id:[0-9]+}/recording")
    public ResponseEntity<InterviewRecordingResponse> getRecordingMetadata(@PathVariable Long id) {
        InterviewRecordingResponse response =
                sessionService.getRecordingMetadata(id, currentUserId(), isPrivilegedViewer());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id:[0-9]+}/recording/video")
    public ResponseEntity<Resource> downloadVideo(@PathVariable Long id) {
        return streamRecording(id, "video", "video/webm");
    }

    @GetMapping("/{id:[0-9]+}/recording/audio")
    public ResponseEntity<Resource> downloadAudio(@PathVariable Long id) {
        return streamRecording(id, "audio", "audio/webm");
    }

    private ResponseEntity<Resource> streamRecording(Long id, String kind, String fallbackContentType) {
        Resource resource = sessionService.loadRecordingFile(id, currentUserId(), isPrivilegedViewer(), kind);
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(fallbackContentType);
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    // ---------------------------------------------------------------
    // Auth helpers - consistent with ResumeController's pattern: resolve the
    // authenticated principal's email/username to our internal user id.
    // ---------------------------------------------------------------

    private Long requireCurrentUserId() {
        Long userId = currentUserId();
        if (userId == null) {
            throw new InterviewSessionAccessDeniedException("Authentication is required for this action.");
        }
        return userId;
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        String email = null;
        if (principal instanceof UserDetails) {
            email = ((UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            email = (String) principal;
        }
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }

    private boolean isPrivilegedViewer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String role = authority.getAuthority();
            if ("ROLE_RECRUITER".equals(role) || "ROLE_ADMIN".equals(role)) {
                return true;
            }
        }
        return false;
    }
}
