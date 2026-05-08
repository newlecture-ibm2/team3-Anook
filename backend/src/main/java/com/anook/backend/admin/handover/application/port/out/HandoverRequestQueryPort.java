package com.anook.backend.admin.handover.application.port.out;

import com.anook.backend.admin.handover.domain.model.HandoverTask;
import java.time.LocalDateTime;
import java.util.List;

public interface HandoverRequestQueryPort {
    List<HandoverTask> findTasksByTimeRange(LocalDateTime start, LocalDateTime end);
}
