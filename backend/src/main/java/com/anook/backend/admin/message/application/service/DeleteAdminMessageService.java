package com.anook.backend.admin.message.application.service;

import com.anook.backend.admin.message.application.port.in.DeleteAdminMessageUseCase;
import com.anook.backend.admin.message.application.port.out.AdminMessageCommandPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DeleteAdminMessageService implements DeleteAdminMessageUseCase {

    private final AdminMessageCommandPort commandPort;

    @Override
    @Transactional
    public void deleteRoomMessages(String roomNo) {
        commandPort.deleteMessagesByRoomNo(roomNo);
    }
}
