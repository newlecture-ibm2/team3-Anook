package com.anook.backend.security;

import com.anook.backend.security.dto.request.GuestLoginRequest;
import com.anook.backend.security.dto.response.LoginResponse;
import com.anook.backend.guest.application.port.out.GuestRepositoryPort;
import com.anook.backend.guest.domain.model.Guest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 투숙객 인증 서비스 (랜덤 코드 보안 강화 버전)
 */
@Service
@Transactional(readOnly = true)
public class GuestAuthService {

    private final GuestRepositoryPort guestRepositoryPort;
    private final JwtProvider jwtProvider;

    public GuestAuthService(GuestRepositoryPort guestRepositoryPort, JwtProvider jwtProvider) {
        this.guestRepositoryPort = guestRepositoryPort;
        this.jwtProvider = jwtProvider;
    }

    /**
     * 랜덤 코드를 기반으로 투숙객을 인증하고 토큰을 생성합니다.
     */
    public LoginResponse login(GuestLoginRequest request) {
        // 1. 전달받은 랜덤 코드로 현재 투숙 중인 고객이 있는지 조회
        Guest guest = guestRepositoryPort.findByAccessCode(request.accessCode())
                .orElseThrow(() -> new com.anook.backend.global.exception.BusinessException(
                        com.anook.backend.global.exception.ErrorCode.GUEST_NOT_FOUND));

        // 2. 토큰 생성 (Subject: guestId, Claims: Role, roomNo)
        String token = jwtProvider.generateToken(
                guest.getId().toString(),
                "GUEST",
                null,
                java.util.Map.of("roomNo", guest.getRoomNumber()));

        // 3. 최종 응답 생성 (투숙객에게 의미 없는 department는 null 처리하여 응답에서 제외)
        return new LoginResponse(
                token,
                "GUEST",
                guest.getName(),
                null, // departmentName
                null, // departmentId
                guest.getRoomNumber() // ★ 프론트엔드 리다이렉트용 객실 번호 추가
        );
    }
}
