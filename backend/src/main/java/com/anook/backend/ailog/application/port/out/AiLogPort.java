package com.anook.backend.ailog.application.port.out;

import com.anook.backend.ailog.domain.model.AiLog;

public interface AiLogPort {
    AiLog save(AiLog aiLog);
}
