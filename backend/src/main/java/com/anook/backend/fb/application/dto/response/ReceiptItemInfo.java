package com.anook.backend.fb.application.dto.response;

/**
 * 영수증 항목 1건의 조회 결과
 */
public record ReceiptItemInfo(
    String menuName,
    int quantity,
    int unitPrice,
    int totalPrice,
    Double unitPriceUsd,
    Double totalPriceUsd
) {}
