package com.anook.backend.ailog.application.port.out;

import com.anook.backend.ailog.domain.model.AiLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AiLogQueryPort {
    Double getAverageLatency();
    Long getTotalTokens();
    Long getFallbackCount();
    Long getTotalCount();
    Page<AiLog> findAll(Pageable pageable);
}
