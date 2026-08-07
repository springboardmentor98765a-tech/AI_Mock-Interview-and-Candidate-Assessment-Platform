package com.smarthire.backend.resume.service;

import com.smarthire.backend.resume.dto.ResumeAnalysisResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ResumeReportService {

    public byte[] generateResumeReport(ResumeAnalysisResponse analysis) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float yPosition = 700;
                float margin = 50;
                float pageWidth = page.getMediaBox().getWidth() - 2 * margin;

                // Title
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 18);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Resume Analysis Report");
                contentStream.endText();
                yPosition -= 30;

                // File name
                contentStream.beginText();
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("File: " + (analysis.getFileName() != null ? analysis.getFileName() : "N/A"));
                contentStream.endText();
                yPosition -= 20;

                // Page count
                contentStream.beginText();
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Pages: " + analysis.getPageCount());
                contentStream.endText();
                yPosition -= 30;

                // Summary
                if (analysis.getSummary() != null && !analysis.getSummary().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Summary");
                    yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth, analysis.getSummary());
                    yPosition -= 10;
                }

                // Skills
                if (analysis.getSkills() != null && !analysis.getSkills().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Skills");
                    for (String skill : analysis.getSkills()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, skill);
                        if (yPosition < 50) {
                            // Add new page if needed
                            page = new PDPage();
                            document.addPage(page);
                            contentStream.close();
                            try (PDPageContentStream newStream = new PDPageContentStream(document, page)) {
                                contentStream.close();
                            }
                            yPosition = 700;
                        }
                    }
                    yPosition -= 10;
                }

                // Technologies
                if (analysis.getTechnologies() != null && !analysis.getTechnologies().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Technologies");
                    for (String tech : analysis.getTechnologies()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, tech);
                    }
                    yPosition -= 10;
                }

                // Experience
                if (analysis.getExperience() != null && !analysis.getExperience().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Experience");
                    yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth, analysis.getExperience());
                    yPosition -= 10;
                }

                // Education
                if (analysis.getEducation() != null && !analysis.getEducation().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Education");
                    yPosition = drawParagraph(contentStream, margin, yPosition, pageWidth, analysis.getEducation());
                    yPosition -= 10;
                }

                // ATS Score Section
                if (analysis.getAtsScore() != null) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "ATS Score");
                    contentStream.beginText();
                    contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
                    contentStream.newLineAtOffset(margin, yPosition);
                    contentStream.showText("Overall Score: " + analysis.getAtsScore() + "/100");
                    contentStream.endText();
                    yPosition -= 25;

                    // Individual scores
                    if (analysis.getKeywordScore() != null) {
                        yPosition = drawScoreLine(contentStream, margin, yPosition, "Keyword Score", analysis.getKeywordScore());
                    }
                    if (analysis.getFormattingScore() != null) {
                        yPosition = drawScoreLine(contentStream, margin, yPosition, "Formatting Score", analysis.getFormattingScore());
                    }
                    if (analysis.getSkillsScore() != null) {
                        yPosition = drawScoreLine(contentStream, margin, yPosition, "Skills Score", analysis.getSkillsScore());
                    }
                    if (analysis.getExperienceScore() != null) {
                        yPosition = drawScoreLine(contentStream, margin, yPosition, "Experience Score", analysis.getExperienceScore());
                    }
                    if (analysis.getEducationScore() != null) {
                        yPosition = drawScoreLine(contentStream, margin, yPosition, "Education Score", analysis.getEducationScore());
                    }
                    yPosition -= 10;
                }

                // Missing Skills
                if (analysis.getMissingSkills() != null && !analysis.getMissingSkills().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Missing Skills");
                    for (String skill : analysis.getMissingSkills()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, skill);
                    }
                    yPosition -= 10;
                }

                // Strengths
                if (analysis.getStrengths() != null && !analysis.getStrengths().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Strengths");
                    for (String strength : analysis.getStrengths()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, strength);
                    }
                    yPosition -= 10;
                }

                // Weaknesses
                if (analysis.getWeaknesses() != null && !analysis.getWeaknesses().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Weaknesses");
                    for (String weakness : analysis.getWeaknesses()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, weakness);
                    }
                    yPosition -= 10;
                }

                // Improvement Suggestions
                if (analysis.getImprovementSuggestions() != null && !analysis.getImprovementSuggestions().isEmpty()) {
                    yPosition = drawSectionHeader(contentStream, margin, yPosition, "Improvement Suggestions");
                    for (String suggestion : analysis.getImprovementSuggestions()) {
                        yPosition = drawBulletPoint(contentStream, margin, yPosition, suggestion);
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            return baos.toByteArray();
        }
    }

    private float drawSectionHeader(PDPageContentStream contentStream, float margin, float yPosition, String title) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 14);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText(title);
        contentStream.endText();
        return yPosition - 20;
    }

    private float drawParagraph(PDPageContentStream contentStream, float margin, float yPosition, float maxWidth, String text) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);

        // Simple text wrapping
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

    private float drawBulletPoint(PDPageContentStream contentStream, float margin, float yPosition, String text) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText("• " + text);
        contentStream.endText();
        return yPosition - 15;
    }

    private float drawScoreLine(PDPageContentStream contentStream, float margin, float yPosition, String label, Integer score) throws IOException {
        contentStream.beginText();
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
        contentStream.newLineAtOffset(margin, yPosition);
        contentStream.showText(label + ": " + score + "/100");
        contentStream.endText();
        return yPosition - 18;
    }
}