package com.anook.backend.pms.application.dto.response;

public record BillingItemResult(
        String menuName,
        String category,
        int quantity,
        double unitPrice,
        double totalPrice,
        String createdAt
) {}
