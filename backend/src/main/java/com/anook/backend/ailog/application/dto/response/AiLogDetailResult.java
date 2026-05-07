package com.anook.backend.ailog.application.dto.response;

import lombok.Builder;
import java.time.LocalDateTime;

@Builder
public record AiLogDetailResult(
    Long id,
    String rawPrompt,
    String rawResponse,
    String modelName,
    Integer totalTokens,
    Integer latencyMs,
    Boolean isFallback,
    LocalDateTime createdAt
) {}
