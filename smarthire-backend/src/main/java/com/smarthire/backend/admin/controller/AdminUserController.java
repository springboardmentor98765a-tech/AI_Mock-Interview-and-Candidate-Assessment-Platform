package com.smarthire.backend.admin.controller;

import com.smarthire.backend.admin.dto.AdminUserRequest;
import com.smarthire.backend.admin.dto.AdminUserResponse;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import com.smarthire.backend.platform.entity.PlatformActionLog;
import com.smarthire.backend.platform.repository.PlatformActionLogRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlatformActionLogRepository actionLogRepository;

    public AdminUserController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                               PlatformActionLogRepository actionLogRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.actionLogRepository = actionLogRepository;
    }

    @GetMapping
    public List<AdminUserResponse> list(@RequestParam(required = false) String search,
                                        @RequestParam(required = false) String role,
                                        @RequestParam(required = false) String status) {
        return userRepository.findAll().stream()
                .filter(u -> search == null || search.isBlank() || contains(u.getName(), search) || contains(u.getEmail(), search))
                .filter(u -> role == null || role.isBlank() || "all".equalsIgnoreCase(role) || role.equalsIgnoreCase(u.getRole()))
                .filter(u -> status == null || status.isBlank() || "all".equalsIgnoreCase(status) || status.equalsIgnoreCase(u.getStatus()))
                .map(this::toResponse).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody AdminUserRequest request) {
        if (blank(request.getName()) || blank(request.getEmail()) || blank(request.getPassword()))
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "Name, email and password are required"));
        if (userRepository.findByEmail(request.getEmail().trim().toLowerCase()).isPresent())
            return ResponseEntity.status(HttpStatus.CONFLICT).body(java.util.Map.of("message", "Email already exists"));
        String role = normalizeRole(request.getRole());
        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus(normalizeStatus(request.getStatus()));
        User saved = userRepository.save(user);
        log("CREATE_USER", "Created " + role + " " + saved.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody AdminUserRequest request) {
        var optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(java.util.Map.of("message", "User not found"));
        }

        User user = optionalUser.get();
        if (!blank(request.getName())) user.setName(request.getName().trim());
        if (!blank(request.getEmail())) user.setEmail(request.getEmail().trim().toLowerCase());
        if (!blank(request.getRole())) user.setRole(normalizeRole(request.getRole()));
        if (!blank(request.getStatus())) user.setStatus(normalizeStatus(request.getStatus()));
        if (!blank(request.getPassword())) user.setPassword(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);
        log("UPDATE_USER", "Updated user " + saved.getId());
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        log("DELETE_USER", "Deleted user " + id);
        return ResponseEntity.ok(java.util.Map.of("message", "User deleted"));
    }

    private AdminUserResponse toResponse(User u) {
        return new AdminUserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(), (u.getStatus() == null ? "ACTIVE" : u.getStatus()), u.getLastLogin(), u.getProvider());
    }
    private boolean blank(String v) { return v == null || v.isBlank(); }
    private boolean contains(String a, String b) { return a != null && a.toLowerCase().contains(b.trim().toLowerCase()); }
    private String normalizeRole(String role) {
        if (role == null) return "candidate";
        String r = role.trim().toLowerCase();
        return switch (r) { case "admin", "recruiter", "candidate" -> r; default -> "candidate"; };
    }
    private String normalizeStatus(String status) { return status == null || status.isBlank() ? "ACTIVE" : status.trim().toUpperCase(); }
    private void log(String action, String detail) {
        try {
            PlatformActionLog l = new PlatformActionLog();
            l.setActorRole("ADMIN");
            l.setActionType(action);
            l.setDetails(detail);
            l.setCreatedAt(LocalDateTime.now());
            actionLogRepository.save(l);
        } catch (Exception ignored) { }
    }
}
