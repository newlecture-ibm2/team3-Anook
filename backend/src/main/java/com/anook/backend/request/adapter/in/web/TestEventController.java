package com.anook.backend.request.adapter.in.web;

import com.anook.backend.infrastructure.event.RequestDetectedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * [개발용] RequestDetectedEvent 강제 발행 컨트롤러
 *
 * Message 도메인 없이 Request 도메인만 단독으로 테스트할 수 있게 해줍니다.
 */
@RestController
@RequestMapping("/test")
public class TestEventController {

    private final ApplicationEventPublisher eventPublisher;

    public TestEventController(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    /**
     * 가짜 요청을 생성하여 이벤트 발행
     */
    @PostMapping("/simulate-request")
    public ResponseEntity<String> simulateRequest(@RequestBody SimulateRequestDto dto) {
        
        // DTO 필드가 null일 경우 기본값 설정
        String domainCode = dto.domainCode() != null ? dto.domainCode() : "HK";
        String priority = dto.priority() != null ? dto.priority() : "NORMAL";
        Map<String, Object> entities = dto.entities() != null ? dto.entities() : Map.of("item", "towel", "qty", 2);
        double confidence = dto.confidence() != null ? dto.confidence() : 0.95;
        String rawText = dto.rawText() != null ? dto.rawText() : "수건 좀 주세요";
        String summary = dto.summary() != null ? dto.summary() : "수건 요청";
        boolean escalated = dto.escalated() != null ? dto.escalated() : false;

        RequestDetectedEvent event = new RequestDetectedEvent(
                this,
                dto.roomNo(),
                dto.guestId() != null ? dto.guestId() : 1L, // 기본값 1L
                domainCode,
                priority,
                entities,
                confidence,
                rawText,
                summary,
                escalated
        );

        eventPublisher.publishEvent(event);

        return ResponseEntity.ok("가짜 요청 이벤트 발행 완료! (roomNo: " + dto.roomNo() + ")");
    }

    /**
     * 테스트용 요청 Body DTO
     */
    public record SimulateRequestDto(
            String roomNo,
            Long guestId,
            String domainCode,
            String priority,
            Map<String, Object> entities,
            Double confidence,
            String rawText,
            String summary,
            Boolean escalated
    ) {}
}
