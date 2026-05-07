package com.anook.backend.ailog.adapter.out.persistence.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiLogJpaEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "request_id")
    private Long requestId;
    
    @Column(name = "model_name", length = 100)
    private String modelName;
    
    @Column(name = "raw_prompt", columnDefinition = "TEXT")
    private String rawPrompt;
    
    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;
    
    @Column(name = "prompt_tokens")
    private Integer promptTokens;
    
    @Column(name = "completion_tokens")
    private Integer completionTokens;
    
    @Column(name = "latency_ms")
    private Integer latencyMs;
    
    @Column(name = "is_fallback")
    private Boolean isFallback;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Builder
    public AiLogJpaEntity(Long id, Long requestId, String modelName, String rawPrompt, String rawResponse, Integer promptTokens, Integer completionTokens, Integer latencyMs, Boolean isFallback, LocalDateTime createdAt) {
        this.id = id;
        this.requestId = requestId;
        this.modelName = modelName;
        this.rawPrompt = rawPrompt;
        this.rawResponse = rawResponse;
        this.promptTokens = promptTokens;
        this.completionTokens = completionTokens;
        this.latencyMs = latencyMs;
        this.isFallback = isFallback;
        this.createdAt = createdAt;
    }
}
