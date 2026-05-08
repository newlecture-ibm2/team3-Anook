package com.anook.backend.request.application.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class RequestStatusCheckedEvent extends ApplicationEvent {
    private final String roomNo;
    private final Long guestId;
    private final String replyMessage;

    public RequestStatusCheckedEvent(Object source, String roomNo, Long guestId, String replyMessage) {
        super(source);
        this.roomNo = roomNo;
        this.guestId = guestId;
        this.replyMessage = replyMessage;
    }
}
