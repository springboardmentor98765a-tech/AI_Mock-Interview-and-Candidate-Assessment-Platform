package com.smarthire.backend.interview.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Storage abstraction for interview recording files (video/audio blobs).
 *
 * The rest of the application only ever talks to this interface and stores the
 * opaque key it returns - never a filesystem path or public URL - so the storage
 * backend can be swapped (e.g. to AWS S3 or Azure Blob Storage) by providing a
 * different implementation, without touching any controller/service code.
 *
 * The active implementation is selected via the {@code app.recording.storage.provider}
 * property. Only {@code local} is implemented today (development-safe, not
 * publicly exposed); {@code s3} is left as an extension point.
 */
public interface RecordingStorageService {

    /**
     * Persists the given file and returns an opaque storage key that can later be
     * passed to {@link #load(String)}. Never returns a public URL.
     */
    String store(Long interviewId, Long sessionId, String kind, MultipartFile file) throws IOException;

    /**
     * Resolves a previously stored key back to a readable resource. Throws if the
     * key does not exist.
     */
    Resource load(String storageKey) throws IOException;
}
