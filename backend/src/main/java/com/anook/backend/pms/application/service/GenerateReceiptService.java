package com.anook.backend.pms.application.service;

import com.anook.backend.pms.application.port.in.GenerateReceiptUseCase;
import com.anook.backend.pms.application.port.out.PmsMenuRepositoryPort;
import com.anook.backend.pms.application.port.out.PmsReceiptRepositoryPort;
import com.anook.backend.pms.domain.model.PmsMenu;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 통합 영수증 생성 서비스 — 모든 부서의 유료 서비스를 통합 처리
 *
 * 이벤트를 제거하고 UseCase를 직접 호출하는 방식으로 리팩토링 되었습니다.
 * 해당 요청의 엔티티(entities)에서 유료 항목(pms_menu에 존재하는 항목)을 추출하고 영수증(pms_receipt)을 생성합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateReceiptService implements GenerateReceiptUseCase {

    private final PmsMenuRepositoryPort menuRepository;
    private final PmsReceiptRepositoryPort receiptRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generate(String roomNo, String departmentId, Map<String, Object> entities) {
        if (entities == null) {
            return;
        }

        // FB 룸서비스: entities.menu_items 기반 영수증 생성
        if ("FB".equals(departmentId)) {
            handleFbReceipt(roomNo, entities);
        }
        // HK 및 기타 부서: entities.REQ_ITEM 기반 영수증 생성
        else {
            handleGenericReceipt(roomNo, departmentId, entities);
        }
    }

    /**
     * FB 룸서비스 영수증 처리 — menu_items 배열 기반
     */
    @SuppressWarnings("unchecked")
    private void handleFbReceipt(String roomNo, Map<String, Object> entities) {
        if (!"ROOM_SERVICE".equals(entities.get("intent"))) {
            return;
        }

        List<Map<String, Object>> menuItems = (List<Map<String, Object>>) entities.get("menu_items");
        if (menuItems == null || menuItems.isEmpty()) {
            log.info("[Billing] {}호 FB 완료 — 메뉴 항목 없음, 영수증 생략", roomNo);
            return;
        }

        List<PmsMenu> allMenus = menuRepository.findAll();

        for (Map<String, Object> item : menuItems) {
            String name = (String) item.get("name");
            int quantity = (item.get("quantity") instanceof Number)
                    ? ((Number) item.get("quantity")).intValue() : 1;

            allMenus.stream()
                    .filter(m -> m.name().equals(name))
                    .findFirst()
                    .ifPresentOrElse(menu -> {
                        int totalPrice = menu.price() * quantity;
                        receiptRepository.save(roomNo, menu.id(), quantity, totalPrice);
                        log.info("[Billing] FB 영수증 생성: {}호 / {} x{} = {}원",
                                roomNo, menu.name(), quantity, totalPrice);
                    }, () -> {
                        log.warn("[Billing] FB 메뉴 '{}'를 PMS에서 찾을 수 없어 영수증 생략", name);
                    });
        }
    }

    /**
     * HK 및 기타 부서 유료 서비스 영수증 처리 — REQ_ITEM 기반
     */
    @SuppressWarnings("unchecked")
    private void handleGenericReceipt(String roomNo, String departmentId, Map<String, Object> entities) {
        Object reqItemObj = entities.get("REQ_ITEM");
        if (reqItemObj == null) {
            return;
        }

        List<String> reqItems;
        if (reqItemObj instanceof List<?> list) {
            reqItems = list.stream().map(Object::toString).toList();
        } else if (reqItemObj instanceof String str) {
            reqItems = List.of(str);
        } else {
            return;
        }

        // 수량 추출
        int quantity = 1;
        Object qtyObj = entities.get("qty");
        if (qtyObj == null) qtyObj = entities.get("quantity");
        if (qtyObj instanceof Number num) {
            quantity = num.intValue();
        }

        List<PmsMenu> allMenus = menuRepository.findAll();

        for (String itemName : reqItems) {
            String trimmedName = itemName.trim();
            int finalQuantity = quantity;

            allMenus.stream()
                    .filter(m -> m.name().contains(trimmedName) || trimmedName.contains(m.name()))
                    .findFirst()
                    .ifPresent(menu -> {
                        int totalPrice = menu.price() * finalQuantity;
                        receiptRepository.save(roomNo, menu.id(), finalQuantity, totalPrice);
                        log.info("[Billing] {} 영수증 생성: {}호 / {} x{} = {}원",
                                departmentId, roomNo,
                                menu.name(), finalQuantity, totalPrice);
                    });
        }
    }
}
