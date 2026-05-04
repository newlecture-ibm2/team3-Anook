package com.anook.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
// JWT 토큰을 만들고, 들어온 토큰의 위조/만료 여부를 검사하는 도구 클래스
public class JwtProvider {

    private final SecretKey key;
    private final long expirationTime;

    public JwtProvider(
            @Value("${jwt.secret}") String secretString,
            @Value("${jwt.expiration-time}") long expirationTime) {
        this.key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
        this.expirationTime = expirationTime;
    }

    // 기존 호환성을 위해 JTI 없이 토큰을 생성하는 메서드 (GUEST 등에서 사용)
    public String generateToken(String identifier, String role) {
        return generateToken(identifier, role, null);
    }

    // 유저의 고유 정보(식별자), 권한(Role), 그리고 세션 식별자(JTI)를 담아 새로운 토큰을 발급합니다.
    public String generateToken(String identifier, String role, String jti) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(identifier)
                .id(jti) // JWT ID (JTI) 추가
                .claim("role", role)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationTime))
                .signWith(key)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
