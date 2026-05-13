package com.anook.backend.fb.application.listener;

import com.anook.backend.message.application.event.RequestDetectedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * FB 주문 감지 리스너 — 로그 기록만 수행
 *
 * [리팩토링 이력]
 * - 기존: AI가 룸서비스 주문을 감지하면 즉시 pms_receipt에 영수증을 INSERT했음.
 *   → 문제: 고객이 주문을 취소해도 영수증이 남아 체크아웃 시 유령 청구 발생.
 *
 * - 변경: 영수증 생성 로직을 완전히 제거하고, ReceiptGenerationListener로 이관.
 *   → 직원이 COMPLETED 처리할 때만 영수증이 발급되므로, 취소 시 영수증 누락 원천 차단.
 *
 * @see com.anook.backend.pms.application.listener.ReceiptGenerationListener
 */
@Slf4j
@Component
public class FbOrderEventListener {

    @EventListener
    public void onFbOrderReceived(RequestDetectedEvent event) {
        if (!"FB".equals(event.getDomainCode())) {
            return;
        }

        Map<String, Object> entities = event.getEntities();
        if (entities == null || !"ROOM_SERVICE".equals(entities.get("intent"))) {
            return;
        }

        // 영수증 생성은 ReceiptGenerationListener에서 COMPLETED 시점에 처리
        log.info("[FB] 룸서비스 주문 감지 (영수증은 완료 시 생성): roomNo={}, summary={}",
                event.getRoomNo(), event.getSummary());
    }
}
