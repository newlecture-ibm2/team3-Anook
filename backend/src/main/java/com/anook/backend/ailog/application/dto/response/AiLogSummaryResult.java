package com.anook.backend.ailog.application.dto.response;

import lombok.Builder;

@Builder
public record AiLogSummaryResult(
    Double averageLatencyMs,
    Long totalTokens,
    Double routingSuccessRate,
    Double fallbackRate
) {}
