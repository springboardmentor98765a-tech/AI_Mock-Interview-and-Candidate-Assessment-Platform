package com.smarthire.backend.admin.dto;

import java.time.LocalDateTime;

public record AdminUserResponse(Long id, String name, String email, String role, String status, LocalDateTime lastLogin, String provider) {}
