package com.anook.backend.pms.application.port.in;

import java.util.Map;

/**
 * 영수증 통합 발행 UseCase
 * 
 * 특정 부서의 작업이 완료(COMPLETED)되었을 때,
 * 해당 요청 내역 중 유료 항목을 추출하여 pms_receipt를 생성합니다.
 */
public interface GenerateReceiptUseCase {
    void generate(String roomNo, String departmentId, Map<String, Object> entities);
}
