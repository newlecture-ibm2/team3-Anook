package com.anook.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@lombok.extern.slf4j.Slf4j
// 클라이언트의 모든 API 요청을 중간에 가로채서 쿠키 안의 토큰을 검사하는 문지기 필터
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final com.anook.backend.staff.application.port.out.StaffRepositoryPort staffRepositoryPort;

    public JwtAuthFilter(JwtProvider jwtProvider, com.anook.backend.staff.application.port.out.StaffRepositoryPort staffRepositoryPort) {
        this.jwtProvider = jwtProvider;
        this.staffRepositoryPort = staffRepositoryPort;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractTokenFromHeader(request);

        if (token != null && jwtProvider.validateToken(token)) {
            var claims = jwtProvider.getClaims(token);
            String identifier = claims.getSubject();
            String role = claims.get("role", String.class);
            String jti = claims.getId();

            boolean isAuthorized = true;

            if ("STAFF".equals(role) || "ADMIN".equals(role)) {
                try {
                    Long staffId = Long.parseLong(identifier);
                    var staffOpt = staffRepositoryPort.findById(staffId);
                    
                    if (staffOpt.isPresent()) {
                        String dbJti = staffOpt.get().getJti();
                        // JTI 비교 (로그 추가)
                        if (jti == null || !jti.equals(dbJti)) {
                            log.warn("중복 로그인 감지: Staff={}, TokenJTI={}, DBJTI={}", identifier, jti, dbJti);
                            isAuthorized = false;
                        }
                    } else {
                        isAuthorized = false;
                    }
                } catch (Exception e) {
                    log.error("JTI 검증 중 오류 발생: {}", e.getMessage());
                    isAuthorized = false;
                }
            }

            if (isAuthorized) {
                var authority = new SimpleGrantedAuthority("ROLE_" + role);
                var authentication = new UsernamePasswordAuthenticationToken(
                        identifier, null, Collections.singletonList(authority));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromHeader(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // "Bearer " 이후의 실제 토큰 문자열만 반환
        }
        return null;
    }
}
