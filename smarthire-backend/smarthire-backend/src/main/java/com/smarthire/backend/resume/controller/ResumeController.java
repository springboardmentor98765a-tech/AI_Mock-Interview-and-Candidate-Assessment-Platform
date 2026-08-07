package com.smarthire.backend.resume.controller;

import com.smarthire.backend.entity.Resume;
import com.smarthire.backend.repository.ResumeRepository;
import com.smarthire.backend.resume.dto.ResumeAnalysisResponse;
import com.smarthire.backend.resume.dto.ResumeExtractResponse;
import com.smarthire.backend.resume.dto.ResumeUploadResponse;
import com.smarthire.backend.resume.service.ResumeAnalysisService;
import com.smarthire.backend.resume.service.ResumeReportService;
import com.smarthire.backend.resume.service.ResumeTextExtractionService;
import com.smarthire.backend.resume.service.ResumeUploadService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/resume")
@CrossOrigin("*")
public class ResumeController {

    private final ResumeUploadService resumeUploadService;
    private final ResumeTextExtractionService resumeTextExtractionService;
    private final ResumeAnalysisService resumeAnalysisService;
    private final ResumeReportService resumeReportService;
    private final ResumeRepository resumeRepository;

    public ResumeController(ResumeUploadService resumeUploadService,
                            ResumeTextExtractionService resumeTextExtractionService,
                            ResumeAnalysisService resumeAnalysisService,
                            ResumeReportService resumeReportService,
                            ResumeRepository resumeRepository) {
        this.resumeUploadService = resumeUploadService;
        this.resumeTextExtractionService = resumeTextExtractionService;
        this.resumeAnalysisService = resumeAnalysisService;
        this.resumeReportService = resumeReportService;
        this.resumeRepository = resumeRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<ResumeUploadResponse> uploadResume(
            @RequestParam("resume") MultipartFile resume
    ) {
        try {
            ResumeUploadResponse response = resumeUploadService.uploadResume(resume);
            if (response.isSuccess()) {
                return new ResponseEntity<>(response, HttpStatus.OK);
            }
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            ResumeUploadResponse errorResponse = new ResumeUploadResponse(
                    false,
                    null,
                    null,
                    "Failed to save file: " + e.getMessage()
            );
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/extract")
    public ResponseEntity<ResumeExtractResponse> extractResumeText(
            @RequestParam("resume") MultipartFile resume
    ) {
        try {
            ResumeExtractResponse response = resumeTextExtractionService.extractText(resume);
            if (response.isSuccess()) {
                return new ResponseEntity<>(response, HttpStatus.OK);
            }
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            ResumeExtractResponse errorResponse = new ResumeExtractResponse(
                    false,
                    null,
                    null,
                    0,
                    "Failed to extract text: " + e.getMessage()
            );
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/analyze")
    public ResponseEntity<ResumeAnalysisResponse> analyzeResume(
            @RequestParam("resume") MultipartFile resume
    ) {
        try {
            ResumeAnalysisResponse response = resumeAnalysisService.analyzeResume(resume);
            if (response.isSuccess()) {
                return new ResponseEntity<>(response, HttpStatus.OK);
            }
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            ResumeAnalysisResponse errorResponse = new ResumeAnalysisResponse(
                    false,
                    null,
                    0,
                    null, null, null, null, null,
                    "Failed to analyze resume: " + e.getMessage(),
                    null, null, null, null, null, null
            );
            return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/report/{id}")
    public ResponseEntity<byte[]> downloadResumeReport(@PathVariable Long id) {
        try {
            Resume resume = resumeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Resume not found with id: " + id));

            ResumeAnalysisResponse analysis = new ResumeAnalysisResponse();
            analysis.setSuccess(true);
            analysis.setFileName(resume.getFileName());
            analysis.setPageCount(resume.getPageCount());
            analysis.setSummary(resume.getSummary());
            analysis.setExperience(resume.getExperience());
            analysis.setEducation(resume.getEducation());

            if (resume.getSkills() != null && !resume.getSkills().isEmpty()) {
                analysis.setSkills(java.util.Arrays.asList(resume.getSkills().split(",")));
            }
            if (resume.getTechnologies() != null && !resume.getTechnologies().isEmpty()) {
                analysis.setTechnologies(java.util.Arrays.asList(resume.getTechnologies().split(",")));
            }
            analysis.setAtsScore(resume.getAtsScore());
            analysis.setKeywordScore(resume.getKeywordScore());
            analysis.setFormattingScore(resume.getFormattingScore());
            analysis.setSkillsScore(resume.getSkillsScore());
            analysis.setExperienceScore(resume.getExperienceScore());
            analysis.setEducationScore(resume.getEducationScore());

            if (resume.getMissingSkills() != null && !resume.getMissingSkills().isEmpty()) {
                analysis.setMissingSkills(java.util.Arrays.asList(resume.getMissingSkills().split(",")));
            }
            if (resume.getStrengths() != null && !resume.getStrengths().isEmpty()) {
                analysis.setStrengths(java.util.Arrays.asList(resume.getStrengths().split(",")));
            }
            if (resume.getWeaknesses() != null && !resume.getWeaknesses().isEmpty()) {
                analysis.setWeaknesses(java.util.Arrays.asList(resume.getWeaknesses().split(",")));
            }
            if (resume.getImprovementSuggestions() != null && !resume.getImprovementSuggestions().isEmpty()) {
                analysis.setImprovementSuggestions(java.util.Arrays.asList(resume.getImprovementSuggestions().split(",")));
            }

            byte[] pdfBytes = resumeReportService.generateResumeReport(analysis);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "resume-report-" + id + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}