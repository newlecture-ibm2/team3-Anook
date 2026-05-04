package com.anook.backend.staff.request.application.service;

import com.anook.backend.request.application.dto.response.RequestWebSocketPayload;
import com.anook.backend.staff.request.application.port.in.ChangeRequestStatusUseCase;
import com.anook.backend.request.application.port.out.DispatchPort;
import com.anook.backend.request.application.port.out.RequestRepositoryPort;
import com.anook.backend.request.domain.model.Request;
import com.anook.backend.request.domain.model.RequestStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChangeRequestStatusService implements ChangeRequestStatusUseCase {

    private final RequestRepositoryPort requestRepositoryPort;
    private final DispatchPort dispatchPort;

    @Override
    @Transactional
    public void acceptRequest(Long requestId, Long staffId) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        // Request 도메인을 직접 수정하지 않고, 상태(IN_PROGRESS)와 담당자(staffId)가 업데이트된 새로운 객체로 재구성
        Request updatedRequest = Request.reconstitute(
                request.getId(),
                RequestStatus.IN_PROGRESS,
                request.getPriority(),
                request.getDomainCode(),
                request.getEntities(),
                request.getConfidence(),
                request.getRawText(),
                request.getSummary(),
                request.getRoomNo(),
                request.getGuestId(),
                staffId,
                request.getVersion(),
                request.getCreatedAt(),
                LocalDateTime.now()
        );

        requestRepositoryPort.save(updatedRequest);
        log.info("요청 수락 완료: requestId={}, staffId={}", requestId, staffId);

        // [RQ-5] WebSocket 알림 발송 (고객 & 부서)
        RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                updatedRequest.getId(),
                updatedRequest.getStatus().name(),
                updatedRequest.getDomainCode() != null ? updatedRequest.getDomainCode().name() : "UNKNOWN",
                updatedRequest.getSummary(),
                updatedRequest.getRoomNo()
        );
        dispatchPort.dispatchToRoom(updatedRequest.getRoomNo(), payload);
        if (updatedRequest.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(updatedRequest.getDomainCode().name(), payload);
        }
    }

    @Override
    @Transactional
    public void completeRequest(Long requestId, Long staffId) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        // Request 도메인을 직접 수정하지 않고, 상태(COMPLETED)가 업데이트된 새로운 객체로 재구성
        Request updatedRequest = Request.reconstitute(
                request.getId(),
                RequestStatus.COMPLETED,
                request.getPriority(),
                request.getDomainCode(),
                request.getEntities(),
                request.getConfidence(),
                request.getRawText(),
                request.getSummary(),
                request.getRoomNo(),
                request.getGuestId(),
                request.getAssignedStaffId(),
                request.getVersion(),
                request.getCreatedAt(),
                LocalDateTime.now()
        );

        requestRepositoryPort.save(updatedRequest);
        log.info("요청 처리 완료: requestId={}, staffId={}", requestId, staffId);

        // [RQ-5] WebSocket 알림 발송 (고객 & 부서)
        RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                updatedRequest.getId(),
                updatedRequest.getStatus().name(),
                updatedRequest.getDomainCode() != null ? updatedRequest.getDomainCode().name() : "UNKNOWN",
                updatedRequest.getSummary(),
                updatedRequest.getRoomNo()
        );
        dispatchPort.dispatchToRoom(updatedRequest.getRoomNo(), payload);
        if (updatedRequest.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(updatedRequest.getDomainCode().name(), payload);
        }
    }
}
