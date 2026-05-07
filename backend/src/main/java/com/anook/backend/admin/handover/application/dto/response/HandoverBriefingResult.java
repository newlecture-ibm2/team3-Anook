package com.anook.backend.admin.handover.application.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class HandoverBriefingResult {
    private String shiftTimeLabel;
    private int totalRequestCount;
    private int pendingCount;
    private List<HandoverTaskResult> tasks;
}
