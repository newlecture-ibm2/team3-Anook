package com.anook.backend.admin.emergency.application.port.out;

import com.anook.backend.admin.emergency.domain.model.EmergencyTask;
import java.util.List;

public interface EmergencyRequestQueryPort {
    List<EmergencyTask> findActiveEmergencyTasks();
}
