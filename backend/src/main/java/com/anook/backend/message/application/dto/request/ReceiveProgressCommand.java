package com.anook.backend.message.application.dto.request;

import java.util.List;

public record ReceiveProgressCommand(
        String roomNo,
        List<String> domains,
        String status
) {
}
