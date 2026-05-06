package com.anook.backend.message.application.service;

import com.anook.backend.message.application.port.out.MessageDispatchPort;
import com.anook.backend.message.application.event.RequestCancelledByGuestEvent;
import com.anook.backend.message.application.event.RequestDetectedEvent;
import com.anook.backend.message.application.dto.request.SendMessageCommand;
import com.anook.backend.message.application.dto.response.SendMessageResult;
import com.anook.backend.message.application.port.in.SendMessageUseCase;
import com.anook.backend.message.application.port.out.MessageAiPort;
import com.anook.backend.message.application.port.out.MessageAiResult;
import com.anook.backend.message.application.port.out.MessageRepositoryPort;
import com.anook.backend.message.domain.model.Message;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 메시지 전송 서비스
 *
 * 흐름 (비동기):
 *   [동기] 1. 디바운스 검증 (같은 객실 1초 내 연타 방지)
 *   [동기] 2. 고객 메시지 저장 (GUEST) → 즉시 HTTP 응답 반환
 *   [비동기] 3. AI 분석 호출 (MessageAiPort)
 *   [비동기] 4. AI 응답 메시지 저장 (AI)
 *   [비동기] 5. WebSocket Push → /topic/room/{roomNo} (AI_RESPONSE)
 *   [비동기] 6. 태스크형 요청 감지 시 RequestDetectedEvent 발행
 *
 * ❌ JPA Repository 직접 import 금지 → Port(Out)만 의존
 * ❌ Request 도메인 직접 접근 금지 → 이벤트로 통신
 * ❌ SimpMessagingTemplate 직접 사용 금지 → DispatchPort로 추상화
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SendMessageService implements SendMessageUseCase {

    private final MessageRepositoryPort messagePort;
    private final MessageAiPort aiPort;
    private final MessageDispatchPort dispatchPort;
    private final ApplicationEventPublisher eventPublisher;

    /** 디바운스: 객실별 마지막 메시지 전송 시간 (roomNo → timestamp) */
    private final ConcurrentHashMap<String, Long> lastSendTimeMap = new ConcurrentHashMap<>();

    /** 디바운스 간격 (밀리초) — 같은 객실에서 1초 내 연타 방지 */
    private static final long DEBOUNCE_MS = 1000;

    @Override
    @Transactional
    public SendMessageResult send(SendMessageCommand cmd) {
        // 1. 디바운스 검증
        checkDebounce(cmd.roomNo());

        // 2. Guest 메시지 저장 → 즉시 반환
        Message guestMsg = Message.createGuestMessage(cmd.roomNo(), cmd.guestId(), cmd.content());
        guestMsg = messagePort.save(guestMsg);
        log.info("[Message] Guest 메시지 저장 완료 — id: {}, room: {}", guestMsg.getId(), cmd.roomNo());

        // 3. AI 처리는 비동기로 위임
        processAiAsync(cmd.roomNo(), cmd.guestId(), cmd.content(), cmd.guestLanguage());

        return new SendMessageResult(guestMsg.getId());
    }

    /**
     * AI 호출 + 응답 저장 + WebSocket Push + 이벤트 발행 (비동기)
     *
     * @Async → aiTaskExecutor 스레드풀에서 실행
     * ⚠️ @Async는 같은 클래스 내부 호출 시 프록시를 타지 않지만,
     *    여기서는 self-invocation이므로 별도 빈 분리 대신
     *    Spring의 프록시 우회 없이 직접 @Async를 적용합니다.
     *    (프로젝트 규모에서 충분한 구조)
     */
    @Async("aiTaskExecutor")
    @Transactional
    public void processAiAsync(String roomNo, Long guestId, String content, String language) {
        try {
            // 3. AI 호출을 위해 최근 10개 메시지 조회 (대화 맥락 확장)
            java.util.List<Message> recentMessages = new java.util.ArrayList<>(messagePort.findRecentByRoomNoAndGuestId(roomNo, guestId, 10));

            // 방금 저장한 현재 메시지는 AI가 'Current Request'로 중복 인식하지 않도록 제외
            if (!recentMessages.isEmpty() && recentMessages.get(0).getContent().equals(content)) {
                recentMessages.remove(0);
            }

            // DB에서 최신순(DESC)으로 가져왔으므로, AI가 문맥을 읽기 편하게 시간순(ASC)으로 뒤집기
            java.util.Collections.reverse(recentMessages);

            java.util.List<Map<String, String>> chatHistory = recentMessages.stream()
                    .map(m -> Map.of(
                            "role", m.getSenderType().equals(com.anook.backend.message.domain.model.SenderType.GUEST) ? "user" : "ai",
                            "content", m.getContent()
                    ))
                    .toList();

            // AI 호출
            MessageAiResult analysis = aiPort.analyze(content, roomNo, language, chatHistory);

            // 4. AI 응답 메시지 저장
            Message aiMsg = Message.createAiReply(roomNo, guestId, analysis.guestReply());
            aiMsg = messagePort.save(aiMsg);
            log.info("[Message] AI 응답 저장 완료 — id: {}, reply: {}", aiMsg.getId(), analysis.guestReply());

            // 5. WebSocket Push → 고객 채팅 화면에 AI 응답 실시간 전달
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("type", "AI_RESPONSE");
            payload.put("messageId", aiMsg.getId());
            payload.put("content", analysis.guestReply());
            
            if (analysis.clarificationOptions() != null && !analysis.clarificationOptions().isEmpty()) {
                payload.put("clarificationOptions", analysis.clarificationOptions());
            }

            dispatchPort.sendToRoom(roomNo, payload);

            // 6. 태스크형 요청 감지 시 이벤트 발행 (여기서 message 책임 끝!)
            if (analysis.domainCode() != null) {
                boolean escalated = analysis.confidence() < 0.7;

                eventPublisher.publishEvent(new RequestDetectedEvent(
                        this,
                        roomNo,
                        guestId,
                        analysis.domainCode(),
                        analysis.priority(),
                        analysis.entities(),
                        analysis.confidence(),
                        content,
                        analysis.summary(),
                        escalated
                ));
                log.info("[Message] RequestDetectedEvent 발행 — domain: {}, escalated: {}",
                        analysis.domainCode(), escalated);
            } else if ("CANCEL_REQUEST".equals(analysis.action())) {
                eventPublisher.publishEvent(new RequestCancelledByGuestEvent(this, roomNo, guestId));
                log.info("[Message] RequestCancelledByGuestEvent 발행 — room: {}", roomNo);
            }
        } catch (Exception e) {
            log.error("[Message] AI 비동기 처리 실패 — room: {}, error: {}", roomNo, e.getMessage(), e);

            // AI 실패 시에도 고객에게 안내 메시지 전달
            dispatchPort.sendToRoom(roomNo, Map.of(
                    "type", "AI_ERROR",
                    "content", "죄송합니다. 잠시 후 다시 시도해 주세요."
            ));
        }
    }

    /**
     * 디바운스 검증 — 같은 객실에서 DEBOUNCE_MS 이내 재전송 시 예외 발생
     */
    private void checkDebounce(String roomNo) {
        long now = System.currentTimeMillis();
        Long lastTime = lastSendTimeMap.get(roomNo);

        if (lastTime != null && (now - lastTime) < DEBOUNCE_MS) {
            log.warn("[Message] 디바운스 차단 — room: {}, interval: {}ms", roomNo, (now - lastTime));
            throw new com.anook.backend.global.exception.BusinessException(
                    com.anook.backend.global.exception.ErrorCode.DEBOUNCE_ERROR);
        }

        lastSendTimeMap.put(roomNo, now);
    }

    @Override
    @Transactional
    public void sendStaffMessage(com.anook.backend.message.application.dto.request.SendStaffMessageCommand command) {
        // 1. 번역 수행
        String translatedContent = aiPort.translate(command.content(), command.targetLanguage());

        // 2. 메시지 도메인 생성 및 저장
        Message staffMsg = Message.createStaffMessage(command.roomNo(), command.guestId(), command.content());
        staffMsg.setTranslation(translatedContent);
        
        staffMsg = messagePort.save(staffMsg);
        log.info("[Message] Staff 메시지 저장 완료 — id: {}, room: {}", staffMsg.getId(), command.roomNo());

        // 3. WebSocket Push (투숙객에게 번역본 전달)
        dispatchPort.sendToRoom(command.roomNo(), Map.of(
                "type", "STAFF_MESSAGE",
                "messageId", staffMsg.getId(),
                "content", translatedContent,
                "originalContent", command.content()
        ));
    }
}
