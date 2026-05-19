package com.anook.backend.frontdesk.request.adapter.out.websocket;

import com.anook.backend.frontdesk.request.application.port.out.FrontdeskRequestDispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * FrontdeskRequestDispatchPort 구현체 — 관리자 모듈 전용 WebSocket 전송 어댑터
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FrontdeskRequestWebSocketDispatchAdapter implements FrontdeskRequestDispatchPort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void dispatchCancelRejected(String roomNo, Long requestId, String domainCode, String summary) {
        String destination = "/topic/room/" + roomNo;
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "CANCEL_REJECTED");
        payload.put("requestId", requestId);
        payload.put("status", "IN_PROGRESS");
        payload.put("domainCode", domainCode != null ? domainCode : "UNKNOWN");
        payload.put("summary", summary != null ? summary : "");
        payload.put("roomNo", roomNo != null ? roomNo : "");
        
        send(destination, payload);
    }

    @Override
    public void dispatchStaffMessage(String roomNo, Long messageId, String content) {
        String destination = "/topic/room/" + roomNo;
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "STAFF_MESSAGE");
        payload.put("messageId", messageId != null ? messageId : System.currentTimeMillis());
        payload.put("content", content != null ? content : "");
        
        send(destination, payload);
    }
    
    @Override
    public void dispatchCancelSuccess(String roomNo, Long requestId, String domainCode, String summary) {
        String destination = "/topic/room/" + roomNo;
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "STATUS_CHANGED");
        payload.put("requestId", requestId);
        payload.put("status", "CANCELLED");
        payload.put("domainCode", domainCode != null ? domainCode : "UNKNOWN");
        payload.put("summary", summary != null ? summary : "");
        payload.put("roomNo", roomNo != null ? roomNo : "");
        
        send(destination, payload);
    }

    /**
     * WebSocket 메시지 전송 공통 로직
     */
    private void send(String destination, Map<String, Object> payload) {
        log.info("WebSocket 전송(Admin): destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
