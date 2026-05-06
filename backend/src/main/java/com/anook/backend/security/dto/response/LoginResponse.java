package com.anook.backend.security.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;

/**
 * 로그인 성공 응답 DTO
 * JWT 토큰과 함께 프론트엔드 UI 표시에 필요한 정보를 포함합니다.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // ★ null인 필드는 JSON 응답에서 제외합니다.
public record LoginResponse(
    String token,      // JWT 토큰
    String role,       // 권한 (ADMIN, STAFF, GUEST)
    String name,       // 사용자 이름
    String department, // 소속 부서명 (투숙객은 null 처리하여 제외)
    String departmentId, // 부서 코드 (예: HK)
    String roomNo      // 객실 번호 (투숙객 전용)
) {
}
