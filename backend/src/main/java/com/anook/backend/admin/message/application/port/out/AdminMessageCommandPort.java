package com.anook.backend.admin.message.application.port.out;

public interface AdminMessageCommandPort {
    void deleteMessagesByRoomNo(String roomNo);
}
