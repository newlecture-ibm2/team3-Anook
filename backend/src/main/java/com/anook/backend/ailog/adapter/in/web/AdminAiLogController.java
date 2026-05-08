package com.anook.backend.ailog.adapter.in.web;

import com.anook.backend.ailog.application.dto.response.AiLogDetailResult;
import com.anook.backend.ailog.application.dto.response.AiLogSummaryResult;
import com.anook.backend.ailog.application.port.in.GetAiLogListUseCase;
import com.anook.backend.ailog.application.port.in.GetAiLogSummaryUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/ai-logs")
@RequiredArgsConstructor
public class AdminAiLogController {

    private final GetAiLogSummaryUseCase getAiLogSummaryUseCase;
    private final GetAiLogListUseCase getAiLogListUseCase;

    @GetMapping("/summary")
    public ResponseEntity<AiLogSummaryResult> getSummary() {
        return ResponseEntity.ok(getAiLogSummaryUseCase.getSummary());
    }

    @GetMapping
    public ResponseEntity<Page<AiLogDetailResult>> getList(
            @PageableDefault(sort = "createdAt", direction = Sort.Direction.DESC, size = 10) Pageable pageable) {
        return ResponseEntity.ok(getAiLogListUseCase.getList(pageable));
    }
}
