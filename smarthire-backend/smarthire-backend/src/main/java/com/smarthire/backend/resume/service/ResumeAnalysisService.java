package com.smarthire.backend.resume.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.resume.ai.GeminiApiClient;
import com.smarthire.backend.resume.dto.ResumeAnalysisResponse;
import com.smarthire.backend.resume.dto.ResumeExtractResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ResumeAnalysisService {

    private final ResumeTextExtractionService resumeTextExtractionService;
    private final GeminiApiClient geminiApiClient;
    private final ObjectMapper objectMapper;
    private final ResumeRepository resumeRepository;

    public ResumeAnalysisService(ResumeTextExtractionService resumeTextExtractionService,
                                 GeminiApiClient geminiApiClient,
                                 ResumeRepository resumeRepository) {
        this.resumeTextExtractionService = resumeTextExtractionService;
        this.geminiApiClient = geminiApiClient;
        this.objectMapper = new ObjectMapper();
        this.resumeRepository = resumeRepository;
    }

    public ResumeAnalysisResponse analyzeResume(MultipartFile file) throws IOException {
        // Step 1: Extract text from the PDF
        ResumeExtractResponse extractResponse = resumeTextExtractionService.extractText(file);

        if (!extractResponse.isSuccess()) {
            return new ResumeAnalysisResponse(
                    false,
                    extractResponse.getFileName(),
                    extractResponse.getPageCount(),
                    null, null, null, null, null,
                    extractResponse.getMessage()
            );
        }

        String extractedText = extractResponse.getExtractedText();
        String fileName = extractResponse.getFileName();
        int pageCount = extractResponse.getPageCount();

        // Step 2: Check for empty resume text
        if (extractedText == null || extractedText.trim().isEmpty()) {
            return new ResumeAnalysisResponse(
                    false,
                    fileName,
                    pageCount,
                    null, null, null, null, null,
                    "Resume is empty. No text could be extracted for analysis."
            );
        }

        // Step 3: Send to Gemini for analysis
        String geminiRawResponse;
        try {
            geminiRawResponse = geminiApiClient.analyzeResume(extractedText);
        } catch (Exception e) {
            return new ResumeAnalysisResponse(
                    false,
                    fileName,
                    pageCount,
                    null, null, null, null, null,
                    "Gemini API error: " + e.getMessage()
            );
        }

        // Step 4: Parse the JSON response from Gemini
        try {
            ResumeAnalysisResponse response = parseGeminiResponse(geminiRawResponse, fileName, pageCount);
            if (response.isSuccess()) {
                saveAnalysis(response, extractResponse);
            }
            return response;
        } catch (JsonProcessingException e) {
            return new ResumeAnalysisResponse(
                    false,
                    fileName,
                    pageCount,
                    null, null, null, null, null,
                    "Failed to parse Gemini response as JSON: " + e.getMessage()
            );
        }
    }

    private ResumeAnalysisResponse parseGeminiResponse(String rawResponse, String fileName, int pageCount)
            throws JsonProcessingException {

        // Gemini may wrap the JSON in markdown code fences; strip them if present
        String cleaned = rawResponse.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceAll("\\s*```$", "");
        }

        JsonNode root = objectMapper.readTree(cleaned);

        List<String> skills = readStringList(root, "skills");
        String experience = root.path("experience").asText("");
        List<String> technologies = readStringList(root, "technologies");
        String education = root.path("education").asText("");
        String summary = root.path("summary").asText("");

        // Parse ATS scores (0-100 integers)
        Integer atsScore = readScore(root, "atsScore");
        Integer keywordScore = readScore(root, "keywordScore");
        Integer formattingScore = readScore(root, "formattingScore");
        Integer skillsScore = readScore(root, "skillsScore");
        Integer experienceScore = readScore(root, "experienceScore");
        Integer educationScore = readScore(root, "educationScore");

        // Parse missing skills detection
        List<String> missingSkills = readStringList(root, "missingSkills");

        // Parse resume improvement fields
        List<String> strengths = readStringList(root, "strengths");
        List<String> weaknesses = readStringList(root, "weaknesses");
        List<String> improvementSuggestions = readStringList(root, "improvementSuggestions");

        return new ResumeAnalysisResponse(
                true,
                fileName,
                pageCount,
                skills,
                experience,
                technologies,
                education,
                summary,
                "Resume analyzed successfully.",
                atsScore,
                keywordScore,
                formattingScore,
                skillsScore,
                experienceScore,
                educationScore,
                missingSkills,
                strengths,
                weaknesses,
                improvementSuggestions
        );
    }

    /**
     * Reads an integer score (0-100) from the JSON node, clamping invalid values.
     * Returns null if the field is missing or not numeric.
     */
    private Integer readScore(JsonNode root, String fieldName) {
        JsonNode node = root.path(fieldName);
        if (node.isMissingNode() || node.isNull() || !node.canConvertToInt()) {
            return null;
        }
        int value = node.asInt();
        // Clamp to 0-100 range
        return Math.max(0, Math.min(100, value));
    }

    private List<String> readStringList(JsonNode root, String fieldName) {
        List<String> result = new ArrayList<>();
        JsonNode node = root.path(fieldName);
        if (node.isArray()) {
            for (JsonNode item : node) {
                if (item.isTextual() && !item.asText().trim().isEmpty()) {
                    result.add(item.asText().trim());
                }
            }
        }
        return result;
    }

    private void saveAnalysis(ResumeAnalysisResponse response, ResumeExtractResponse extractResponse) {
        try {
            Resume resume = new Resume();
            resume.setFileName(response.getFileName());
            resume.setPageCount(response.getPageCount());
            resume.setExtractedText(extractResponse.getExtractedText());
            resume.setSkills(String.join(",", response.getSkills()));
            resume.setExperience(response.getExperience());
            resume.setTechnologies(String.join(",", response.getTechnologies()));
            resume.setEducation(response.getEducation());
            resume.setSummary(response.getSummary());
            resume.setAtsScore(response.getAtsScore());
            resume.setKeywordScore(response.getKeywordScore());
            resume.setFormattingScore(response.getFormattingScore());
            resume.setSkillsScore(response.getSkillsScore());
            resume.setExperienceScore(response.getExperienceScore());
            resume.setEducationScore(response.getEducationScore());
            resume.setMissingSkills(String.join(",", response.getMissingSkills()));
            resume.setStrengths(String.join(",", response.getStrengths()));
            resume.setWeaknesses(String.join(",", response.getWeaknesses()));
            resume.setImprovementSuggestions(String.join(",", response.getImprovementSuggestions()));

            resumeRepository.save(resume);
        } catch (Exception e) {
            System.err.println("Failed to save resume analysis: " + e.getMessage());
        }
    }
}
