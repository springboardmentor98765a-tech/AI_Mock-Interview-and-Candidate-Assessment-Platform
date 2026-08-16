package com.smarthire.backend.resume.service;

import com.smarthire.backend.ai.analytics.PdfPageWriter;
import com.smarthire.backend.resume.dto.ResumeAnalysisResponse;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ResumeReportService {
    public byte[] generateResumeReport(ResumeAnalysisResponse analysis) throws IOException {
        try (PDDocument document = new PDDocument(); PdfPageWriter writer = new PdfPageWriter(document)) {
            writer.title("Resume Analysis Report");
            writer.line("File: " + (analysis.getFileName() == null ? "N/A" : analysis.getFileName()));
            writer.line("Pages: " + analysis.getPageCount());
            if (hasText(analysis.getSummary())) { writer.heading("Summary"); writer.paragraph(analysis.getSummary()); }
            writeList(writer, "Skills", analysis.getSkills());
            writeList(writer, "Technologies", analysis.getTechnologies());
            if (hasText(analysis.getExperience())) { writer.heading("Experience"); writer.paragraph(analysis.getExperience()); }
            if (hasText(analysis.getEducation())) { writer.heading("Education"); writer.paragraph(analysis.getEducation()); }
            if (analysis.getAtsScore() != null) {
                writer.heading("ATS Score");
                writer.line("Overall Score: " + analysis.getAtsScore() + "/100");
                writer.score("Keyword Score", analysis.getKeywordScore());
                writer.score("Formatting Score", analysis.getFormattingScore());
                writer.score("Skills Score", analysis.getSkillsScore());
                writer.score("Experience Score", analysis.getExperienceScore());
                writer.score("Education Score", analysis.getEducationScore());
            }
            writeList(writer, "Missing Skills", analysis.getMissingSkills());
            writeList(writer, "Strengths", analysis.getStrengths());
            writeList(writer, "Weaknesses", analysis.getWeaknesses());
            writeList(writer, "Improvement Suggestions", analysis.getImprovementSuggestions());
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        }
    }

    private void writeList(PdfPageWriter writer, String heading, List<String> values) throws IOException {
        if (values == null || values.isEmpty()) return;
        writer.heading(heading);
        for (String value : values) writer.bullet(value);
    }
    private boolean hasText(String value) { return value != null && !value.isBlank(); }
}
