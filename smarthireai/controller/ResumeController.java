package com.smarthireai.controller;

import com.smarthireai.dto.ResumeResponse;
import com.smarthireai.Entity.Resume;
import com.smarthireai.entity.User;
import com.smarthireai.repository.UserRepository;
import com.smarthireai.Service.ResumeService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "http://localhost:5500")
public class ResumeController {

    private final ResumeService resumeService;
    private final UserRepository userRepository;

    public ResumeController(
            ResumeService resumeService,
            UserRepository userRepository) {

        this.resumeService = resumeService;
        this.userRepository = userRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        try {

            System.out.println("===== RESUME UPLOAD STARTED =====");

            // Check authentication
            if (authentication == null) {
                System.out.println("Authentication is NULL");
                return ResponseEntity.status(401)
                        .body("User is not authenticated");
            }

            System.out.println("Logged-in user: " + authentication.getName());

            // Check file
            if (file == null || file.isEmpty()) {
                System.out.println("File is empty");
                return ResponseEntity.badRequest()
                        .body("Please select a PDF file");
            }

            System.out.println("File name: " + file.getOriginalFilename());
            System.out.println("File size: " + file.getSize());

            // Get user
            String email = authentication.getName();

            User user = userRepository
                    .findByEmail(email)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "User not found with email: " + email
                            ));

            System.out.println("User found: " + user.getEmail());
            System.out.println("User role: " + user.getRole());

            // Upload
            Resume resume = resumeService.uploadResume(file, user);

            System.out.println("Resume uploaded successfully");

            ResumeResponse response =
                    new ResumeResponse(
                            resume.getId(),
                            resume.getFileName(),
                            "Resume uploaded successfully"
                    );

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            // PRINT REAL ERROR
            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body("Resume upload failed: " + e.getMessage());
        }
    }
    }
