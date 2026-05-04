package com.anook.backend.knowledge.domain.model;

import lombok.Getter;

/**
 * 지식 도메인 부서 코드 Enum
 *
 * knowledge_entry.domain_code 컬럼과 매핑.
 * 각 모듈은 자체 DomainCode를 소유합니다 (모듈 간 의존 방지).
 */
@Getter
public enum DomainCode {

    HK("HK"),
    FB("FB"),
    FACILITY("FACILITY"),
    CONCIERGE("CONCIERGE"),
    FRONT("FRONT"),
    EMERGENCY("EMERGENCY"),
    COMMON("COMMON");

    private final String code;

    DomainCode(String code) {
        this.code = code;
    }

    public static DomainCode from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("DomainCode 값이 null이거나 비어있습니다.");
        }
        return valueOf(value.trim().toUpperCase());
    }
}
