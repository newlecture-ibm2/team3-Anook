package com.anook.backend.message.application.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.Map;

/**
 * 모듈 간 통신 이벤트: AI가 고객 메시지에서 태스크형 요청을 감지했을 때 발행
 *
 * 발행자: message 도메인 (SendMessageService)
 * 수신자: request 도메인 (CreateRequestOnEventService → @TransactionalEventListener)
 *
 * 이 클래스는 message ↔ request 간 유일한 공유 객체입니다.
 * 두 도메인이 서로를 직접 import하지 않고, 이 이벤트만 의존합니다.
 *
 * 이벤트 발행 조건: domainCode != null (intent는 더 이상 사용하지 않음)
 */
@Getter
public class RequestDetectedEvent extends ApplicationEvent {

    /** 객실 번호 (예: "302") */
    private final String roomNo;

    /** PMS 투숙객 ID */
    private final Long guestId;

    /** 도메인 코드 (예: "HK", "FB", "FACILITY", "CONCIERGE", "FRONT", "EMERGENCY") */
    private final String domainCode;

    /** 우선순위 (예: "NORMAL", "HIGH", "URGENT") */
    private final String priority;

    /** 부서별 가변 데이터 (예: {"item": "towel", "qty": 2}) */
    private final Map<String, Object> entities;

    /** AI 확신도 (0.0 ~ 1.0) */
    private final double confidence;

    /** 고객 발화 원문 (예: "수건 2장 주세요") */
    private final String rawText;

    /** AI가 생성한 요약 (예: "수건 2장 요청") */
    private final String summary;

    /** 에스컬레이션 여부 (confidence < 0.7이면 true) */
    private final boolean escalated;

    /** 요청 유형: "ADD"(새 요청 추가) 또는 "REPLACE"(기존 요청 수정) */
    private final String actionType;

    public RequestDetectedEvent(Object source,
                                 String roomNo,
                                 Long guestId,
                                 String domainCode,
                                 String priority,
                                 Map<String, Object> entities,
                                 double confidence,
                                 String rawText,
                                 String summary,
                                 boolean escalated,
                                 String actionType) {
        super(source);
        this.roomNo = roomNo;
        this.guestId = guestId;
        this.domainCode = domainCode;
        this.priority = priority;
        this.entities = entities;
        this.confidence = confidence;
        this.rawText = rawText;
        this.summary = summary;
        this.escalated = escalated;
        this.actionType = actionType;
    }
}

