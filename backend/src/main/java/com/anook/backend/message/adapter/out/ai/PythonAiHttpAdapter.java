package com.anook.backend.message.adapter.out.ai;

import com.anook.backend.message.application.port.out.MessageAiPort;
import com.anook.backend.message.application.port.out.MessageAiResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

/**
 * Python AI 서버 연동 어댑터
 *
 * AI 서버(FastAPI)에 HTTP POST 요청을 보내 고객 메시지를 분석한다.
 * 엔드포인트: POST {ai-service-url}/analyze
 *
 * @Primary → MockAiAdapter보다 우선 주입됨.
 * @ConditionalOnProperty → ai.service.enabled=true 일 때만 활성화.
 *                          AI 서버 미완성 시 이 빈은 생성되지 않으므로 MockAiAdapter가 사용됨.
 *
 * ❌ Spring Boot에서 Gemini API 직접 호출 금지 — 반드시 Python AI 서비스 경유
 */
@Slf4j
@Primary
@Component
@ConditionalOnProperty(name = "ai.service.enabled", havingValue = "true", matchIfMissing = false)
public class PythonAiHttpAdapter implements MessageAiPort {

    private final WebClient webClient;

    public PythonAiHttpAdapter(
            @Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl
    ) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    @Override
    public MessageAiResult analyze(String text, String roomNo, String language, java.util.List<java.util.Map<String, String>> chatHistory) {
        log.info("[PythonAI] 분석 요청 — room: {}, lang: {}, text: {}", roomNo, language, text);

        try {
            Map<String, Object> response = webClient.post()
                    .uri("/analyze")
                    .bodyValue(Map.of(
                            "text", text,
                            "room_no", roomNo,
                            "language", language,
                            "chat_history", chatHistory
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response == null) {
                log.warn("[PythonAI] 응답이 null — 폴백 응답 반환");
                return fallbackResult();
            }

            String guestReply = (String) response.getOrDefault("guest_reply", "죄송합니다. 잠시 후 다시 시도해 주세요.");
            String summary = (String) response.get("summary");
            String domainCode = (String) response.get("domain_code");
            String priority = (String) response.getOrDefault("priority", "NORMAL");

            @SuppressWarnings("unchecked")
            Map<String, Object> entities = response.containsKey("entities")
                    ? (Map<String, Object>) response.get("entities")
                    : Collections.emptyMap();

            double confidence = response.containsKey("confidence")
                    ? ((Number) response.get("confidence")).doubleValue()
                    : 0.0;

            log.info("[PythonAI] 분석 완료 — domain: {}, confidence: {}",
                    domainCode, confidence);

            return new MessageAiResult(guestReply, summary, domainCode, priority, entities, confidence);

        } catch (WebClientResponseException e) {
            log.error("[PythonAI] HTTP 에러 — status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return fallbackResult();
        } catch (Exception e) {
            log.error("[PythonAI] 연결 실패 — {}", e.getMessage());
            return fallbackResult();
        }
    }

    /**
     * AI 서버 장애 시 폴백 응답
     * 고객에게는 안내 메시지를 반환하고, domainCode=null로 이벤트를 발행하지 않는다.
     */
    private MessageAiResult fallbackResult() {
        return new MessageAiResult(
                "죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다. 프론트 데스크(내선 0번)로 연락 부탁드립니다.",
                null, null, null, Collections.emptyMap(), 0.0
        );
    }

    @Override
    public String translate(String text, String targetLanguage) {
        log.info("[PythonAI] 번역 요청 — text: {}, targetLang: {}", text, targetLanguage);

        try {
            Map<String, Object> response = webClient.post()
                    .uri("/translate")
                    .bodyValue(Map.of(
                            "text", text,
                            "target_language", targetLanguage
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(15))
                    .block();

            if (response != null && response.containsKey("translated_text")) {
                return (String) response.get("translated_text");
            }
            
            log.warn("[PythonAI] 번역 응답이 유효하지 않음 — 원문 반환");
            return text;

        } catch (WebClientResponseException e) {
            log.error("[PythonAI] HTTP 에러 (번역) — status: {}, body: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return text;
        } catch (Exception e) {
            log.error("[PythonAI] 연결 실패 (번역) — {}", e.getMessage());
            return text;
        }
    }
}
