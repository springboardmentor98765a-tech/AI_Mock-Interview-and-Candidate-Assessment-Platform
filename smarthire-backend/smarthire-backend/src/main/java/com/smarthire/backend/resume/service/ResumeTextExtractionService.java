package com.smarthire.backend.resume.service;

import com.smarthire.backend.resume.dto.ResumeExtractResponse;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class ResumeTextExtractionService {

    public ResumeExtractResponse extractText(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return new ResumeExtractResponse(false, null, null, 0, "No file selected. Please upload a PDF file.");
        }

        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || !originalFileName.toLowerCase().endsWith(".pdf")) {
            return new ResumeExtractResponse(false, null, null, 0, "Only PDF files are allowed.");
        }

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String extractedText = stripper.getText(document);
            int pageCount = document.getNumberOfPages();

            if (extractedText == null || extractedText.trim().isEmpty()) {
                return new ResumeExtractResponse(false, originalFileName, null, pageCount, "No text could be extracted from the PDF.");
            }

            return new ResumeExtractResponse(true, originalFileName, extractedText, pageCount, "Text extracted successfully.");
        }
    }
}