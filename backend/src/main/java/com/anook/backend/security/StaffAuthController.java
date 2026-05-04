package com.anook.backend.security;

import com.anook.backend.security.dto.request.StaffLoginRequest;
import com.anook.backend.security.dto.response.LoginResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 직원/관리자 인증 컨트롤러
 * (BFF 프록시 패턴에 따라 /api 접두어를 사용하지 않습니다.)
 */
@RestController
@RequestMapping("/auth/staff")
public class StaffAuthController {

    private final StaffAuthService staffAuthService;

    public StaffAuthController(StaffAuthService staffAuthService) {
        this.staffAuthService = staffAuthService;
    }

    /**
     * 직원 로그인 API
     * 성공 시 토큰과 유저 정보를 JSON으로 반환합니다.
     */
    @PostMapping
    public ResponseEntity<LoginResponse> login(@RequestBody StaffLoginRequest request) {
        LoginResponse response = staffAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 세션 유효성 검증 API
     * JwtAuthFilter에서 중복 로그인 및 토큰 유효성을 이미 검사하므로, 
     * 여기까지 도달하면 유효한 세션으로 간주합니다.
     */
    @GetMapping("/verify")
    public ResponseEntity<Void> verify() {
        return ResponseEntity.ok().build();
    }
}
