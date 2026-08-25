package com.smarthireai.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    private User user;
    // Full Name
    @Column(nullable = false)
    private String name;

    // Email
    @Column(nullable = false, unique = true)
    private String email;

    // Encrypted Password
    @Column(nullable = false)
    private String password;

    // Role
    @Column(nullable = false)
    private String role;

    // Authentication Provider
    @Column(nullable = false)
    private String provider = "LOCAL";

    // Google / LinkedIn User ID
    private String providerId;

}