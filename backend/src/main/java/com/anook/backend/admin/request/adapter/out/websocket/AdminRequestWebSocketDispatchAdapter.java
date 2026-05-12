package com.anook.backend.admin.request.adapter.out.websocket;

import com.anook.backend.admin.request.application.port.out.AdminRequestDispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminRequestWebSocketDispatchAdapter implements AdminRequestDispatchPort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void dispatchCancelRejected(String roomNo, Long requestId, String domainCode, String summary) {
        String destination = "/topic/room/" + roomNo;
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", "CANCEL_REJECTED");
        payload.put("requestId", requestId);
        payload.put("status", "IN_PROGRESS");
        payload.put("domainCode", domainCode != null ? domainCode : "UNKNOWN");
        payload.put("summary", summary != null ? summary : "");
        payload.put("roomNo", roomNo != null ? roomNo : "");
        
        log.info("WebSocket 전송(Admin): destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }

    @Override
    public void dispatchStaffMessage(String roomNo, Long messageId, String content) {
        String destination = "/topic/room/" + roomNo;
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", "STAFF_MESSAGE");
        payload.put("messageId", messageId != null ? messageId : System.currentTimeMillis());
        payload.put("content", content != null ? content : "");
        
        log.info("WebSocket 전송(Admin): destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }
    
    @Override
    public void dispatchCancelSuccess(String roomNo, Long requestId, String domainCode, String summary) {
        String destination = "/topic/room/" + roomNo;
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("type", "STATUS_CHANGED");
        payload.put("requestId", requestId);
        payload.put("status", "CANCELLED");
        payload.put("domainCode", domainCode != null ? domainCode : "UNKNOWN");
        payload.put("summary", summary != null ? summary : "");
        payload.put("roomNo", roomNo != null ? roomNo : "");
        
        log.info("WebSocket 전송(Admin): destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
