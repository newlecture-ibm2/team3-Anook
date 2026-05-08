package com.anook.backend.message.application.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 고객이 AI 챗봇을 통해 가장 최근 요청을 취소했을 때 발생하는 이벤트.
 * Message 모듈에서 발행(Publish)하고, Request 모듈에서 구독(Subscribe)한다.
 */
@Getter
public class RequestCancelledByGuestEvent extends ApplicationEvent {

    private final String roomNo;
    private final Long guestId;
    private final String domainCode;

    public RequestCancelledByGuestEvent(Object source, String roomNo, Long guestId, String domainCode) {
        super(source);
        this.roomNo = roomNo;
        this.guestId = guestId;
        this.domainCode = domainCode;
    }
}
