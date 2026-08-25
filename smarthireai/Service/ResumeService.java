package com.smarthireai.Service;

import com.smarthireai.Entity.Resume;
import com.smarthireai.entity.User;
import com.smarthireai.Repository.ResumeRepository;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class ResumeService {

    private final ResumeRepository resumeRepository;
    private final PdfTextExtractorService pdfTextExtractorService;
    private final ResumeParserService resumeParserService;

    public ResumeService(
            ResumeRepository resumeRepository,
            PdfTextExtractorService pdfTextExtractorService,
            ResumeParserService resumeParserService) {

        this.resumeRepository = resumeRepository;
        this.pdfTextExtractorService = pdfTextExtractorService;
        this.resumeParserService = resumeParserService;
    }

    public Resume uploadResume(
            MultipartFile file,
            User user) throws Exception {

        // =====================================================
        // 1. CHECK FILE
        // =====================================================

        if (file == null || file.isEmpty()) {
            throw new RuntimeException(
                    "Resume file is empty"
            );
        }

        // =====================================================
        // 2. CHECK PDF
        // =====================================================

        String contentType = file.getContentType();

        if (contentType == null ||
                !contentType.equalsIgnoreCase("application/pdf")) {

            throw new RuntimeException(
                    "Only PDF files are allowed"
            );
        }

        // =====================================================
        // 3. CHECK FILE SIZE
        // =====================================================

        if (file.getSize() > 5 * 1024 * 1024) {

            throw new RuntimeException(
                    "Resume file must be less than 5 MB"
            );
        }

        // =====================================================
        // 4. EXTRACT TEXT FROM PDF
        // =====================================================

        String extractedText =
                pdfTextExtractorService.extractText(file);

        if (extractedText == null ||
                extractedText.trim().isEmpty()) {

            throw new RuntimeException(
                    "Could not extract text from the PDF"
            );
        }

        // =====================================================
        // 5. PARSE RESUME
        // =====================================================

        Map<String, String> parsedData =
                resumeParserService.parseResume(extractedText);

        // =====================================================
        // 6. CREATE RESUME
        // =====================================================

        Resume resume = new Resume();

        resume.setFileName(
                file.getOriginalFilename()
        );

        resume.setFileType(
                contentType
        );

        resume.setFileSize(
                file.getSize()
        );

        // Full extracted PDF text
        resume.setExtractedText(
                extractedText
        );

        // =====================================================
        // 7. EXTRACTED INFORMATION
        // =====================================================

        resume.setSkills(
                parsedData.getOrDefault(
                        "skills",
                        ""
                )
        );

        resume.setExperience(
                parsedData.getOrDefault(
                        "experience",
                        ""
                )
        );

        resume.setEducation(
                parsedData.getOrDefault(
                        "education",
                        ""
                )
        );

        resume.setTechnologies(
                parsedData.getOrDefault(
                        "technologies",
                        ""
                )
        );

        resume.setSummary(
                parsedData.getOrDefault(
                        "summary",
                        ""
                )
        );

        // =====================================================
        // 8. UPLOAD DATE
        // =====================================================

        resume.setUploadedAt(
                LocalDateTime.now()
        );

        // =====================================================
        // 9. CONNECT RESUME WITH USER
        // =====================================================

        resume.setUser(user);

        // =====================================================
        // 10. SAVE TO DATABASE
        // =====================================================

        return resumeRepository.save(resume);
    }
}