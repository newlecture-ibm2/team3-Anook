package com.anook.backend.message.application.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class RequestStatusCheckByGuestEvent extends ApplicationEvent {
    private final String roomNo;
    private final Long guestId;
    private final String userMessage;

    public RequestStatusCheckByGuestEvent(Object source, String roomNo, Long guestId, String userMessage) {
        super(source);
        this.roomNo = roomNo;
        this.guestId = guestId;
        this.userMessage = userMessage;
    }
}
