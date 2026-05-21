package com.anook.backend.ailog.application.port.in;

import com.anook.backend.ailog.application.dto.response.AiLogCompareResult;

import java.util.List;

public interface GetAiLogCompareUseCase {
    List<AiLogCompareResult> getCompare();
}
