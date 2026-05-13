package com.anook.backend.room.adapter.out.websocket;

import com.anook.backend.room.application.port.out.RoomDispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * RoomDispatchPort 구현체 — WebSocket(STOMP) 세션 만료 알림 전송
 *
 * 체크아웃 시 해당 객실 브라우저에 SESSION_EXPIRED 이벤트를 전송하여
 * 게스트의 QR 인증 세션을 실시간으로 무효화합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RoomWebSocketDispatchAdapter implements RoomDispatchPort {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void dispatchSessionExpired(String roomNo) {
        String destination = "/topic/room/" + roomNo;
        Map<String, String> payload = Map.of("type", "SESSION_EXPIRED");
        log.info("WebSocket 전송: destination={}, type=SESSION_EXPIRED", destination);
        messagingTemplate.convertAndSend(destination, payload);
    }
}
