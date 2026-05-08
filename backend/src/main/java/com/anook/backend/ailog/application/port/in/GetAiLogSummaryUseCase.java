package com.anook.backend.ailog.application.port.in;

import com.anook.backend.ailog.application.dto.response.AiLogSummaryResult;

public interface GetAiLogSummaryUseCase {
    AiLogSummaryResult getSummary();
}
