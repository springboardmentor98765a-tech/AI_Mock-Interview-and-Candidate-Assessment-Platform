package com.smarthire.backend.service;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.smarthire.backend.ai.email.EmailService;

import java.util.Optional;
import java.time.LocalDateTime;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public User registerUser(User user) {
        String role = user.getRole();
        if (role == null || role.isBlank()) {
            role = "candidate";
        }
        role = role.trim().toLowerCase();
        if (!"candidate".equals(role) && !"recruiter".equals(role)) {
            role = "candidate";
        }
        user.setRole(role);
        if (user.getStatus() == null || user.getStatus().isBlank()) user.setStatus("ACTIVE");

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email == null ? "" : email.trim().toLowerCase());
    }

    public Optional<User> loginUser(String email, String password) {
        return userRepository.findByEmail(email == null ? "" : email.trim().toLowerCase())
                .filter(existingUser -> existingUser.getStatus() == null || "ACTIVE".equalsIgnoreCase(existingUser.getStatus()))
                .filter(existingUser -> passwordEncoder.matches(password, existingUser.getPassword()))
                .map(existingUser -> { existingUser.setLastLogin(LocalDateTime.now()); return userRepository.save(existingUser); });
    }

    public String createPasswordResetToken(String email) {
        User user = userRepository.findByEmail(email == null ? "" : email.trim().toLowerCase()).orElse(null);
        if (user == null) return null;
        String raw = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        user.setResetTokenHash(sha256(raw));
        user.setResetTokenExpiresAt(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);
        if (emailService.isConfigured()) {
            try {
                String base = System.getenv().getOrDefault("APP_FRONTEND_BASE_URL", "http://127.0.0.1:5500");
                emailService.sendEmail(user.getEmail(), "SmartHire password reset",
                        "Use this secure reset token within 30 minutes: " + raw + "\n\nReset page: " + base + "/pages/reset-password.html?token=" + raw);
            } catch (Exception ignored) {
                // Never disclose the token through the API. The generic response remains intentionally non-enumerating.
            }
        }
        return raw;
    }

    public boolean resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank() || newPassword == null || newPassword.length() < 6) return false;
        String hash = sha256(rawToken);
        Optional<User> found = userRepository.findAll().stream().filter(u -> hash.equals(u.getResetTokenHash()) && u.getResetTokenExpiresAt() != null && u.getResetTokenExpiresAt().isAfter(LocalDateTime.now())).findFirst();
        if (found.isEmpty()) return false;
        User user = found.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetTokenHash(null); user.setResetTokenExpiresAt(null); userRepository.save(user);
        return true;
    }

    private String sha256(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}