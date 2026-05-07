package com.anook.backend.admin.message.adapter.out.persistence;

import com.anook.backend.admin.message.adapter.out.persistence.entity.AdminMessageJpaEntity;
import com.anook.backend.admin.message.application.port.out.AdminMessageQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 관리자 메시지 PersistenceAdapter
 *
 * AdminMessageQueryPort 구현체.
 * message 테이블에 room_no가 직접 있으므로 room 테이블 JOIN 불필요.
 * message 모듈의 코드를 import하지 않음 (독립성 유지).
 */
@Component
@RequiredArgsConstructor
public class AdminMessagePersistenceAdapter implements AdminMessageQueryPort {

    private final AdminMessageJpaRepository jpaRepository;

    @Override
    public List<Map<String, Object>> findRoomsWithMessages() {
        List<String> roomNos = jpaRepository.findDistinctRoomNos();

        return roomNos.stream().map(roomNo -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("roomNo", roomNo);
            return map;
        }).toList();
    }

    @Override
    public List<Map<String, Object>> findMessagesByRoomNo(String roomNo) {
        List<AdminMessageJpaEntity> entities = jpaRepository.findByRoomNoOrderByCreatedAtAsc(roomNo);

        return entities.stream().map(e -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", e.getId());
            map.put("senderType", e.getSenderType());
            map.put("content", e.getContent());
            map.put("translatedContent", e.getTranslatedContent());
            map.put("createdAt", e.getCreatedAt());
            return map;
        }).toList();
    }

    @Override
    public void saveStaffMessage(String roomNo, String content) {
        AdminMessageJpaEntity entity = AdminMessageJpaEntity.createStaffMessage(roomNo, content);
        jpaRepository.save(entity);
    }
}
