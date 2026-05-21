package com.anook.backend.ailog.application.dto.response;

import lombok.Builder;

@Builder
public record AiLogCompareResult(
    String modelName,
    Long requestCount,
    Double avgLatencyMs,
    Long totalTokens,
    Double fallbackRate
) {}
