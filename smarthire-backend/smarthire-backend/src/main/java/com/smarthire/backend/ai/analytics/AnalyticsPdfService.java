package com.smarthire.backend.ai.analytics;

import com.smarthire.backend.interview.entity.Interview;
import com.smarthire.backend.interview.entity.InterviewEvaluation;
import com.smarthire.backend.interview.repository.InterviewEvaluationRepository;
import com.smarthire.backend.interview.repository.InterviewRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Generates analytics PDF reports with interview history, scores, trends, charts, and AI feedback.
 */
@Service
public class AnalyticsPdfService {

    private final InterviewRepository interviewRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;

    public AnalyticsPdfService(InterviewRepository interviewRepository,
                               InterviewEvaluationRepository interviewEvaluationRepository) {
        this.interviewRepository = interviewRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
    }

    public byte[] generateAnalyticsReport(Long userId) throws IOException {
        List<Interview> interviews = interviewRepository.findByUserIdOrderByCreatedAtDesc(userId);

        PDDocument document = new PDDocument();
        try {
            PDPage page = new PDPage();
            document.addPage(page);
            PDPageContentStream contentStream = new PDPageContentStream(document, page);

            float yPosition = 700;
            float margin = 50;
            float pageWidth = page.getMediaBox().getWidth() - 2 * margin;

            // Title
            contentStream.beginText();
            contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 18);
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText("SmartHire AI Analytics Report");
            contentStream.endText();
            yPosition -= 30;

            // User ID
            contentStream.beginText();
            contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText("User ID: " + userId);
            contentStream.endText();
            yPosition -= 20;

            // Interview count
            contentStream.beginText();
            contentStream.newLineAtOffset(margin, yPosition);
            contentStream.showText("Total Interviews: " + interviews.size());
            contentStream.endText();
            yPosition -= 30;

            // Interview history section
            if (!interviews.isEmpty()) {
                yPosition = drawSectionHeader(contentStream, margin, yPosition, "Interview History");
                for (Interview interview : interviews) {
                    if (yPosition < 50) {
                        contentStream.close();
                        page = new PDPage();
                        document.addPage(page);
                        contentStream = new PDPageContentStream(document, page);
                        yPosition = 700;
                    }
                    yPosition = drawInterviewLine(contentStream, margin, yPosition, interview);
                }
                yPosition -= 10;
            }

            // Scores section
            yPosition = drawSectionHeader(contentStream, margin, yPosition, "Scores");
            for (Interview interview : interviews) {
                if (yPosition < 50) {
                    contentStream.close();
                    page = new PDPage();
                    document.addPage(page);
                    contentStream = new PDPageContentStream(document, page);
                    yPosition = 700;
                }
                InterviewEvaluation evaluation = interviewEvaluationRepository.findByInterviewId(interview.getId()).orElse(null);
                if (evaluation != null) {
                    yPosition = drawScoreLine(contentStream, margin, yPosition,
                            "Interview #" + interview.getId() + " Overall: " + evaluation.getOverallScore() + "%");
                }
            }
            yPosition -= 10;

            // Trends section
            yPosition = drawSectionHeader(contentStream, margin, yPosition, "Trends");
            if (interviews.size() >= 2) {
                int firstScore = getScore(interviews.get(interviews.size() - 1));
                int lastScore = getScore(interviews.get(0));
                String trend = lastScore > firstScore ? "Improving" : (lastScore < firstScore ? "Declining" : "Stable");
                yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth,
                        "Score trend: " + trend + " (from " + firstScore + "% to " + lastScore + "%)");
            } else {
                yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth,
                        "Not enough interview data to determine a trend.");
            }
            yPosition -= 10;

            // AI Feedback section
            yPosition = drawSectionHeader(contentStream, margin, yPosition, "AI Feedback");
            if (!interviews.isEmpty()) {
                Interview latest = interviews.get(0);
                InterviewEvaluation evaluation = interviewEvaluationRepository.findByInterviewId(latest.getId()).orElse(null);
                if (evaluation != null) {
                    yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth,
                            "Recommendation: " + (evaluation.getRecommendation() == null ? "Not available" : evaluation.getRecommendation()));
                    yPosition -= 5;
                    if (evaluation.getStrengths() != null && !evaluation.getStrengths().isBlank()) {
                        yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth,
                                "Strengths: " + evaluation.getStrengths());
                    }
                }
            } else {
                yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth,
                        "No interview feedback available yet.");
            }

            contentStream.close();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        } finally {
            document.close();
        }
    }

    private int getScore(Interview interview) {
        return interviewEvaluationRepository.findByInterviewId(interview.getId())
                .map(InterviewEvaluation::getOverallScore)
                .orElse(0);
    }

    private float drawSectionHeader(PDPageContentStream contentStream, float margin, float yPosition, String title) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText(title);
        contentStream.endText();
        return yPosition - 20;
    }

    private float drawInterviewLine(PDPageContentStream contentStream, float margin, float yPosition, Interview interview) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText("Interview #" + interview.getId() + " - " + interview.getJobRole() + " - " + interview.getCreatedAt());
        contentStream.endText();
        return yPosition - 15;
    }

    private float drawScoreLine(PDPageContentStream contentStream, float margin, float yPosition, String text) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText(text);
        contentStream.endText();
        return yPosition - 15;
    }

    private float drawParagraph(PDPageContentStream contentStream, float margin, float yPosition, float maxWidth, String text) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);

        String[] words = text.split(" ");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String testLine = line.toString() + (line.length() > 0 ? " " : "") + word;
            float stringWidth = new PDType1Font(Standard14Fonts.FontName.HELVETICA).getStringWidth(testLine) / 1000 * 11;
            if (stringWidth > maxWidth) {
                contentStream.showText(line.toString());
                contentStream.newLine();
                yPosition -= 15;
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(testLine);
            }
        }
        if (line.length() > 0) {
            contentStream.showText(line.toString());
        }
        contentStream.endText();
        return yPosition - 15;
    }
}