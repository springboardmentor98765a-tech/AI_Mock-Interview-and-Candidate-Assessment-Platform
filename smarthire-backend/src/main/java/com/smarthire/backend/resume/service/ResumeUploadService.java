package com.smarthire.backend.resume.service;

import com.smarthire.backend.resume.dto.ResumeUploadResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class ResumeUploadService {

    @Value("${app.upload.dir:uploads/resumes}")
    private String uploadDir;

    public ResumeUploadResponse uploadResume(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return new ResumeUploadResponse(false, null, null, "No file selected. Please choose a PDF file to upload.");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || !originalFileName.toLowerCase().endsWith(".pdf")) {
            return new ResumeUploadResponse(false, null, null, "Only PDF files are allowed. Please upload a .pdf file.");
        }

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath);

        String storedFileName = UUID.randomUUID().toString() + "_" + originalFileName;
        Path targetLocation = uploadPath.resolve(storedFileName);

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        String filePath = targetLocation.toString();

        return new ResumeUploadResponse(
                true,
                originalFileName,
                filePath,
                "Resume uploaded successfully."
        );
    }
}