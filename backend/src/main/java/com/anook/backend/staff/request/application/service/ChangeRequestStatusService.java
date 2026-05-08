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
    public void acceptRequest(Long requestId, Long staffId, Integer version) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        if (request.getVersion() != version) {
            throw new org.springframework.dao.OptimisticLockingFailureException("이미 다른 직원이 수락했습니다.");
        }

        // Request 도메인의 행위 메서드를 통해 상태와 담당자를 업데이트
        request.assignStaff(staffId);
        requestRepositoryPort.save(request);
        log.info("요청 수락 완료: requestId={}, staffId={}", requestId, staffId);

        // [RQ-5] WebSocket 알림 발송 (고객 & 부서)
        RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                request.getId(),
                request.getStatus().name(),
                request.getDomainCode() != null ? request.getDomainCode().name() : "UNKNOWN",
                request.getSummary(),
                request.getRoomNo()
        );
        dispatchPort.dispatchToRoom(request.getRoomNo(), payload);
        if (request.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(request.getDomainCode().name(), payload);
        }
    }

    @Override
    @Transactional
    public void completeRequest(Long requestId, Long staffId, Integer version) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        if (request.getVersion() != version) {
            throw new org.springframework.dao.OptimisticLockingFailureException("이미 다른 직원이 처리했습니다.");
        }

        request.changeStatus(RequestStatus.COMPLETED);
        requestRepositoryPort.save(request);
        log.info("요청 처리 완료: requestId={}, staffId={}", requestId, staffId);

        // [RQ-5] WebSocket 알림 발송 (고객 & 부서)
        RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                request.getId(),
                request.getStatus().name(),
                request.getDomainCode() != null ? request.getDomainCode().name() : "UNKNOWN",
                request.getSummary(),
                request.getRoomNo()
        );
        dispatchPort.dispatchToRoom(request.getRoomNo(), payload);
        if (request.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(request.getDomainCode().name(), payload);
        }
    }

    @Override
    @Transactional
    public void transferRequest(Long requestId, Long staffId, String toDepartmentId, String reason, Integer version) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        if (request.getVersion() != version) {
            throw new org.springframework.dao.OptimisticLockingFailureException("이미 상태가 변경된 요청입니다.");
        }

        String oldDepartmentId = request.getDomainCode() != null ? request.getDomainCode().name() : null;

        // DomainCode 변환
        com.anook.backend.request.domain.model.DomainCode newDomainCode = 
            com.anook.backend.request.domain.model.DomainCode.from(toDepartmentId);

        // 부서 이관
        request.transferDepartment(newDomainCode, reason);

        requestRepositoryPort.save(request);
        log.info("요청 부서 전달 완료: requestId={}, staffId={}, from={}, to={}, reason={}", 
                requestId, staffId, oldDepartmentId, toDepartmentId, reason);

        // WebSocket 알림 (고객에게 상태 변경 알림)
        RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                request.getId(),
                request.getStatus().name(),
                request.getDomainCode() != null ? request.getDomainCode().name() : "UNKNOWN",
                request.getSummary(),
                request.getRoomNo()
        );
        dispatchPort.dispatchToRoom(request.getRoomNo(), payload);
        
        // 새 부서에 알림
        if (request.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(request.getDomainCode().name(), payload);
        }
        
        // 이전 부서에도 상태 업데이트 알림 (태스크 보드에서 사라지도록)
        if (oldDepartmentId != null && !oldDepartmentId.equals(toDepartmentId)) {
            dispatchPort.dispatchToDepartment(oldDepartmentId, payload);
        }
    }

    @Override
    @Transactional
    public void approveCancellation(Long requestId, Long staffId, Integer version) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        if (request.getVersion() != version) {
            throw new org.springframework.dao.OptimisticLockingFailureException("이미 상태가 변경된 요청입니다.");
        }

        request.approveCancellation();

        requestRepositoryPort.save(request);
        log.info("요청 취소 승인 완료: requestId={}, staffId={}", requestId, staffId);

        RequestWebSocketPayload payload = RequestWebSocketPayload.cancelApproved(
                request.getId(),
                request.getDomainCode() != null ? request.getDomainCode().name() : "UNKNOWN",
                request.getSummary(),
                request.getRoomNo()
        );
        dispatchPort.dispatchToRoom(request.getRoomNo(), payload);
        if (request.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(request.getDomainCode().name(), payload);
        }
    }

    @Override
    @Transactional
    public void rejectCancellation(Long requestId, Long staffId, Integer version) {
        Request request = requestRepositoryPort.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));

        if (request.getVersion() != version) {
            throw new org.springframework.dao.OptimisticLockingFailureException("이미 상태가 변경된 요청입니다.");
        }

        request.rejectCancellation();

        requestRepositoryPort.save(request);
        log.info("요청 취소 반려 완료: requestId={}, staffId={}", requestId, staffId);

        RequestWebSocketPayload payload = RequestWebSocketPayload.cancelRejected(
                request.getId(),
                request.getDomainCode() != null ? request.getDomainCode().name() : "UNKNOWN",
                request.getSummary(),
                request.getRoomNo()
        );
        dispatchPort.dispatchToRoom(request.getRoomNo(), payload);
        if (request.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(request.getDomainCode().name(), payload);
        }
    }
}
