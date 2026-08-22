package com.smarthire.backend.resume.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.repository.UserRepository;
import com.smarthire.backend.resume.ai.GeminiApiClient;
import com.smarthire.backend.resume.dto.ResumeAnalysisResponse;
import com.smarthire.backend.resume.dto.ResumeExtractResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class ResumeAnalysisService {

    private final ResumeTextExtractionService resumeTextExtractionService;
    private final GeminiApiClient geminiApiClient;
    private final ObjectMapper objectMapper;
    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    @Value("${app.upload.dir:uploads/resumes}")
    private String uploadDir;

    public ResumeAnalysisService(ResumeTextExtractionService resumeTextExtractionService,
                                 GeminiApiClient geminiApiClient,
                                 ResumeRepository resumeRepository,
                                 UserRepository userRepository) {
        this.resumeTextExtractionService = resumeTextExtractionService;
        this.geminiApiClient = geminiApiClient;
        this.objectMapper = new ObjectMapper();
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
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
            // Do not throw away a perfectly readable resume just because Gemini is unavailable.
            // Return a deterministic text-extraction analysis so skills/technologies remain useful.
            ResumeAnalysisResponse fallback = buildDeterministicFallback(fileName, pageCount, extractedText,
                    "AI analysis unavailable: " + safeMessage(e.getMessage()));
            Long savedResumeId = saveAnalysis(fallback, extractResponse, file, currentUserId());
            fallback.setResumeId(savedResumeId);
            return fallback;
        }

        // Step 4: Parse the JSON response from Gemini
        try {
            ResumeAnalysisResponse response = parseGeminiResponse(geminiRawResponse, fileName, pageCount, extractedText);
            if (response.isSuccess()) {
                Long savedResumeId = saveAnalysis(response, extractResponse, file, currentUserId());
                response.setResumeId(savedResumeId);
            }
            return response;
        } catch (JsonProcessingException e) {
            // Gemini occasionally returns malformed JSON even with responseMimeType=application/json.
            // Fall back to deterministic extraction instead of showing an empty analyzer.
            ResumeAnalysisResponse fallback = buildDeterministicFallback(fileName, pageCount, extractedText,
                    "AI response parsing failed; showing extracted resume analysis.");
            Long savedResumeId = saveAnalysis(fallback, extractResponse, file, currentUserId());
            fallback.setResumeId(savedResumeId);
            return fallback;
        }
    }

    private ResumeAnalysisResponse parseGeminiResponse(String rawResponse, String fileName, int pageCount, String extractedText)
            throws JsonProcessingException {

        // Gemini may wrap the JSON in markdown code fences; strip them if present
        String cleaned = rawResponse.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceAll("\\s*```$", "");
        }

        JsonNode root = objectMapper.readTree(cleaned);
        if (root.path("analysis").isObject()) {
            root = root.path("analysis");
        }

        List<String> skills = mergeLists(
                readStringListFlexible(root, "skills"),
                readStringListFlexible(root, "technicalSkills"),
                readStringListFlexible(root, "softSkills"),
                readStringListFlexible(root, "programmingLanguages"),
                readStringListFlexible(root, "frameworks")
        );
        String experience = root.path("experience").asText(root.path("experienceSummary").asText(""));
        List<String> technologies = mergeLists(
                readStringListFlexible(root, "technologies"),
                readStringListFlexible(root, "programmingLanguages"),
                readStringListFlexible(root, "frameworks"),
                readStringListFlexible(root, "libraries"),
                readStringListFlexible(root, "databases"),
                readStringListFlexible(root, "tools"),
                readStringListFlexible(root, "cloudTechnologies")
        );

        // Gemini occasionally returns an empty/partial skills array even when the
        // extracted resume text clearly contains technical skills. Use a deterministic
        // text-derived fallback so the UI never incorrectly reports "No skills found".
        // Always merge deterministic text detection with Gemini results. This makes the UI
        // resilient when Gemini omits one or two obvious keywords from an otherwise valid response.
        skills = mergeLists(skills, extractKnownSkillsFromResumeText(extractedText));
        technologies = mergeLists(technologies, extractKnownTechnologiesFromResumeText(extractedText));
        String education = root.path("education").asText("");
        String summary = root.path("summary").asText("");

        // Parse ATS scores (0-100 integers)
        Integer atsScore = readScore(root, "atsScore");
        Integer keywordScore = readScore(root, "keywordScore");
        Integer formattingScore = readScore(root, "formattingScore");
        Integer skillsScore = readScore(root, "skillsScore");
        Integer experienceScore = readScore(root, "experienceScore");
        Integer educationScore = readScore(root, "educationScore");

        // Keep the displayed overall ATS score mathematically consistent with its
        // five breakdown components whenever all components are available.
        if (keywordScore != null && formattingScore != null && skillsScore != null
                && experienceScore != null && educationScore != null) {
            atsScore = weightedAtsScore(keywordScore, skillsScore, formattingScore, experienceScore, educationScore);
        }

        // Parse missing skills detection
        List<String> missingSkills = readStringListFlexible(root, "missingSkills");

        // Parse resume improvement fields
        List<String> strengths = readStringListFlexible(root, "strengths");
        List<String> weaknesses = readStringListFlexible(root, "weaknesses");
        List<String> improvementSuggestions = readStringListFlexible(root, "improvementSuggestions");

        ResumeAnalysisResponse response = new ResumeAnalysisResponse(
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
        response.setExtractedText(extractedText);
        return response;
    }

    private int weightedAtsScore(int keywordScore, int skillsScore, int formattingScore, int experienceScore, int educationScore) {
        return Math.max(0, Math.min(100, Math.round((keywordScore * 0.25f)
                + (skillsScore * 0.25f)
                + (formattingScore * 0.20f)
                + (experienceScore * 0.20f)
                + (educationScore * 0.10f))));
    }

    private List<String> readStringListFlexible(JsonNode root, String fieldName) {
        JsonNode node = root.path(fieldName);
        List<String> result = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> {
                if (item.isTextual() && !item.asText().trim().isEmpty()) {
                    result.add(item.asText().trim());
                }
            });
        } else if (node.isTextual()) {
            String text = node.asText().trim();
            if (!text.isEmpty()) {
                result.addAll(Arrays.stream(text.split("[,;|\n]+"))
                        .map(String::trim)
                        .filter(v -> !v.isEmpty())
                        .toList());
            }
        } else if (node.isObject()) {
            node.elements().forEachRemaining(child -> {
                if (child.isTextual()) {
                    String value = child.asText().trim();
                    if (!value.isEmpty()) result.add(value);
                } else if (child.isArray()) {
                    child.forEach(item -> {
                        if (item.isTextual() && !item.asText().trim().isEmpty()) result.add(item.asText().trim());
                    });
                }
            });
        }
        return dedupe(result);
    }

    @SafeVarargs
    private final List<String> mergeLists(List<String>... lists) {
        Set<String> merged = new LinkedHashSet<>();
        for (List<String> list : lists) {
            if (list != null) {
                for (String value : list) {
                    if (value != null && !value.isBlank()) merged.add(value.trim());
                }
            }
        }
        return new ArrayList<>(merged);
    }

    private List<String> dedupe(List<String> values) {
        Set<String> seen = new LinkedHashSet<>();
        for (String value : values) {
            if (value != null && !value.isBlank()) seen.add(value.trim());
        }
        return new ArrayList<>(seen);
    }

    private List<String> extractKnownSkillsFromResumeText(String text) {
        return detectTerms(text, List.of(
                "Java", "JavaScript", "TypeScript", "Python", "C", "C++", "C#", "SQL",
                "HTML", "CSS", "React", "Angular", "Vue", "Spring Boot", "Spring", "REST",
                "REST APIs", "Git", "GitHub", "Docker", "Kubernetes", "AWS", "Azure",
                "PostgreSQL", "MySQL", "MongoDB", "Node.js", "Express", "Data Structures",
                "Algorithms", "OOP", "Problem Solving", "Communication", "Teamwork"
        ));
    }

    private List<String> extractKnownTechnologiesFromResumeText(String text) {
        return detectTerms(text, List.of(
                "Java", "JavaScript", "TypeScript", "Python", "React", "Angular", "Vue",
                "Spring Boot", "Node.js", "Express", "PostgreSQL", "MySQL", "MongoDB",
                "Git", "GitHub", "Docker", "Kubernetes", "AWS", "Azure", "HTML", "CSS", "SQL"
        ));
    }

    private List<String> detectTerms(String text, List<String> candidates) {
        if (text == null || text.isBlank()) return new ArrayList<>();
        String normalized = " " + text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#.]+", " ") + " ";
        List<String> found = new ArrayList<>();
        for (String candidate : candidates) {
            String needle = " " + candidate.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#.]+", " ").trim() + " ";
            if (normalized.contains(needle) || normalized.contains(" " + candidate.toLowerCase(Locale.ROOT) + " ")) {
                found.add(candidate);
            }
        }
        return dedupe(found);
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

    private String safeMessage(String message) {
        if (message == null || message.isBlank()) return "service unavailable";
        return message.length() > 220 ? message.substring(0, 220) : message;
    }

    private ResumeAnalysisResponse buildDeterministicFallback(String fileName, int pageCount, String extractedText, String reason) {
        List<String> skills = extractKnownSkillsFromResumeText(extractedText);
        List<String> technologies = extractKnownTechnologiesFromResumeText(extractedText);
        int skillScore = Math.min(100, skills.size() * 8);
        int keywordScore = Math.min(100, technologies.size() * 7);
        int formattingScore = hasStandardResumeSections(extractedText) ? 88 : 62;
        int experienceScore = containsAny(extractedText, "experience", "work experience", "employment") ? 78 : 45;
        int educationScore = containsAny(extractedText, "education", "bachelor", "master", "university", "college") ? 82 : 45;
        int atsScore = Math.max(0, Math.min(100, Math.round((keywordScore * .25f) + (skillScore * .25f) + (formattingScore * .20f) + (experienceScore * .20f) + (educationScore * .10f))));

        List<String> missingSkills = new ArrayList<>();
        if (!containsAny(extractedText, "docker")) missingSkills.add("Docker");
        if (!containsAny(extractedText, "aws", "amazon web services")) missingSkills.add("AWS");
        if (!containsAny(extractedText, "react")) missingSkills.add("React");
        if (!containsAny(extractedText, "testing", "junit", "jest")) missingSkills.add("Testing");

        String summary = firstNonBlank(
                extractSection(extractedText, "summary", "profile", "objective"),
                "Resume text was extracted successfully. AI analysis was unavailable, so SmartHire provided a deterministic skill and ATS baseline.");
        String experience = firstNonBlank(
                extractSection(extractedText, "experience", "work experience", "employment"),
                "Experience section detected from the resume text.");
        String education = firstNonBlank(
                extractSection(extractedText, "education", "academic background"),
                "Education section detected from the resume text.");

        List<String> strengths = new ArrayList<>();
        if (!skills.isEmpty()) strengths.add("Recognizable skills and technologies were extracted.");
        if (formattingScore >= 80) strengths.add("Standard resume sections and ATS-friendly structure detected.");
        if (experienceScore >= 70) strengths.add("Experience section is present and readable.");

        List<String> weaknesses = new ArrayList<>();
        if (skills.isEmpty()) weaknesses.add("No known technology/skill keywords were detected automatically.");
        if (missingSkills.size() >= 2) weaknesses.add("Several commonly requested skills are not visible in the extracted text.");
        weaknesses.add("AI-generated qualitative feedback is unavailable in fallback mode.");

        List<String> suggestions = new ArrayList<>();
        if (!missingSkills.isEmpty()) suggestions.add("Add relevant missing skills only when you genuinely have those skills.");
        suggestions.add("Use measurable achievements and clear role/project descriptions.");
        suggestions.add("Keep standard headings and concise bullet points for ATS readability.");

        ResumeAnalysisResponse response = new ResumeAnalysisResponse(true, fileName, pageCount, skills, experience, technologies, education, summary, reason,
                atsScore, keywordScore, formattingScore, skillScore, experienceScore, educationScore,
                missingSkills, strengths, weaknesses, suggestions);
        response.setExtractedText(extractedText);
        return response;
    }

    private boolean containsAny(String text, String... needles) {
        if (text == null) return false;
        String lower = text.toLowerCase(Locale.ROOT);
        for (String needle : needles) if (needle != null && lower.contains(needle.toLowerCase(Locale.ROOT))) return true;
        return false;
    }

    private boolean hasStandardResumeSections(String text) {
        int count = 0;
        for (String section : List.of("experience", "education", "skills", "projects", "summary")) {
            if (containsAny(text, section)) count++;
        }
        return count >= 3;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) if (value != null && !value.isBlank()) return value.trim();
        return "";
    }

    private String extractSection(String text, String... headings) {
        if (text == null || text.isBlank()) return "";
        String[] lines = text.replace("\r", "").split("\n");
        boolean active = false;
        StringBuilder out = new StringBuilder();
        for (String raw : lines) {
            String line = raw.trim();
            String low = line.toLowerCase(Locale.ROOT);
            if (!active) {
                for (String heading : headings) {
                    if (low.equals(heading) || low.startsWith(heading + ":") || low.startsWith(heading + " ")) {
                        active = true;
                        String remainder = line.length() > heading.length() ? line.substring(heading.length()).replaceFirst("^[\\s:|-]+", "") : "";
                        if (!remainder.isBlank()) out.append(remainder).append(' ');
                        break;
                    }
                }
            } else {
                if (isLikelyHeading(line)) break;
                if (!line.isBlank()) out.append(line).append(' ');
            }
        }
        return out.toString().trim();
    }

    private boolean isLikelyHeading(String line) {
        String l = line.toLowerCase(Locale.ROOT);
        return List.of("experience", "work experience", "education", "skills", "technical skills", "projects", "certifications", "summary", "profile", "objective", "achievements").contains(l);
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getPrincipal() == null) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        String email = null;
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else if (principal instanceof String) {
            email = (String) principal;
        }
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(email).map(User::getId).orElse(null);
    }

    private Long saveAnalysis(ResumeAnalysisResponse response, ResumeExtractResponse extractResponse, MultipartFile originalFile, Long ownerUserId) {
        try {
            Resume resume = new Resume();
            resume.setUserId(ownerUserId);
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String safeName = response.getFileName() == null ? "resume.pdf" : response.getFileName().replaceAll("[^a-zA-Z0-9._-]", "_");
            Path stored = dir.resolve(UUID.randomUUID() + "_" + safeName);
            if (originalFile != null && !originalFile.isEmpty()) originalFile.transferTo(stored.toFile());
            resume.setFilePath(stored.toString());
            resume.setFileName(response.getFileName());
            resume.setPageCount(response.getPageCount());
            resume.setExtractedText(extractResponse.getExtractedText());
            resume.setSkills(String.join(",", response.getSkills() == null ? java.util.List.of() : response.getSkills()));
            resume.setExperience(response.getExperience());
            resume.setTechnologies(String.join(",", response.getTechnologies() == null ? java.util.List.of() : response.getTechnologies()));
            resume.setEducation(response.getEducation());
            resume.setSummary(response.getSummary());
            resume.setAtsScore(response.getAtsScore());
            resume.setKeywordScore(response.getKeywordScore());
            resume.setFormattingScore(response.getFormattingScore());
            resume.setSkillsScore(response.getSkillsScore());
            resume.setExperienceScore(response.getExperienceScore());
            resume.setEducationScore(response.getEducationScore());
            resume.setMissingSkills(String.join(",", response.getMissingSkills() == null ? java.util.List.of() : response.getMissingSkills()));
            resume.setStrengths(String.join(",", response.getStrengths() == null ? java.util.List.of() : response.getStrengths()));
            resume.setWeaknesses(String.join(",", response.getWeaknesses() == null ? java.util.List.of() : response.getWeaknesses()));
            resume.setImprovementSuggestions(String.join(",", response.getImprovementSuggestions() == null ? java.util.List.of() : response.getImprovementSuggestions()));

            Resume saved = resumeRepository.save(resume);
            return saved.getId();
        } catch (Exception e) {
            System.err.println("Failed to save resume analysis: " + e.getMessage());
            return null;
        }
    }
}
