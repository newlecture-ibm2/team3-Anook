package com.anook.backend.request.application.service;

import com.anook.backend.request.application.dto.response.SettleRequestResult;
import com.anook.backend.request.application.port.in.SettleRequestUseCase;
import com.anook.backend.request.application.port.out.RequestRepositoryPort;
import com.anook.backend.request.application.port.out.RequestRepositoryPort.RequestStatusDto;
import com.anook.backend.global.exception.BusinessException;
import com.anook.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 요청 정산 서비스 (통합 — 부서 무관)
 *
 * [리팩토링 이력]
 * - 기존: FB 부서 전용 정산 (department_id가 'FB'인지 하드코딩 검사)
 * - 변경: 부서 제한 제거 → 모든 부서의 COMPLETED 요청을 SETTLED로 변경 가능.
 *   영수증(pms_receipt)은 COMPLETED 시점에 자동 발급되었으므로,
 *   정산(SETTLED)은 프론트데스크가 영수증 결제 완료 후 최종 확인하는 절차.
 *
 * 정산 가능 조건:
 * - 해당 요청이 존재해야 함
 * - status가 'COMPLETED'여야 함 (서비스 완료 후에만 정산 가능)
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SettleRequestService implements SettleRequestUseCase {

    private static final String SETTLED = "SETTLED";
    private static final String COMPLETED = "COMPLETED";

    private final RequestRepositoryPort requestRepository;

    @Override
    public SettleRequestResult settle(Long taskId) {
        // 1) 요청 존재 확인
        RequestStatusDto request = requestRepository.findStatusById(taskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REQUEST_NOT_FOUND, "taskId=" + taskId));

        // 2) COMPLETED 상태 확인
        if (!COMPLETED.equals(request.status())) {
            throw new BusinessException(ErrorCode.INVALID_SETTLEMENT,
                    "현재 상태: " + request.status());
        }

        // 3) 상태 변경 → SETTLED
        requestRepository.updateStatus(taskId, SETTLED);

        return new SettleRequestResult(taskId, SETTLED);
    }
}
