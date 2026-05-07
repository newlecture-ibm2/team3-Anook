package com.anook.backend.ailog.adapter.out.persistence;

import com.anook.backend.ailog.application.port.out.AiLogPort;
import com.anook.backend.ailog.domain.model.AiLog;
import com.anook.backend.ailog.adapter.out.persistence.entity.AiLogJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AiLogPersistenceAdapter implements AiLogPort {

    private final AiLogRepository aiLogRepository;

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
