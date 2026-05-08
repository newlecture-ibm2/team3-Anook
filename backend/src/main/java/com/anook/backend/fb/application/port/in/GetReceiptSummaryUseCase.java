package com.anook.backend.fb.application.port.in;

import com.anook.backend.fb.application.dto.response.ReceiptSummaryResult;

/**
 * 객실별 영수증 요약 조회 UseCase
 */
public interface GetReceiptSummaryUseCase {
    ReceiptSummaryResult getReceiptSummary(String roomNo);
}
