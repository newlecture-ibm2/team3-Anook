package com.anook.backend.message.application.port.in;

import com.anook.backend.message.application.dto.request.ReceiveProgressCommand;

public interface ReceiveProgressUseCase {
    void receiveProgress(ReceiveProgressCommand command);
}
