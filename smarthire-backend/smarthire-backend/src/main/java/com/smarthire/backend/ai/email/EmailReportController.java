package com.smarthire.backend.ai.email;

import com.smarthire.backend.interview.dto.InterviewReportResponse;
import com.smarthire.backend.interview.service.InterviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
public class EmailReportController {

    private final EmailService emailService;
    private final InterviewService interviewService;

    public EmailReportController(EmailService emailService, InterviewService interviewService) {
        this.emailService = emailService;
        this.interviewService = interviewService;
    }

    @PostMapping("/interview-report/{interviewId}")
    public ResponseEntity<Map<String, String>> sendInterviewReport(
            @PathVariable Long interviewId,
            @RequestBody Map<String, String> request) {
        String recipient = request.getOrDefault("recipient", "");

        if (recipient == null || recipient.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Recipient email is required"));
        }

        if (!emailService.isConfigured()) {
            return ResponseEntity.status(503).body(Map.of(
                    "message", "SMTP is not configured. Set mail.smtp.host to enable email delivery."
            ));
        }

        try {
            InterviewReportResponse report = interviewService.getInterviewReport(interviewId);
            String subject = "SmartHire AI Interview Report - Interview #" + interviewId;
            String body = "Hello,\n\nYour SmartHire AI interview report is ready.\n\n"
                    + "Job Role: " + report.getJobRole() + "\n"
                    + "Overall Score: " + (report.getEvaluation() == null ? "Pending" : report.getEvaluation().getOverallScore() + "%") + "\n"
                    + "Summary: " + report.getSessionSummary() + "\n\n"
                    + "Thank you for using SmartHire AI.";

            emailService.sendEmail(recipient, subject, body);
            return ResponseEntity.ok(Map.of("message", "Interview report email sent successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to send email: " + e.getMessage()));
        }
    }
}