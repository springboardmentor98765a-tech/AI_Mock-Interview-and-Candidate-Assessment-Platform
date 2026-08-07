package com.smarthire.backend.controller;

import com.smarthire.backend.dto.LoginRequest;
import com.smarthire.backend.dto.RegisterRequest;
import com.smarthire.backend.entity.User;
import com.smarthire.backend.security.JwtService;
import com.smarthire.backend.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class UserController {

    private final UserService userService;
    private final JwtService jwtService;

    public UserController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        if (request.getName() == null || request.getName().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Name is required"));
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email is required"));
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Password must be at least 6 characters"));
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());

        User savedUser = userService.registerUser(user);

        String token = jwtService.generateToken(createUserDetails(savedUser));

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "User registered successfully",
                "token", token,
                "role", savedUser.getRole() == null ? "candidate" : savedUser.getRole(),
                "name", savedUser.getName(),
                "email", savedUser.getEmail(),
                "userId", savedUser.getId()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Optional<User> userOpt = userService.loginUser(
                request.getEmail(),
                request.getPassword()
        );

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }

        User user = userOpt.get();

        String token = jwtService.generateToken(createUserDetails(user));

        return ResponseEntity.ok(Map.of(
                "message", "Login Successful",
                "token", token,
                "role", user.getRole() == null ? "candidate" : user.getRole(),
                "name", user.getName(),
                "email", user.getEmail(),
                "userId", user.getId()
        ));
    }

    private UserDetails createUserDetails(User user) {

        String role = (user.getRole() == null || user.getRole().isBlank())
                ? "USER"
                : user.getRole().toUpperCase();

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_" + role)
                .build();
    }
}