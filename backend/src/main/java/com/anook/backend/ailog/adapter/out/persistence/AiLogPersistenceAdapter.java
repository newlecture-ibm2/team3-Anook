package com.anook.backend.ailog.adapter.out.persistence;

import com.anook.backend.ailog.application.port.out.AiLogPort;
import com.anook.backend.ailog.domain.model.AiLog;
import com.anook.backend.ailog.adapter.out.persistence.entity.AiLogJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import com.anook.backend.ailog.application.port.out.AiLogQueryPort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Component
@RequiredArgsConstructor
public class AiLogPersistenceAdapter implements AiLogPort, AiLogQueryPort {

    private final AiLogRepository aiLogRepository;

    @Override
    public Double getAverageLatency() {
        return aiLogRepository.getAverageLatency();
    }

    @Override
    public Long getTotalTokens() {
        return aiLogRepository.getTotalTokens();
    }

    @Override
    public Long getFallbackCount() {
        return aiLogRepository.getFallbackCount();
    }

    @Override
    public Long getTotalCount() {
        return aiLogRepository.getTotalCount();
    }

    @Override
    public Page<AiLog> findAll(Pageable pageable) {
        return aiLogRepository.findAll(pageable)
                .map(entity -> AiLog.builder()
                        .id(entity.getId())
                        .requestId(entity.getRequestId())
                        .modelName(entity.getModelName())
                        .rawPrompt(entity.getRawPrompt())
                        .rawResponse(entity.getRawResponse())
                        .promptTokens(entity.getPromptTokens())
                        .completionTokens(entity.getCompletionTokens())
                        .latencyMs(entity.getLatencyMs())
                        .isFallback(entity.getIsFallback())
                        .createdAt(entity.getCreatedAt())
                        .build());
    }

    @Override
    public AiLog save(AiLog aiLog) {
        AiLogJpaEntity entity = AiLogJpaEntity.builder()
                .id(aiLog.getId())
                .requestId(aiLog.getRequestId())
                .modelName(aiLog.getModelName())
                .rawPrompt(aiLog.getRawPrompt())
                .rawResponse(aiLog.getRawResponse())
                .promptTokens(aiLog.getPromptTokens())
                .completionTokens(aiLog.getCompletionTokens())
                .latencyMs(aiLog.getLatencyMs())
                .isFallback(aiLog.getIsFallback())
                .createdAt(aiLog.getCreatedAt())
                .build();
                
        AiLogJpaEntity savedEntity = aiLogRepository.save(entity);
        
        return AiLog.builder()
                .id(savedEntity.getId())
                .requestId(savedEntity.getRequestId())
                .modelName(savedEntity.getModelName())
                .rawPrompt(savedEntity.getRawPrompt())
                .rawResponse(savedEntity.getRawResponse())
                .promptTokens(savedEntity.getPromptTokens())
                .completionTokens(savedEntity.getCompletionTokens())
                .latencyMs(savedEntity.getLatencyMs())
                .isFallback(savedEntity.getIsFallback())
                .createdAt(savedEntity.getCreatedAt())
                .build();
    }
}
