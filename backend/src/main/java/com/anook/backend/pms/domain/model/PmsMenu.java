package com.anook.backend.pms.domain.model;

/**
 * PMS 메뉴 도메인 모델 (순수 POJO)
 */
public record PmsMenu(
        Long id,
        String name,
        int price,
        String category,
        String allergens,
        String options,
        boolean available
) {}
