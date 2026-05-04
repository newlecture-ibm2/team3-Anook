package com.anook.backend.knowledge.adapter.out.ai;

import com.anook.backend.knowledge.application.port.out.EmbeddingPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * AI 임베딩 서비스 어댑터
 *
 * Python AI 서비스(FastAPI)에 HTTP POST 요청을 보내 텍스트 임베딩을 생성한다.
 * 엔드포인트: POST {ai-service-url}/api/v1/rag/embed
 *
 * ❌ Spring Boot에서 Gemini API 직접 호출 금지 — 반드시 Python AI 서비스 경유
 */
@Slf4j
@Component
public class EmbeddingAiAdapter implements EmbeddingPort {

    private final WebClient webClient;

    public EmbeddingAiAdapter(
            @Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl
    ) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    @Override
    @SuppressWarnings("unchecked")
    public float[] generateEmbedding(String text) {
        try {
            Map<String, Object> requestBody = Map.of("text", text);

            Map<String, Object> response = webClient.post()
                    .uri("/api/v1/rag/embed")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (response != null && response.containsKey("embedding")) {
                List<Double> embeddingList = (List<Double>) response.get("embedding");
                float[] result = new float[embeddingList.size()];
                for (int i = 0; i < embeddingList.size(); i++) {
                    result[i] = embeddingList.get(i).floatValue();
                }
                return result;
            } else {
                throw new RuntimeException("Embedding response is empty or invalid format");
            }
        } catch (Exception e) {
            log.error("Failed to generate embedding from AI service", e);
            throw new RuntimeException("Failed to generate embedding: " + e.getMessage());
        }
    }
}
