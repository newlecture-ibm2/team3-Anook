package com.anook.backend.message.application.port.in;

import com.anook.backend.message.application.dto.request.SendMessageCommand;
import com.anook.backend.message.application.dto.response.SendMessageResult;

/**
 * 메시지 전송 유스케이스 (Port In)
 *
 * Controller가 의존하는 인터페이스.
 * 구현체: SendMessageService
 */
public interface SendMessageUseCase {

    /**
     * 고객 메시지를 전송하고, AI 분석 후 응답을 생성한다.
     * 태스크형 요청이 감지되면 RequestDetectedEvent를 발행한다.
     *
     * @param command 전송 커맨드 (roomNo, content, guestLanguage)
     * @return 전송 결과 (guestMessageId, aiMessageId, aiReply)
     */
    SendMessageResult send(SendMessageCommand command);

    /**
     * 직원이 투숙객에게 메시지를 전송한다. (AI 자동 번역 포함)
     *
     * @param command 전송 커맨드 (roomNo, content)
     */
    void sendStaffMessage(com.anook.backend.message.application.dto.request.SendStaffMessageCommand command);
}
