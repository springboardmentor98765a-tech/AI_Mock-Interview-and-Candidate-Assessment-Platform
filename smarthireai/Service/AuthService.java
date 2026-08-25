package com.smarthireai.Service;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.smarthireai.entity.User;
import com.smarthireai.repository.UserRepository;
import com.smarthireai.security.JwtService;
import com.smarthireai.dto.AuthResponse;
import com.smarthireai.dto.LoginRequest;
import com.smarthireai.dto.SignupRequest;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AuthenticationManager authenticationManager;

    // ===========================
    // Signup
    // ===========================

    public AuthResponse signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        User user = new User();

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        userRepository.save(user);

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole()
        );
    }

    // ===========================
    // Login
    // ===========================

    public AuthResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole()
        );
    }

}