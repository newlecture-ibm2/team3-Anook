package com.anook.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket STOMP 브로커 설정
 *
 * 채널 규칙:
 *   - /topic/room/{roomNo}    → 객실 단위 격리 (Guest 구독)
 *   - /topic/dept/{deptCode}  → 부서 단위 격리 (Staff 구독)
 *   - /topic/frontdesk        → 프론트 데스크 전용 (Frontdesk 구독)
 *
 * 연결 엔드포인트:
 *   - /ws  (Nginx가 /ws/** → app:8080 으로 프록시)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 서버 → 클라이언트 구독 채널 prefix
        registry.enableSimpleBroker("/topic");
        // 클라이언트 → 서버 메시지 prefix (향후 확장용)
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");  // 개발 단계: 모든 origin 허용
    }
}
