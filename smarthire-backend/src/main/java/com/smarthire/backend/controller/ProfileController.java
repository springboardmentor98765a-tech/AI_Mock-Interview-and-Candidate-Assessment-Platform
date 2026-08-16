package com.smarthire.backend.controller;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final UserRepository users;
    public ProfileController(UserRepository users) { this.users = users; }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        User u = users.findByEmail(auth.getName()).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "id", u.getId(), "name", u.getName(), "email", u.getEmail(),
                "role", u.getRole(), "provider", u.getProvider() == null ? "LOCAL" : u.getProvider(),
                "status", u.getStatus() == null ? "ACTIVE" : u.getStatus(),
                "profileImage", u.getProfileImage() == null ? "" : u.getProfileImage()
        ));
    }

    @PutMapping("/me")
    public ResponseEntity<?> update(@RequestBody Map<String, Object> body, Authentication auth) {
        User u = users.findByEmail(auth.getName()).orElseThrow();
        Object name = body.get("name");
        if (name != null && !String.valueOf(name).isBlank()) u.setName(String.valueOf(name).trim());
        // Role, provider, status, password and IDs are deliberately ignored here.
        users.save(u);
        return me(auth);
    }
}
