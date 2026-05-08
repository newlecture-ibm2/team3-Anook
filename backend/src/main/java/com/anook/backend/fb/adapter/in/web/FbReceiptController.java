package com.anook.backend.fb.adapter.in.web;

import com.anook.backend.fb.application.dto.response.ReceiptSummaryResult;
import com.anook.backend.fb.application.port.in.GetReceiptSummaryUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/fb/receipts")
@RequiredArgsConstructor
public class FbReceiptController {

    private final GetReceiptSummaryUseCase getReceiptSummaryUseCase;

    /**
     * 객실별 미결제 영수증 요약 조회
     * AI 에이전트가 "지금까지 얼마 썼어?" 질문에 답하기 위해 호출
     */
    @GetMapping("/room/{roomNo}/summary")
    public ResponseEntity<ReceiptSummaryResult> getReceiptSummary(@PathVariable String roomNo) {
        ReceiptSummaryResult result = getReceiptSummaryUseCase.getReceiptSummary(roomNo);
        return ResponseEntity.ok(result);
    }
}
