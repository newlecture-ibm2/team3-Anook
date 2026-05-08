package com.anook.backend.request.domain.model;

/**
 * 요청 우선순위 Enum
 */
public enum Priority {

    NORMAL,
    URGENT;

    /**
     * 문자열 → Priority 변환 (대소문자 무시, null/빈값은 NORMAL)
     */
    public static Priority from(String value) {
        if (value == null || value.isBlank()) {
            return NORMAL;
        }
        return valueOf(value.trim().toUpperCase());
    }
}
