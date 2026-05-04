package com.anook.backend.message.application.dto.request;

/**
 * 메시지 전송 커맨드 DTO (Controller → Service)
 */
public record SendMessageCommand(
        /** 객실 번호 (URL path에서 추출) */
        String roomNo,

        /** PMS 투숙객 ID (Authentication에서 추출) */
        Long guestId,

        /** 고객 메시지 내용 */
        String content,

        /** 고객 언어 코드 (기본값: "ko") */
        String guestLanguage
) {
    public SendMessageCommand(String roomNo, Long guestId, String content) {
        this(roomNo, guestId, content, "ko");
    }
}
