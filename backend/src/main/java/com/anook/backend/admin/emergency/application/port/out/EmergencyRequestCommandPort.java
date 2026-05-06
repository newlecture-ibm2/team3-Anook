package com.anook.backend.admin.emergency.application.port.out;

public interface EmergencyRequestCommandPort {
    void updateTaskStatus(Long taskId, String newStatus);
    void callEngineer(Long taskId);
}
