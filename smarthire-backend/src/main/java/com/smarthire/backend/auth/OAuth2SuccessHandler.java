package com.smarthire.backend.auth;

import com.smarthire.backend.entity.User;
import com.smarthire.backend.repository.UserRepository;
import com.smarthire.backend.security.JwtService;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final UserRepository users; private final JwtService jwt; private final PasswordEncoder encoder; private final String frontendBaseUrl;
    public OAuth2SuccessHandler(UserRepository users, JwtService jwt, PasswordEncoder encoder, @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl){this.users=users;this.jwt=jwt;this.encoder=encoder;this.frontendBaseUrl=frontendBaseUrl;}
    @Override public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication authentication) throws IOException {
        OAuth2User oauth=(OAuth2User)authentication.getPrincipal();
        String email=oauth.getAttribute("email");
        String name=oauth.getAttribute("name");
        if(email==null||email.isBlank()){res.sendRedirect(frontendBaseUrl + "/index.html?oauthError=missing_email");return;}
        User user=users.findByEmail(email.toLowerCase()).orElseGet(()->{User u=new User();u.setEmail(email.toLowerCase());u.setName(name==null?email:name);u.setPassword(encoder.encode(UUID.randomUUID().toString()));u.setRole("candidate");u.setProvider("GOOGLE");u.setStatus("ACTIVE");return users.save(u);});
        if(!"ACTIVE".equalsIgnoreCase(user.getStatus())){res.sendRedirect(frontendBaseUrl + "/index.html?oauthError=account_disabled");return;}
        user.setProvider("GOOGLE"); users.save(user);
        String token=jwt.generateToken(org.springframework.security.core.userdetails.User.withUsername(user.getEmail()).password(user.getPassword()).authorities("ROLE_"+user.getRole().toUpperCase()).build());
        String target=frontendBaseUrl+"/index.html?oauthToken="+java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8)+"&role="+java.net.URLEncoder.encode(user.getRole(), java.nio.charset.StandardCharsets.UTF_8)+"&userId="+user.getId();
        res.sendRedirect(target);
    }
}
