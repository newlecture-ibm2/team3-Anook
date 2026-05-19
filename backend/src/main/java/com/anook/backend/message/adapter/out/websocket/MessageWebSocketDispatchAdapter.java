package com.anook.backend.message.adapter.out.websocket;

import com.anook.backend.message.application.port.out.MessageDispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Message 도메인 전용 WebSocket STOMP 메시지 발송 어댑터
 *
 * MessageDispatchPort의 구현체로, SimpMessagingTemplate을 사용하여
 * 채널별로 실시간 메시지를 Push합니다.
 *
 * 위치 규칙: adapter/out/websocket/ (backend.md 룰셋 준수)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageWebSocketDispatchAdapter implements MessageDispatchPort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void sendToRoom(String roomNo, Object payload) {
        String destination = "/topic/room/" + roomNo;
        log.info("[WS-Message] → {} | payload: {}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }

    @Override
    public void sendToDept(String deptCode, Object payload) {
        String destination = "/topic/dept/" + deptCode;
        log.info("[WS-Message] → {} | payload: {}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }

    @Override
    public void sendToFrontdesk(Object payload) {
        String destination = "/topic/frontdesk";
        log.info("[WS-Message] → {} | payload: {}", destination, payload);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
