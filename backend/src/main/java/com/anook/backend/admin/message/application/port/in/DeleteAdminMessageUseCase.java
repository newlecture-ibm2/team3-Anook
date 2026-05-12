package com.anook.backend.admin.message.application.port.in;

public interface DeleteAdminMessageUseCase {
    void deleteRoomMessages(String roomNo);
}
