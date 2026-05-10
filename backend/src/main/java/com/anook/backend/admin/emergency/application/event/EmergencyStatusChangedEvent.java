package com.anook.backend.admin.emergency.application.event;

public class EmergencyStatusChangedEvent {
    private final Long requestId;
    private final String newStatus;

    public EmergencyStatusChangedEvent(Long requestId, String newStatus) {
        this.requestId = requestId;
        this.newStatus = newStatus;
    }

    public Long getRequestId() { return requestId; }
    public String getNewStatus() { return newStatus; }
}
