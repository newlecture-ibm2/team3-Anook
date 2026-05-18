package com.anook.backend.message.adapter.out.persistence;

import com.anook.backend.message.application.port.out.MessageActiveRequestPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * MessageActiveRequestPort 구현체
 *
 * 다른 모듈(request)의 테이블을 읽기 전용으로 조회하기 위해
 * JdbcTemplate 네이티브 쿼리를 사용합니다 (JPA Entity 중복 방지).
 */
@Component
@RequiredArgsConstructor
public class ActiveRequestJdbcAdapter implements MessageActiveRequestPort {

    private final JdbcTemplate jdbcTemplate;

    /**
     * 해당 객실/고객의 취소 가능한 (PENDING) 요청 목록을 조회합니다.
     */
    @Override
    public List<Map<String, Object>> findActiveRequests(String roomNo, Long guestId) {
        String sql = "SELECT id, department_id, summary, status " +
                     "FROM request " +
                     "WHERE room_no = ? AND guest_id = ? AND status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED') " +
                     "ORDER BY created_at DESC " +
                     "LIMIT 10"; // AI에 보낼 문맥이므로 최근 10개로 제한
                     
        return jdbcTemplate.queryForList(sql, roomNo, guestId);
    }
}
