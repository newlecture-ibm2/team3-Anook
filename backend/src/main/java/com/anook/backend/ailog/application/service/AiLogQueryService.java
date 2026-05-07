package com.anook.backend.ailog.application.service;

import com.anook.backend.ailog.application.dto.response.AiLogDetailResult;
import com.anook.backend.ailog.application.dto.response.AiLogSummaryResult;
import com.anook.backend.ailog.application.port.in.GetAiLogListUseCase;
import com.anook.backend.ailog.application.port.in.GetAiLogSummaryUseCase;
import com.anook.backend.ailog.application.port.out.AiLogQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiLogQueryService implements GetAiLogSummaryUseCase, GetAiLogListUseCase {

    private final AiLogQueryPort aiLogQueryPort;

    @Override
    public AiLogSummaryResult getSummary() {
        Double avgLatency = aiLogQueryPort.getAverageLatency();
        Long totalTokens = aiLogQueryPort.getTotalTokens();
        Long fallbackCount = aiLogQueryPort.getFallbackCount();
        Long totalCount = aiLogQueryPort.getTotalCount();

        double fallbackRate = 0.0;
        double routingSuccessRate = 100.0;
        
        if (totalCount != null && totalCount > 0) {
            fallbackRate = (fallbackCount != null ? fallbackCount : 0) * 100.0 / totalCount;
            routingSuccessRate = 100.0 - fallbackRate;
        }

        return AiLogSummaryResult.builder()
                .averageLatencyMs(avgLatency != null ? avgLatency : 0.0)
                .totalTokens(totalTokens != null ? totalTokens : 0L)
                .fallbackRate(Math.round(fallbackRate * 10.0) / 10.0)
                .routingSuccessRate(Math.round(routingSuccessRate * 10.0) / 10.0)
                .build();
    }

    @Override
    public Page<AiLogDetailResult> getList(Pageable pageable) {
        return aiLogQueryPort.findAll(pageable)
                .map(aiLog -> AiLogDetailResult.builder()
                        .id(aiLog.getId())
                        .rawPrompt(aiLog.getRawPrompt())
                        .rawResponse(aiLog.getRawResponse())
                        .modelName(aiLog.getModelName())
                        .totalTokens((aiLog.getPromptTokens() != null ? aiLog.getPromptTokens() : 0) + 
                                     (aiLog.getCompletionTokens() != null ? aiLog.getCompletionTokens() : 0))
                        .latencyMs(aiLog.getLatencyMs())
                        .isFallback(aiLog.getIsFallback())
                        .createdAt(aiLog.getCreatedAt())
                        .build());
    }
}
