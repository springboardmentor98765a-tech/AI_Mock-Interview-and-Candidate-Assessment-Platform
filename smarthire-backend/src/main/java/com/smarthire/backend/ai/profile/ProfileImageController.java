package com.smarthire.backend.ai.profile;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/profile")
public class ProfileImageController {

    private final UserRepository userRepository;
    private final String uploadDir;

    public ProfileImageController(UserRepository userRepository) {
        this.userRepository = userRepository;
        this.uploadDir = "uploads/profiles";
    }

    @PostMapping("/{userId}/image")
    public ResponseEntity<Map<String, String>> uploadProfileImage(
            @PathVariable Long userId,
            @RequestParam("image") MultipartFile image, Authentication authentication) {
        if (!ownsUser(userId, authentication)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You may only modify your own profile"));
        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Image file is required"));
        }

        try {
            // Validate image type
            String contentType = image.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Only image files are allowed"));
            }

            // Create upload directory if needed
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            // Generate unique filename
            String extension = getExtension(contentType);
            String filename = "profile-" + userId + "-" + UUID.randomUUID() + extension;
            Path targetPath = dir.resolve(filename);

            // Save file
            image.transferTo(targetPath.toFile());

            // Update user record
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setProfileImage("/uploads/profiles/" + filename);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "message", "Profile image uploaded successfully",
                    "imageUrl", user.getProfileImage()
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to save image: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/image")
    public ResponseEntity<Map<String, String>> getProfileImage(@PathVariable Long userId, Authentication authentication) {
        if (!ownsUser(userId, authentication)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(Map.of(
                "imageUrl", user.getProfileImage() == null ? "" : user.getProfileImage()
        ));
    }

    private boolean ownsUser(Long userId, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return userRepository.findByEmail(authentication.getName()).map(User::getId).map(userId::equals).orElse(false);
    }

    private String getExtension(String contentType) {
        if (contentType == null) {
            return ".jpg";
        }
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}