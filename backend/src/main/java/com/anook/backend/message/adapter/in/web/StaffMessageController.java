package com.anook.backend.message.adapter.in.web;

import com.anook.backend.message.application.dto.request.SendStaffMessageCommand;
import com.anook.backend.message.application.port.in.SendMessageUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 직원/관리자 메시지 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/staff/messages")
@RequiredArgsConstructor
public class StaffMessageController {

    private final SendMessageUseCase sendMessageUseCase;

    /**
     * 직원이 투숙객에게 메시지를 보냅니다. (자동 번역 포함)
     * POST /staff/messages
     */
    @PostMapping
    public ResponseEntity<Void> sendStaffMessage(
            @Valid @RequestBody SendStaffMessageCommand command
            // @AuthenticationPrincipal StaffDetails staffDetails // 필요시 추가
    ) {
        log.info("[StaffMessageController] 직원 메시지 전송 요청 - roomNo: {}", command.roomNo());
        
        // guestId를 어디서 가져올지에 대한 처리가 필요하다면, 
        // 여기서 조회 로직을 호출하거나 프론트에서 넘어온 값을 그대로 사용할 수 있습니다.
        // 현재는 command에 포함된 값을 그대로 전달합니다.
        
        sendMessageUseCase.sendStaffMessage(command);

        return ResponseEntity.ok().build();
    }
}
