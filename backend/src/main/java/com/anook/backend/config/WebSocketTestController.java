package com.anook.backend.config;

import com.anook.backend.message.application.port.out.MessageDispatchPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * WebSocket 테스트 전용 컨트롤러
 *
 * ⚠️ 개발/테스트 용도로만 사용하며, 프로덕션 배포 전에 반드시 제거합니다.
 *
 * 사용법 (curl):
 * # 객실 302에 메시지 전송
 * curl -X POST http://localhost:8080/test/ws/room/302 \
 * -H "Content-Type: application/json" \
 * -d '{"type":"AI_RESPONSE","message":"수건 2장 보내드리겠습니다"}'
 *
 * # HK 부서에 메시지 전송
 * curl -X POST http://localhost:8080/test/ws/dept/HK \
 * -H "Content-Type: application/json" \
 * -d '{"type":"NEW_REQUEST","taskId":100,"summary":"수건 2장 요청"}'
 *
 * # 프론트 데스크 채널에 메시지 전송
 * curl -X POST http://localhost:8080/test/ws/frontdesk \
 * -H "Content-Type: application/json" \
 * -d '{"type":"ESCALATED","requestId":100,"reason":"ETC 코드"}'
 */
@RestController
@RequestMapping("/test/ws")
@RequiredArgsConstructor
public class WebSocketTestController {

    private final MessageDispatchPort dispatchPort;

    @PostMapping("/room/{roomNo}")
    public ResponseEntity<String> testRoom(
            @PathVariable String roomNo,
            @RequestBody Map<String, Object> payload) {
        dispatchPort.sendToRoom(roomNo, payload);
        return ResponseEntity.ok("✅ Sent to /topic/room/" + roomNo);
    }

    @PostMapping("/dept/{deptCode}")
    public ResponseEntity<String> testDept(
            @PathVariable String deptCode,
            @RequestBody Map<String, Object> payload) {
        dispatchPort.sendToDept(deptCode, payload);
        return ResponseEntity.ok("✅ Sent to /topic/dept/" + deptCode);
    }

    @PostMapping("/frontdesk")
    public ResponseEntity<String> testAdmin(
            @RequestBody Map<String, Object> payload) {
        dispatchPort.sendToFrontdesk(payload);
        return ResponseEntity.ok("✅ Sent to /topic/frontdesk");
    }
}
