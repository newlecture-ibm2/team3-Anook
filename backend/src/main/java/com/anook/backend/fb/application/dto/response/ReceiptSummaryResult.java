package com.anook.backend.fb.application.dto.response;

import java.util.List;

/**
 * 객실별 영수증 요약 결과 (항목 목록 + 총합)
 */
public record ReceiptSummaryResult(
    String roomNo,
    List<ReceiptItemInfo> items,
    int totalAmount
) {}
