package com.smarthireai.Service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfTextExtractorService {

    public String extractText(MultipartFile file) throws Exception {

        try (PDDocument document =
                     PDDocument.load(file.getInputStream())) {

            PDFTextStripper stripper =
                    new PDFTextStripper();

            return stripper.getText(document);
        }
    }
}