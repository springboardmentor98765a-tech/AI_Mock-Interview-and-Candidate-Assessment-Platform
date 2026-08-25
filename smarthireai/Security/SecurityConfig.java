package com.smarthireai.Security;

import com.smarthireai.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;


    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {

        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http

                // Disable CSRF
                .csrf(csrf -> csrf.disable())

                // Enable CORS
                .cors(cors -> {})

                // No Session
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.IF_REQUIRED))

                // Authorization Rules
                .authorizeHttpRequests(auth -> auth

                        // Public APIs
                        .requestMatchers(
                                "/api/auth/**",
                                "/login/**",
                                "/oauth2/**"
                        ).permitAll()
                        .requestMatchers("/api/resume/**")
                        .hasRole("CANDIDATE")
                        // Candidate
                        .requestMatchers("/api/candidate/**")
                        .hasRole("CANDIDATE")
                        .requestMatchers("/api/interview/**")
                        .hasRole("CANDIDATE")
                        // Recruiter
                        .requestMatchers("/api/recruiter/**")
                        .hasRole("RECRUITER")

                        // Admin
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // Everything else
                        .anyRequest()
                        .authenticated()

                )
                .oauth2Login(oauth -> oauth
                        .successHandler(oAuth2SuccessHandler)
                )
                // JWT Filter
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();

    }

}