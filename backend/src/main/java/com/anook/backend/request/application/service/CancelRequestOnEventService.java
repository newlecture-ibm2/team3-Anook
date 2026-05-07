package com.anook.backend.request.application.service;

import com.anook.backend.message.application.event.RequestCancelledByGuestEvent;
import com.anook.backend.request.application.dto.response.RequestWebSocketPayload;
import com.anook.backend.request.application.port.out.DispatchPort;
import com.anook.backend.request.application.port.out.RequestRepositoryPort;
import com.anook.backend.request.domain.model.Request;
import com.anook.backend.request.domain.model.RequestStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Message 모듈에서 발생한 '요청 취소' 이벤트를 구독하여 처리하는 서비스.
 *
 * 고객이 AI 챗봇을 통해 취소 의사를 밝히면(MessageAiResult action="CANCEL_REQUEST"),
 * 이 서비스가 가장 최근 취소 가능한 요청을 찾아 취소(CANCELLED) 처리하고 UI에 알림을 보냅니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CancelRequestOnEventService {

    private final RequestRepositoryPort requestPort;
    private final DispatchPort dispatchPort;

    @EventListener
    @Transactional
    public void onGuestCancel(RequestCancelledByGuestEvent event) {
        log.info("[Request] RequestCancelledByGuestEvent 수신 — room: {}, guest: {}", event.getRoomNo(), event.getGuestId());

        Optional<Request> latestRequest = requestPort.findLatestCancellableByRoomNoAndGuestId(event.getRoomNo(), event.getGuestId());

        if (latestRequest.isPresent()) {
            Request request = latestRequest.get();
            try {
                if (request.getStatus() == RequestStatus.PENDING) {
                    request.changeStatus(RequestStatus.CANCELLED);
                    requestPort.save(request);

                    log.info("[Request] 최근 요청 취소 완료 — id: {}, newStatus: {}", request.getId(), request.getStatus());

                    // 웹소켓 발송: 프론트엔드 UI(게이지바) 업데이트용
                    RequestWebSocketPayload payload = RequestWebSocketPayload.statusChanged(
                            request.getId(), request.getStatus().name(),
                            request.getDomainCode() != null ? request.getDomainCode().name() : null,
                            request.getSummary(), request.getRoomNo()
                    );
                    dispatchPort.dispatchToRoom(event.getRoomNo(), payload);

                    // 관리자 대시보드 쪽에도 취소되었다는 알림 전송 (필요 시)
                    if (request.getDepartmentId() != null) {
                        dispatchPort.dispatchToDepartment(request.getDepartmentId(), payload);
                    }
                } else if (request.getStatus() == RequestStatus.IN_PROGRESS) {
                    request.requestCancellation();
                    requestPort.save(request);

                    log.info("[Request] 최근 요청 취소 승인 대기 처리 완료 — id: {}", request.getId());

                    RequestWebSocketPayload payload = RequestWebSocketPayload.cancelRequestReceived(
                            request.getId(),
                            request.getDomainCode() != null ? request.getDomainCode().name() : null,
                            request.getSummary(), request.getRoomNo()
                    );
                    dispatchPort.dispatchToRoom(event.getRoomNo(), payload);

                    if (request.getDepartmentId() != null) {
                        dispatchPort.dispatchToDepartment(request.getDepartmentId(), payload);
                    }
                }

            } catch (IllegalStateException e) {
                log.warn("[Request] 취소 불가능한 상태이거나 도메인 규칙 위반 — id: {}, reason: {}", request.getId(), e.getMessage());
            }
        } else {
            log.info("[Request] 취소 가능한 요청이 없습니다 — room: {}", event.getRoomNo());
        }
    }
}
