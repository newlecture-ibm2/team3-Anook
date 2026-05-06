package com.anook.backend.admin.emergency.application.port.in;

import com.anook.backend.admin.emergency.application.dto.response.EmergencyTaskResult;
import java.util.List;

public interface GetEmergencyTasksUseCase {
    List<EmergencyTaskResult> getActiveEmergencies();
}
