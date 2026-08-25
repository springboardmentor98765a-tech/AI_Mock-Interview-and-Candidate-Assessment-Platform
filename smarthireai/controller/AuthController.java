package com.smarthireai.controller;

import com.smarthireai.dto.AuthResponse;
import com.smarthireai.dto.LoginRequest;
import com.smarthireai.dto.SignupRequest;
import com.smarthireai.Service.AuthService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    // =========================
    // Signup
    // =========================

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @Valid @RequestBody SignupRequest request){

        return ResponseEntity.ok(authService.signup(request));

    }

    // =========================
    // Login
    // =========================

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request){

        return ResponseEntity.ok(authService.login(request));

    }

    // =========================
    // Test
    // =========================

    @GetMapping("/test")
    public String test(){

        return "SmartHire AI Backend Running Successfully";

    }

}