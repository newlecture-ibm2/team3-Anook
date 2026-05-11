package com.anook.backend.request.domain.model;

import lombok.Getter;

/**
 * 부서 도메인 코드 Enum
 *
 * AI가 분석한 domainCode → department_id(FK) 매핑에 사용.
 * department 테이블의 id 값과 1:1 대응됩니다.
 */
@Getter
public enum DomainCode {

    HK("HK"),
    FB("FB"),
    FACILITY("FACILITY"),
    CONCIERGE("CONCIERGE"),
    FRONT("FRONT"),
    EMERGENCY("EMERGENCY");

    private final String code;

    DomainCode(String code) {
        this.code = code;
    }

    /**
     * 문자열 → DomainCode 변환 (대소문자 무시)
     */
    public static DomainCode from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("DomainCode 값이 null이거나 비어있습니다.");
        }
        return valueOf(value.trim().toUpperCase());
    }

    /**
     * department 테이블의 id로 변환
     */
    public String getDeptId() {
        return this.code;
    }
}
