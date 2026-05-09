package com.anook.backend.message.application.service;

import com.anook.backend.message.application.dto.request.ReceiveProgressCommand;
import com.anook.backend.message.application.port.in.ReceiveProgressUseCase;
import com.anook.backend.message.application.port.out.MessageDispatchPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReceiveProgressService implements ReceiveProgressUseCase {
    private final MessageDispatchPort dispatchPort;

    @Override
    public void receiveProgress(ReceiveProgressCommand cmd) {
        Map<String, Object> payload = Map.of(
            "type", "AI_PROGRESS",
            "domains", cmd.domains(),
            "status", cmd.status()
        );
        dispatchPort.sendToRoom(cmd.roomNo(), payload);
        log.info("[Message] AI 진행 상태 Push → room: {}, domains: {}", cmd.roomNo(), cmd.domains());
    }
}
