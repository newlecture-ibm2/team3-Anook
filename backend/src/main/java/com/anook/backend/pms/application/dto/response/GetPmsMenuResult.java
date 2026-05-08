package com.anook.backend.pms.application.dto.response;

/**
 * PMS 메뉴 조회 응답 DTO
 */
public record GetPmsMenuResult(
        Long id,
        String name,
        int price,
        String category,
        String allergens,
        String options,
        boolean available
) {}
