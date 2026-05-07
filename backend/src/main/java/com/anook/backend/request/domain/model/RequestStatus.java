package com.anook.backend.request.domain.model;

/**
 * 요청 상태 Enum
 *
 * PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → SETTLED / CANCELLED
 */
public enum RequestStatus {

    PENDING,
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    SETTLED,
    CANCELLED;

    /**
     * 문자열 → RequestStatus 변환 (대소문자 무시)
     */
    public static RequestStatus from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("RequestStatus 값이 null이거나 비어있습니다.");
        }
        return valueOf(value.trim().toUpperCase());
    }
}
