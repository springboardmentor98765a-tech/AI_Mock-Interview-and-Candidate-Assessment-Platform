package com.smarthire.backend.ai.analytics;

import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/** Generates analytics PDF reports with safe multi-page rendering. */
@Service
public class AnalyticsPdfService {
    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;

    public AnalyticsPdfService(InterviewRepository interviewRepository, InterviewEvaluationRepository interviewEvaluationRepository) {
        this.interviewRepository = interviewRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
    }

    public byte[] generateAnalyticsReport(Long userId) throws IOException {
        List<Interview> interviews = interviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
        try (PDDocument document = new PDDocument(); PdfPageWriter writer = new PdfPageWriter(document)) {
            writer.title("SmartHire AI Analytics Report");
            writer.line("User ID: " + userId);
            writer.line("Total Interviews: " + interviews.size());
            if (!interviews.isEmpty()) {
                writer.heading("Interview History");
                for (Interview interview : interviews) {
                    writer.line("Interview #" + interview.getId() + " - " + safe(interview.getJobRole()) + " - " + interview.getCreatedAt());
                }
            }
            writer.heading("Scores");
            for (Interview interview : interviews) {
                InterviewEvaluation evaluation = interviewEvaluationRepository.findByInterviewId(interview.getId()).orElse(null);
                if (evaluation != null) writer.line("Interview #" + interview.getId() + " Overall: " + evaluation.getOverallScore() + "%");
            }
            writer.heading("Trends");
            if (interviews.size() >= 2) {
                int firstScore = getScore(interviews.get(interviews.size() - 1));
                int lastScore = getScore(interviews.get(0));
                String trend = lastScore > firstScore ? "Improving" : (lastScore < firstScore ? "Declining" : "Stable");
                writer.paragraph("Score trend: " + trend + " (from " + firstScore + "% to " + lastScore + "%)");
            } else writer.paragraph("Not enough interview data to determine a trend.");
            writer.heading("AI Feedback");
            if (!interviews.isEmpty()) {
                InterviewEvaluation evaluation = interviewEvaluationRepository.findByInterviewId(interviews.get(0).getId()).orElse(null);
                if (evaluation != null) {
                    writer.paragraph("Recommendation: " + safe(evaluation.getRecommendation(), "Not available"));
                    if (evaluation.getStrengths() != null && !evaluation.getStrengths().isBlank()) writer.paragraph("Strengths: " + evaluation.getStrengths());
                } else writer.paragraph("No completed evaluation is available for the latest interview.");
            } else writer.paragraph("No interview feedback available yet.");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }
    }

    private int getScore(Interview interview) {
        return interviewEvaluationRepository.findByInterviewId(interview.getId()).map(InterviewEvaluation::getOverallScore).orElse(0);
    }
    private String safe(String value) { return safe(value, ""); }
    private String safe(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
}
