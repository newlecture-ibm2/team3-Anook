package com.anook.backend.message.application.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 고객이 AI 챗봇을 통해 "모든 요청"을 취소했을 때 발생하는 이벤트.
 */
@Getter
public class AllRequestsCancelledByGuestEvent extends ApplicationEvent {

    private final String roomNo;
    private final Long guestId;

    public AllRequestsCancelledByGuestEvent(Object source, String roomNo, Long guestId) {
        super(source);
        this.roomNo = roomNo;
        this.guestId = guestId;
    }
}
