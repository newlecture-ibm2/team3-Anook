package com.anook.backend.fb.application.listener;

import com.anook.backend.fb.application.dto.response.MenuInfo;
import com.anook.backend.fb.application.port.out.MenuQueryPort;
import com.anook.backend.fb.application.port.out.ReceiptSubmitPort;
import com.anook.backend.message.application.event.RequestDetectedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class FbOrderEventListener {

    private final MenuQueryPort menuQueryPort;
    private final ReceiptSubmitPort receiptSubmitPort;

    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onFbOrderReceived(RequestDetectedEvent event) {
        // 1. FB 부서의 룸서비스 주문인지 확인
        if (!"FB".equals(event.getDomainCode())) {
            return;
        }

        Map<String, Object> entities = event.getEntities();
        if (entities == null || !"ROOM_SERVICE".equals(entities.get("intent"))) {
            return;
        }

        log.info("[FB] 룸서비스 주문 감지! 영수증(pms_receipt) 생성 시작: roomNo={}", event.getRoomNo());

        // 2. 파싱된 주문 내역 추출
        List<Map<String, Object>> menuItems = (List<Map<String, Object>>) entities.get("menu_items");
        if (menuItems == null || menuItems.isEmpty()) {
            log.warn("[FB] 주문 내역(menu_items)이 비어있어 영수증을 생성하지 않습니다.");
            return;
        }

        // 3. PMS 메뉴 목록 로드 (이름으로 ID 매칭하기 위함)
        List<MenuInfo> availableMenus = menuQueryPort.findAvailableMenus();

        // 4. 주문 항목별로 영수증 포트(ReceiptSubmitPort) 호출
        for (Map<String, Object> item : menuItems) {
            String name = (String) item.get("name");
            int quantity = (item.get("quantity") instanceof Number) ? ((Number) item.get("quantity")).intValue() : 1;

            availableMenus.stream()
                    .filter(m -> m.name().equals(name))
                    .findFirst()
                    .ifPresentOrElse(menu -> {
                        int totalPrice = menu.price() * quantity; // 실제 PMS 기준 가격 적용
                        receiptSubmitPort.submitReceipt(event.getRoomNo(), menu.id(), quantity, totalPrice);
                        log.info("[FB] 영수증 생성 완료: {} ({}개, 총 {}원)", menu.name(), quantity, totalPrice);
                    }, () -> {
                        log.warn("[FB] AI가 전달한 메뉴 '{}'를 PMS에서 찾을 수 없습니다.", name);
                    });
        }
    }
}
