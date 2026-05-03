package com.anook.backend.staff.request.adapter.in.web.dto.response;

import java.time.LocalDateTime;

public record StaffTaskResult(
        Long id,
        String status,
        String priority,
        String departmentId,
        String summary,
        String rawText,
        String roomNumber,
        String assignedStaffName,
        Float confidence,
        LocalDateTime createdAt
) {}
