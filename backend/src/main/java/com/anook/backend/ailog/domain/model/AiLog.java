package com.anook.backend.ailog.domain.model;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class AiLog {
    private Long id;
    private Long requestId;
    private String modelName;
    private String rawPrompt;
    private String rawResponse;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer latencyMs;
    private Boolean isFallback;
    private LocalDateTime createdAt;
    
    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }
}
