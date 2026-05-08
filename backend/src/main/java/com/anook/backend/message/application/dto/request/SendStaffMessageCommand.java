package com.anook.backend.message.application.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * 직원이 투숙객에게 메시지를 보낼 때 사용하는 커맨드 DTO
 */
public record SendStaffMessageCommand(
        @NotBlank(message = "메시지 내용은 필수입니다.")
        String content,

        @NotBlank(message = "객실 번호는 필수입니다.")
        String roomNo,

        Long guestId,

        String targetLanguage
) {}
