package com.anook.backend.request.application.port.in;

import com.anook.backend.request.application.dto.response.SettleRequestResult;

/**
 * 요청 정산 유스케이스 (부서 무관 — 통합 결제)
 */
public interface SettleRequestUseCase {
    SettleRequestResult settle(Long taskId);
}
