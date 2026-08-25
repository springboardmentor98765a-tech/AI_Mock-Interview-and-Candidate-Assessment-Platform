package com.smarthireai.Service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResumeParserService {

    // =========================================================
    // MAIN METHOD
    // =========================================================

    public Map<String, String> parseResume(String text) {

        Map<String, String> result = new LinkedHashMap<>();

        if (text == null || text.trim().isEmpty()) {

            result.put("skills", "");
            result.put("experience", "");
            result.put("education", "");
            result.put("technologies", "");
            result.put("summary", "");

            return result;
        }

        // Clean extracted PDF text
        String cleanedText = cleanText(text);

        // Extract all required information
        String skills = extractSkills(cleanedText);
        String experience = extractExperience(cleanedText);
        String education = extractEducation(cleanedText);
        String technologies = extractTechnologies(cleanedText);
        String summary = generateSummary(
                cleanedText,
                skills,
                experience,
                education
        );

        result.put("skills", skills);
        result.put("experience", experience);
        result.put("education", education);
        result.put("technologies", technologies);
        result.put("summary", summary);

        return result;
    }


    // =========================================================
    // CLEAN PDF TEXT
    // =========================================================

    private String cleanText(String text) {

        // Replace different line endings
        text = text.replace("\r\n", "\n");
        text = text.replace("\r", "\n");

        // Remove excessive spaces
        text = text.replaceAll("[ \\t]+", " ");

        // Remove excessive blank lines
        text = text.replaceAll("\n{3,}", "\n\n");

        return text.trim();
    }


    // =========================================================
    // SKILLS
    // =========================================================

    private String extractSkills(String text) {

        String lowerText = text.toLowerCase();

        List<String> skillList = Arrays.asList(

                // Programming Languages
                "python",
                "java",
                "c++",
                "c#",
                "javascript",
                "typescript",
                "kotlin",
                "swift",
                "go",
                "ruby",
                "php",

                // Web Development
                "html",
                "css",
                "react",
                "angular",
                "vue",
                "node.js",
                "express.js",

                // Database
                "sql",
                "mysql",
                "postgresql",
                "mongodb",
                "oracle",
                "sqlite",
                "redis",

                // AI / ML
                "machine learning",
                "deep learning",
                "artificial intelligence",
                "natural language processing",
                "nlp",
                "computer vision",
                "generative ai",
                "data science",
                "data analysis",

                // Frameworks
                "spring boot",
                "spring",
                "django",
                "flask",
                "tensorflow",
                "pytorch",
                "scikit-learn",
                "keras",

                // Cloud / DevOps
                "aws",
                "azure",
                "google cloud",
                "docker",
                "kubernetes",
                "jenkins",

                // Tools
                "git",
                "github",
                "gitlab",
                "postman",

                // APIs / Security
                "rest api",
                "restful api",
                "jwt",
                "oauth2",

                // Other
                "agile",
                "scrum"
        );

        List<String> foundSkills = new ArrayList<>();

        for (String skill : skillList) {

            if (containsKeyword(lowerText, skill)) {

                foundSkills.add(skill);
            }
        }

        return String.join(", ", foundSkills);
    }


    // =========================================================
    // TECHNOLOGIES
    // =========================================================

    private String extractTechnologies(String text) {

        List<String> technologyList = Arrays.asList(

                "Java",
                "Python",
                "C++",
                "C#",
                "JavaScript",
                "TypeScript",
                "Kotlin",
                "Swift",
                "Go",
                "HTML",
                "CSS",
                "React",
                "Angular",
                "Vue",
                "Node.js",
                "Express.js",

                "Spring",
                "Spring Boot",
                "Django",
                "Flask",

                "TensorFlow",
                "PyTorch",
                "Scikit-learn",
                "Keras",

                "PostgreSQL",
                "MySQL",
                "MongoDB",
                "Oracle",
                "SQLite",
                "Redis",

                "Firebase",

                "AWS",
                "Azure",
                "Google Cloud",

                "Docker",
                "Kubernetes",
                "Jenkins",

                "Git",
                "GitHub",
                "GitLab",
                "Postman",

                "REST API",
                "RESTful API",
                "JWT",
                "OAuth2",

                "LangChain",
                "Hugging Face",
                "OpenAI",
                "Pinecone",
                "ChromaDB"
        );

        List<String> foundTechnologies = new ArrayList<>();

        for (String technology : technologyList) {

            if (containsKeyword(
                    text.toLowerCase(),
                    technology.toLowerCase()
            )) {

                foundTechnologies.add(technology);
            }
        }

        return String.join(", ", foundTechnologies);
    }


    // =========================================================
    // EXPERIENCE
    // =========================================================

    private String extractExperience(String text) {

        String section = extractSection(
                text,

                Arrays.asList(
                        "experience",
                        "work experience",
                        "professional experience",
                        "employment history",
                        "work history",
                        "career history",
                        "internship",
                        "internships"
                ),

                Arrays.asList(
                        "education",
                        "academic background",
                        "academic qualification",
                        "skills",
                        "technical skills",
                        "technical skill",
                        "projects",
                        "personal projects",
                        "academic projects",
                        "certifications",
                        "achievements",
                        "awards",
                        "languages",
                        "interests",
                        "hobbies",
                        "references"
                )
        );

        return cleanSection(section);
    }


    // =========================================================
    // EDUCATION
    // =========================================================

    private String extractEducation(String text) {

        String section = extractSection(
                text,

                Arrays.asList(
                        "education",
                        "academic background",
                        "educational background",
                        "educational qualification",
                        "academic qualification",
                        "academic qualifications"
                ),

                Arrays.asList(
                        "experience",
                        "work experience",
                        "professional experience",
                        "employment history",
                        "skills",
                        "technical skills",
                        "technical skill",
                        "projects",
                        "personal projects",
                        "certifications",
                        "achievements",
                        "awards",
                        "languages",
                        "interests",
                        "hobbies",
                        "references"
                )
        );

        return cleanSection(section);
    }


    // =========================================================
    // SECTION EXTRACTION
    // =========================================================

    private String extractSection(
            String text,
            List<String> startKeywords,
            List<String> endKeywords) {

        String[] lines = text.split("\n");

        boolean collecting = false;

        StringBuilder section = new StringBuilder();

        for (String line : lines) {

            String cleanedLine = line.trim();

            if (cleanedLine.isEmpty()) {
                continue;
            }

            String normalizedLine =
                    normalizeHeading(cleanedLine);

            // ---------------------------------------------
            // Find section start
            // ---------------------------------------------

            if (!collecting) {

                if (isHeadingMatch(
                        normalizedLine,
                        startKeywords)) {

                    collecting = true;
                }

                continue;
            }

            // ---------------------------------------------
            // Find section end
            // ---------------------------------------------

            if (isHeadingMatch(
                    normalizedLine,
                    endKeywords)) {

                break;
            }

            section.append(cleanedLine)
                    .append("\n");
        }

        return section.toString().trim();
    }


    // =========================================================
    // HEADING NORMALIZATION
    // =========================================================

    private String normalizeHeading(String line) {

        String normalized = line
                .toLowerCase()
                .trim();

        // Remove common heading symbols
        normalized = normalized
                .replaceAll("^[\\-:•*]+", "")
                .replaceAll("[\\-:•*]+$", "")
                .trim();

        // Convert multiple spaces to one
        normalized = normalized.replaceAll("\\s+", " ");

        return normalized;
    }


    // =========================================================
    // CHECK SECTION HEADING
    // =========================================================

    private boolean isHeadingMatch(
            String line,
            List<String> keywords) {

        for (String keyword : keywords) {

            String normalizedKeyword =
                    keyword.toLowerCase().trim();

            if (line.equals(normalizedKeyword)) {
                return true;
            }
        }

        return false;
    }


    // =========================================================
    // KEYWORD MATCHING
    // =========================================================

    private boolean containsKeyword(
            String text,
            String keyword) {

        /*
         * Special handling for keywords such as:
         *
         * C
         * C++
         * C#
         * Node.js
         * Scikit-learn
         */

        String escaped =
                Pattern.quote(keyword);

        String regex =
                "(?i)(?<![a-zA-Z0-9])"
                        + escaped
                        + "(?![a-zA-Z0-9])";

        Pattern pattern =
                Pattern.compile(regex);

        Matcher matcher =
                pattern.matcher(text);

        return matcher.find();
    }


    // =========================================================
    // CLEAN SECTION
    // =========================================================

    private String cleanSection(String section) {

        if (section == null ||
                section.trim().isEmpty()) {

            return "";
        }

        String cleaned =
                section.replaceAll("\\s+", " ").trim();

        return cleaned;
    }


    // =========================================================
    // SUMMARY
    // =========================================================

    private String generateSummary(
            String text,
            String skills,
            String experience,
            String education) {

        StringBuilder summary =
                new StringBuilder();

        // ---------------------------------------------
        // Experience
        // ---------------------------------------------

        if (experience != null &&
                !experience.isBlank()) {

            String experienceSummary =
                    limitText(experience, 250);

            summary.append(experienceSummary);
        }

        // ---------------------------------------------
        // Education
        // ---------------------------------------------

        if (education != null &&
                !education.isBlank()) {

            if (summary.length() > 0) {
                summary.append(" ");
            }

            summary.append(
                    "Education: "
            );

            summary.append(
                    limitText(education, 200)
            );
        }

        // ---------------------------------------------
        // Skills
        // ---------------------------------------------

        if (skills != null &&
                !skills.isBlank()) {

            if (summary.length() > 0) {
                summary.append(" ");
            }

            summary.append(
                    "Skills: "
            );

            summary.append(skills);
        }

        // ---------------------------------------------
        // If nothing extracted
        // ---------------------------------------------

        if (summary.length() == 0) {

            String cleanedText =
                    text.replaceAll(
                            "\\s+",
                            " "
                    ).trim();

            return limitText(
                    cleanedText,
                    500
            );
        }

        return summary.toString().trim();
    }


    // =========================================================
    // LIMIT TEXT
    // =========================================================

    private String limitText(
            String text,
            int maxLength) {

        if (text == null ||
                text.isBlank()) {

            return "";
        }

        text = text.trim();

        if (text.length() <= maxLength) {

            return text;
        }

        return text.substring(
                0,
                maxLength
        ).trim() + "...";
    }
}