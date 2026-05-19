package com.anook.backend.pms.application.dto.response;

import java.util.List;

public record GetBillingSummaryResult(
        String roomNo,
        String category,
        List<BillingItemResult> items,
        double subtotal,
        double tax,
        double serviceCharge,
        double totalAmount,
        String currency
) {}
