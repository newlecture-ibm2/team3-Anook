package com.anook.backend.ailog.adapter.out.persistence;

import com.anook.backend.ailog.adapter.out.persistence.entity.AiLogJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AiLogRepository extends JpaRepository<AiLogJpaEntity, Long> {

    @Query("SELECT AVG(a.latencyMs) FROM AiLogJpaEntity a")
    Double getAverageLatency();

    @Query("SELECT SUM(a.promptTokens + a.completionTokens) FROM AiLogJpaEntity a")
    Long getTotalTokens();

    @Query("SELECT COUNT(a) FROM AiLogJpaEntity a WHERE a.isFallback = true")
    Long getFallbackCount();

    @Query("SELECT COUNT(a) FROM AiLogJpaEntity a")
    Long getTotalCount();
}
