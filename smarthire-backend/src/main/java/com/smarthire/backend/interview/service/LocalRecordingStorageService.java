package com.smarthire.backend.interview.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Development-safe local-disk implementation of {@link RecordingStorageService}.
 *
 * Files are written under {@code app.recording.storage.dir} (default
 * "uploads/recordings"), which is NOT served by any static resource handler or
 * public endpoint - the only way to read a file back is through this service,
 * which is only ever invoked from the authorized recording-download endpoint in
 * InterviewSessionController after an ownership/role check.
 *
 * This is intentionally the only enabled provider today. Swapping to AWS S3 or
 * Azure Blob Storage later means adding a new RecordingStorageService
 * implementation (e.g. S3RecordingStorageService) and switching
 * app.recording.storage.provider - no other code changes.
 */
@Service
public class LocalRecordingStorageService implements RecordingStorageService {

    @Value("${app.recording.storage.dir:uploads/recordings}")
    private String storageDir;

    @Override
    public String store(Long interviewId, Long sessionId, String kind, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IOException("No file provided for recording upload.");
        }

        Path basePath = Paths.get(storageDir, String.valueOf(interviewId), String.valueOf(sessionId))
                .toAbsolutePath().normalize();
        Files.createDirectories(basePath);

        String extension = resolveExtension(file.getOriginalFilename(), file.getContentType());
        String storedFileName = kind + "-" + UUID.randomUUID() + extension;
        Path targetLocation = basePath.resolve(storedFileName);

        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        // Return a relative key, not an absolute filesystem path - keeps the
        // abstraction portable to a future cloud backend where "keys" aren't paths.
        return Paths.get(String.valueOf(interviewId), String.valueOf(sessionId), storedFileName)
                .toString().replace('\\', '/');
    }

    @Override
    public Resource load(String storageKey) throws IOException {
        if (storageKey == null || storageKey.isBlank()) {
            throw new IOException("Recording key is missing.");
        }
        Path basePath = Paths.get(storageDir).toAbsolutePath().normalize();
        Path filePath = basePath.resolve(storageKey).normalize();

        // Guard against path traversal - the resolved file must stay inside the
        // configured storage root.
        if (!filePath.startsWith(basePath)) {
            throw new IOException("Invalid recording key.");
        }
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new IOException("Recording file not found: " + storageKey);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new IOException("Invalid recording key.", e);
        }
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        if (contentType != null) {
            if (contentType.contains("webm")) {
                return ".webm";
            }
            if (contentType.contains("mp4")) {
                return ".mp4";
            }
            if (contentType.contains("mpeg") || contentType.contains("mp3")) {
                return ".mp3";
            }
        }
        return ".bin";
    }
}
