package com.smarthireai.Security;

import com.smarthireai.entity.User;
import com.smarthireai.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;

    private final com.smarthireai.security.JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication)
            throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        Optional<User> existingUser = userRepository.findByEmail(email);

        User user;

        if (existingUser.isPresent()) {

            user = existingUser.get();

        } else {

            user = new User();

            user.setName(name);
            user.setEmail(email);

            // Random password because Google users don't use password login
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
            user.setPassword(encoder.encode(UUID.randomUUID().toString()));

            user.setRole("ROLE_CANDIDATE");

            user = userRepository.save(user);
        }

        String token = jwtService.generateToken(user);

        response.sendRedirect("http://localhost:5500/candidate.html?token=" + token);
    }

}
