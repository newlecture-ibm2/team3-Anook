package com.anook.backend.admin.emergency.application.service;

import com.anook.backend.admin.emergency.application.port.in.HandleEmergencyActionUseCase;
import com.anook.backend.admin.emergency.application.port.out.EmergencyRequestCommandPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HandleEmergencyActionService implements HandleEmergencyActionUseCase {

    private final EmergencyRequestCommandPort commandPort;

    @Override
    @Transactional
    public void startEmergencyResponse(Long taskId) {
        commandPort.updateTaskStatus(taskId, "IN_PROGRESS");
    }

    @Override
    @Transactional
    public void callEngineer(Long taskId) {
        commandPort.callEngineer(taskId);
    }

    @Override
    @Transactional
    public void completeEmergencyResponse(Long taskId) {
        commandPort.updateTaskStatus(taskId, "COMPLETED");
    }
}
