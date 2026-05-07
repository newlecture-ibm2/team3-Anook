package com.anook.backend.request.application.service;

import com.anook.backend.message.application.event.RequestDetectedEvent;
import com.anook.backend.request.application.dto.response.RequestWebSocketPayload;
import com.anook.backend.request.application.port.out.DispatchPort;
import com.anook.backend.request.application.port.out.RequestRepositoryPort;
import com.anook.backend.request.domain.model.DomainCode;
import com.anook.backend.request.domain.model.Request;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Message 도메인에서 발행한 RequestDetectedEvent를 수신하여 Request 생성
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CreateRequestOnEventService {

    private final RequestRepositoryPort requestRepositoryPort;
    private final DispatchPort dispatchPort;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onRequestDetected(RequestDetectedEvent event) {
        log.info("요청 이벤트 수신: roomNo={}, domainCode={}, summary={}", 
                 event.getRoomNo(), event.getDomainCode(), event.getSummary());

        // DomainCode 파싱 (실패 시 예외 발생)
        DomainCode domainCode = DomainCode.from(event.getDomainCode());

        // Request 도메인 객체 생성
        Request request = Request.create(
                event.getRoomNo(),
                event.getGuestId(),
                domainCode,
                event.getPriority(),
                event.getEntities(),
                event.getConfidence(),
                event.getRawText(),
                event.getSummary()
        );

        // 에스컬레이션 조건: confidence < 0.7 이거나 event.isEscalated() 가 true인 경우
        if (event.isEscalated() || event.getConfidence() < 0.7) {
            log.warn("에스컬레이션 발생! 확신도: {}", event.getConfidence());
            request.escalate("AI 확신도 부족: " + event.getConfidence());
        }

        // DB 저장
        Request savedRequest = requestRepositoryPort.save(request);
        log.info("Request 생성 완료: id={}", savedRequest.getId());

        // [RQ-5] WebSocket 알림 발송 (고객 & 부서)
        RequestWebSocketPayload payload = RequestWebSocketPayload.newRequest(
                savedRequest.getId(),
                savedRequest.getStatus().name(),
                savedRequest.getDomainCode() != null ? savedRequest.getDomainCode().name() : "UNKNOWN",
                savedRequest.getSummary(),
                savedRequest.getRoomNo()
        );

        dispatchPort.dispatchToRoom(savedRequest.getRoomNo(), payload);
        
        if (savedRequest.getDomainCode() != null) {
            dispatchPort.dispatchToDepartment(savedRequest.getDomainCode().name(), payload);
        }

        // 에스컬레이션(긴급) 건인 경우 관리자에게도 알림
        if (event.isEscalated() || event.getConfidence() < 0.7) {
            RequestWebSocketPayload escalationPayload = RequestWebSocketPayload.statusChanged(
                savedRequest.getId(),
                savedRequest.getStatus().name(),
                savedRequest.getDomainCode() != null ? savedRequest.getDomainCode().name() : "UNKNOWN",
                "[긴급] " + savedRequest.getSummary(),
                savedRequest.getRoomNo()
            );
            dispatchPort.dispatchToAdmin(escalationPayload);
        }
    }
}
