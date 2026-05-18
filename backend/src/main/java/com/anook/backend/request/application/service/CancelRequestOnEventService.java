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
        log.info("[Request] RequestCancelledByGuestEvent 수신 — room: {}, guest: {}, domain: {}, targetKeyword: {}",
                event.getRoomNo(), event.getGuestId(), event.getDomainCode(), event.getTargetKeyword());

        // [Keyword Targeting] targetKeyword가 있으면 키워드 매칭으로 대상 탐색
        if (event.getTargetKeyword() != null && !event.getTargetKeyword().isBlank()) {
            Optional<Request> matched = findByKeyword(event.getRoomNo(), event.getGuestId(), event.getTargetKeyword());
            if (matched.isPresent()) {
                cancelSingleRequest(matched.get(), event.getRoomNo());
                return;
            }
            log.info("[Request] 키워드 '{}' 매칭 실패 → 최신 건 폴백", event.getTargetKeyword());
        }

        // 키워드 없거나 매칭 실패 시 기존 로직 (최신 건 취소)
        Optional<Request> latestRequest;
        if (event.getDomainCode() != null && !event.getDomainCode().isBlank()) {
            latestRequest = requestPort.findLatestCancellableByRoomNoAndGuestIdAndDomainCode(event.getRoomNo(), event.getGuestId(), event.getDomainCode());
        } else {
            latestRequest = requestPort.findLatestCancellableByRoomNoAndGuestId(event.getRoomNo(), event.getGuestId());
        }

        if (latestRequest.isPresent()) {
            cancelSingleRequest(latestRequest.get(), event.getRoomNo());
        } else {
            log.info("[Request] 취소 가능한 요청이 없습니다 — room: {}", event.getRoomNo());
        }
    }

    /**
     * [Keyword Targeting] summary에 키워드가 포함된 취소 가능 요청을 찾는다.
     * 여러 건이 매칭되면 가장 최근 것을 반환한다.
     */
    private Optional<Request> findByKeyword(String roomNo, Long guestId, String keyword) {
        java.util.List<Request> cancellable = requestPort.findAllCancellableByRoomNoAndGuestId(roomNo, guestId);
        String lowerKeyword = keyword.toLowerCase();
        
        java.util.List<String> searchKeywords = new java.util.ArrayList<>();
        searchKeywords.add(lowerKeyword);
        
        // 동의어(유의어) 확장 처리
        if (lowerKeyword.contains("물") || lowerKeyword.contains("생수") || lowerKeyword.contains("워터")) {
            searchKeywords.add("물");
            searchKeywords.add("생수");
            searchKeywords.add("워터");
        }
        if (lowerKeyword.contains("수건") || lowerKeyword.contains("타월") || lowerKeyword.contains("타올")) {
            searchKeywords.add("수건");
            searchKeywords.add("타월");
            searchKeywords.add("타올");
        }
        if (lowerKeyword.contains("콜라") || lowerKeyword.contains("코카콜라") || lowerKeyword.contains("음료")) {
            searchKeywords.add("콜라");
            searchKeywords.add("음료");
        }
        
        return cancellable.stream()
                .filter(r -> {
                    if (r.getSummary() == null) return false;
                    String summary = r.getSummary().toLowerCase();
                    return searchKeywords.stream().anyMatch(summary::contains);
                })
                .findFirst(); // findAllCancellableByRoomNoAndGuestId는 최신순 정렬
    }

    private void cancelSingleRequest(Request request, String roomNo) {
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
                dispatchPort.dispatchToRoom(roomNo, payload);

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
                dispatchPort.dispatchToRoom(roomNo, payload);

                if (request.getDepartmentId() != null) {
                    dispatchPort.dispatchToDepartment(request.getDepartmentId(), payload);
                }
            }

        } catch (IllegalStateException e) {
            log.warn("[Request] 취소 불가능한 상태이거나 도메인 규칙 위반 — id: {}, reason: {}", request.getId(), e.getMessage());
        }
    }

    @EventListener
    @Transactional
    public void onGuestCancelAll(com.anook.backend.message.application.event.AllRequestsCancelledByGuestEvent event) {
        log.info("[Request] AllRequestsCancelledByGuestEvent 수신 — room: {}, guest: {}", event.getRoomNo(), event.getGuestId());

        java.util.List<Request> allPending = requestPort.findAllCancellableByRoomNoAndGuestId(event.getRoomNo(), event.getGuestId());
        if (allPending.isEmpty()) {
            log.info("[Request] 취소 가능한 전체 요청이 없습니다 — room: {}", event.getRoomNo());
            return;
        }
        
        for (Request request : allPending) {
            cancelSingleRequest(request, event.getRoomNo());
        }
    }
}
