package com.anook.backend.security;

import com.anook.backend.security.dto.request.GuestLoginRequest;
import com.anook.backend.security.dto.response.LoginResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 투숙객 인증 컨트롤러
 * 보안을 위해 방 번호가 아닌 랜덤 접속 코드(accessCode)를 사용하여 인증을 처리합니다.
 */
@RestController
@RequestMapping("/auth/guest")
public class GuestAuthController {

    private final GuestAuthService guestAuthService;

    public GuestAuthController(GuestAuthService guestAuthService) {
        this.guestAuthService = guestAuthService;
    }

    /**
     * 투숙객 로그인 API
     * QR에서 추출한 랜덤 코드를 POST 본문에 담아 전달합니다.
     */
    @PostMapping
    public ResponseEntity<LoginResponse> login(@RequestBody GuestLoginRequest request) {
        LoginResponse response = guestAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 세션 유효성 검증 API
     */
    @GetMapping("/verify")
    public ResponseEntity<Void> verify() {
        return ResponseEntity.ok().build();
    }
}
