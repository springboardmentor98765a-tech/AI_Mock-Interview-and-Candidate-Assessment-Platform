package com.smarthireai.controller;

import com.smarthireai.dto.InterviewQuestionRequest;
import com.smarthireai.dto.InterviewQuestionResponse;
import com.smarthireai.Service.AIQuestionGenerationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/interview")
@CrossOrigin(origins = "http://localhost:5500")
public class InterviewQuestionController {

    private final AIQuestionGenerationService
            aiQuestionGenerationService;

    public InterviewQuestionController(
            AIQuestionGenerationService aiQuestionGenerationService) {

        this.aiQuestionGenerationService =
                aiQuestionGenerationService;
    }

    @PostMapping("/questions/generate")
    public ResponseEntity<?> generateQuestions(
            @RequestBody InterviewQuestionRequest request) {

        try {

            // Validate question count
            if (request.getNumberOfQuestions() <= 0) {

                return ResponseEntity
                        .badRequest()
                        .body("Number of questions must be greater than 0");
            }

            if (request.getNumberOfQuestions() > 20) {

                return ResponseEntity
                        .badRequest()
                        .body("Maximum 20 questions allowed");
            }

            // Generate questions
            List<String> questions =
                    aiQuestionGenerationService
                            .generateQuestions(request);

            InterviewQuestionResponse response =
                    new InterviewQuestionResponse(
                            request.getType(),
                            request.getDifficulty(),
                            request.getDomain(),
                            questions
                    );

            return ResponseEntity.ok(response);

        } catch (Exception e) {

            return ResponseEntity
                    .internalServerError()
                    .body("Error generating questions: "
                            + e.getMessage());
        }
    }
}