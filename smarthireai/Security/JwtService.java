package com.smarthireai.security;

import com.smarthireai.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String SECRET_KEY;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // Generate JWT Token
    public String generateToken(User user) {

        Map<String, Object> claims = new HashMap<>();

        claims.put("role", user.getRole());
        claims.put("name", user.getName());

        return createToken(claims, user.getEmail());
    }

    private String createToken(Map<String, Object> claims, String email) {

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();

    }

    // Extract Email
    public String extractUsername(String token) {

        return extractClaim(token, Claims::getSubject);

    }

    // Extract Expiration Date
    public Date extractExpiration(String token) {

        return extractClaim(token, Claims::getExpiration);

    }

    // Generic Claim Extractor
    public <T> T extractClaim(String token,
                              Function<Claims, T> claimsResolver) {

        final Claims claims = extractAllClaims(token);

        return claimsResolver.apply(claims);

    }

    // Validate Token
    public boolean isTokenValid(String token, String email) {

        final String username = extractUsername(token);

        return username.equals(email) && !isTokenExpired(token);

    }

    // Check Expiration
    private boolean isTokenExpired(String token) {

        return extractExpiration(token).before(new Date());

    }

    // Parse Claims
    private Claims extractAllClaims(String token) {

        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

    }

    // Secret Key
    private Key getSigningKey() {

        byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);

        return Keys.hmacShaKeyFor(keyBytes);

    }

}