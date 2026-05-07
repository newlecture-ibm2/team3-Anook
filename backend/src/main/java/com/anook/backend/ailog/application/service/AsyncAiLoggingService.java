package com.anook.backend.ailog.application.service;

import com.anook.backend.ailog.application.port.out.AiLogPort;
import com.anook.backend.ailog.domain.model.AiLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 로그 비동기 저장 서비스
 * 메인 로직의 응답 속도 저하를 막기 위해 별도 스레드에서 실행됨
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncAiLoggingService {

    private final AiLogPort aiLogPort;

    @Async("aiLogExecutor")
    @Transactional
    public void saveAiLogAsync(AiLog aiLog) {
        try {
            aiLogPort.save(aiLog);
            log.info("[AsyncAiLogging] AI 로그 저장 완료 - 모델: {}, 토큰: {}/{}", 
                    aiLog.getModelName(), aiLog.getPromptTokens(), aiLog.getCompletionTokens());
        } catch (Exception e) {
            log.error("[AsyncAiLogging] AI 로그 저장 실패 (비동기): {}", e.getMessage(), e);
            // 메인 흐름에 영향을 주지 않도록 예외를 잡아서 삼킴
        }
    }
}
