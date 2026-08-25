package com.smarthireai.controller;

import com.smarthireai.entity.InterviewSession;
import com.smarthireai.entity.User;
import com.smarthireai.repository.UserRepository;
import com.smarthireai.service.InterviewSessionService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview")
@CrossOrigin(origins = "http://localhost:5500")
public class InterviewSessionController {

    private final InterviewSessionService sessionService;
    private final UserRepository userRepository;

    public InterviewSessionController(
            InterviewSessionService sessionService,
            UserRepository userRepository) {

        this.sessionService = sessionService;
        this.userRepository = userRepository;
    }

    // START INTERVIEW
    @PostMapping("/start")
    public ResponseEntity<?> startInterview(
            @RequestParam String interviewType,
            Authentication authentication) {

        try {

            String email = authentication.getName();

            User user = userRepository
                    .findByEmail(email)
                    .orElseThrow(() ->
                            new RuntimeException("User not found"));

            InterviewSession session =
                    sessionService.startInterview(
                            user,
                            interviewType);

            return ResponseEntity.ok(session);

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // END INTERVIEW
    @PostMapping("/end/{id}")
    public ResponseEntity<?> endInterview(
            @PathVariable Long id) {

        try {

            InterviewSession session =
                    sessionService.endInterview(id);

            return ResponseEntity.ok(session);

        } catch (Exception e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // INTERVIEW HISTORY
    @GetMapping("/history")
    public ResponseEntity<?> history(
            Authentication authentication) {

        String email = authentication.getName();

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        List<InterviewSession> sessions =
                sessionService.getUserSessions(user);

        return ResponseEntity.ok(sessions);
    }
}