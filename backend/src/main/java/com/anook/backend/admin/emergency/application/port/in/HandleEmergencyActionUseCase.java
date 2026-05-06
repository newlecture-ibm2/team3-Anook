package com.anook.backend.admin.emergency.application.port.in;

public interface HandleEmergencyActionUseCase {
    void startEmergencyResponse(Long taskId);
    void callEngineer(Long taskId);
}
