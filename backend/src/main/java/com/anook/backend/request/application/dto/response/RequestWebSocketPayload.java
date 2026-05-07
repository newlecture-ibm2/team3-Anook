package com.anook.backend.request.application.dto.response;

/**
 * WebSocket으로 전송될 알림 페이로드
 *
 * 필드 'type'은 Message 도메인의 WebSocket 페이로드와 동일한 이름으로 통일.
 * 프론트엔드에서 같은 채널(/topic/room/{roomNo})로 들어오는
 * AI 응답(type=AI_RESPONSE)과 요청 이벤트(type=NEW_REQUEST)를 구분할 수 있다.
 */
public record RequestWebSocketPayload(
        String type,          // "NEW_REQUEST", "STATUS_CHANGED", "ESCALATED"
        Long requestId,       // 요청 ID
        String status,        // 상태 (PENDING, IN_PROGRESS, COMPLETED 등)
        String domainCode,    // 부서 코드 (HK, FB 등)
        String summary,       // 요약
        String roomNo         // 객실 번호
) {
    /**
     * 신규 요청용 정적 팩토리
     */
    public static RequestWebSocketPayload newRequest(Long id, String status, String domainCode, String summary, String roomNo) {
        return new RequestWebSocketPayload("NEW_REQUEST", id, status, domainCode, summary, roomNo);
    }

    /**
     * 상태 변경용 정적 팩토리
     */
    public static RequestWebSocketPayload statusChanged(Long id, String status, String domainCode, String summary, String roomNo) {
        return new RequestWebSocketPayload("STATUS_CHANGED", id, status, domainCode, summary, roomNo);
    }
}

