package com.anook.backend.admin.handover.application.port.in;

import com.anook.backend.admin.handover.application.dto.response.HandoverBriefingResult;
import java.time.LocalDate;

public interface GetHandoverBriefingUseCase {
    HandoverBriefingResult getBriefing(LocalDate targetDate, String shiftType);
}
