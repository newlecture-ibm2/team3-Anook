package com.anook.backend.ailog.application.port.in;

import com.anook.backend.ailog.application.dto.response.AiLogDetailResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GetAiLogListUseCase {
    Page<AiLogDetailResult> getList(Pageable pageable);
}
