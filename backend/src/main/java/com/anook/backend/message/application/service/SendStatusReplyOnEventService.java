package com.anook.backend.message.application.service;

import com.anook.backend.message.application.port.out.MessageDispatchPort;
import com.anook.backend.message.application.port.out.MessageRepositoryPort;
import com.anook.backend.message.domain.model.Message;
import com.anook.backend.request.application.event.RequestStatusCheckedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Request 모듈에서 상태 확인을 마치고 보낸 이벤트를 구독하여,
 * 최종 결과를 AI 메시지로 생성하고 WebSocket을 통해 클라이언트에게 전달합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SendStatusReplyOnEventService {

    private final MessageRepositoryPort messagePort;
    private final MessageDispatchPort dispatchPort;

    @EventListener
    @Transactional
    public void onStatusChecked(RequestStatusCheckedEvent event) {
        log.info("[Message] RequestStatusCheckedEvent 수신 — room: {}", event.getRoomNo());

        // 1. Message DB에 AI 응답 저장
        Message aiMsg = Message.createAiReply(event.getRoomNo(), event.getGuestId(), event.getReplyMessage());
        aiMsg = messagePort.save(aiMsg);

        // 2. WebSocket Push → 고객 채팅 화면에 상태 확인 결과 전달
        dispatchPort.sendToRoom(event.getRoomNo(), Map.of(
                "type", "AI_RESPONSE",
                "messageId", aiMsg.getId(),
                "content", event.getReplyMessage()));
    }
}
