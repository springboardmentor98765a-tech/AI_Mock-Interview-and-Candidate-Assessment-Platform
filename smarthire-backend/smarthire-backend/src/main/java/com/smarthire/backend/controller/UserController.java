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

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());

        User savedUser = userService.registerUser(user);

        String token = jwtService.generateToken(createUserDetails(savedUser));

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "User registered successfully",
                "token", token
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        Optional<User> userOpt = userService.loginUser(
                request.getEmail(),
                request.getPassword()
        );

        System.out.println("=================================");
        System.out.println("Email : " + request.getEmail());
        System.out.println("Password : " + request.getPassword());
        System.out.println("Login Success : " + userOpt.isPresent());
        System.out.println("=================================");

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials"));
        }

        User user = userOpt.get();

        String token = jwtService.generateToken(createUserDetails(user));

        return ResponseEntity.ok(Map.of(
                "message", "Login Successful",
                "token", token
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