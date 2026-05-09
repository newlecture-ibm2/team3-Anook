package com.anook.backend.message.adapter.in.web;

import com.anook.backend.message.application.dto.request.ReceiveProgressCommand;
import com.anook.backend.message.application.port.in.ReceiveProgressUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/chat/{roomNo}")
@RequiredArgsConstructor
public class GuestProgressController {
    private final ReceiveProgressUseCase receiveProgressUseCase;

    @PostMapping("/progress")
    public ResponseEntity<Void> receiveProgress(
            @PathVariable String roomNo,
            @RequestBody ReceiveProgressCommand command) {
        receiveProgressUseCase.receiveProgress(
                new ReceiveProgressCommand(roomNo, command.domains(), command.status())
        );
        return ResponseEntity.ok().build();
    }
}
