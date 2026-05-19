package com.anook.backend.request.adapter.out.websocket;

import com.anook.backend.request.application.dto.response.RequestWebSocketPayload;
import com.anook.backend.request.application.port.out.DispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * DispatchPort 구현체 — WebSocket(STOMP) 메시지 전송 어댑터
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RequestWebSocketDispatchAdapter implements DispatchPort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void dispatchToRoom(String roomNo, RequestWebSocketPayload payload) {
        String destination = "/topic/room/" + roomNo;
        log.info("WebSocket 전송: destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }

    @Override
    public void dispatchToDepartment(String deptCode, RequestWebSocketPayload payload) {
        String destination = "/topic/dept/" + deptCode;
        log.info("WebSocket 전송: destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }

    @Override
    public void dispatchToFrontdesk(RequestWebSocketPayload payload) {
        String destination = "/topic/frontdesk";
        log.info("WebSocket 전송: destination={}, payload={}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
