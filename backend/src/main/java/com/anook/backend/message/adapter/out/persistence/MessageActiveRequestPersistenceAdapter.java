package com.anook.backend.message.adapter.out.persistence;

import com.anook.backend.message.application.port.out.MessageActiveRequestPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class MessageActiveRequestPersistenceAdapter implements MessageActiveRequestPort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<String> getActiveRequestSummaries(String roomNo) {
        String sql = "SELECT entities->>'intent' as intent, summary FROM request WHERE room_no = ? AND status IN ('PENDING', 'IN_PROGRESS', 'ACCEPTED')";
        
        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            String intent = rs.getString("intent");
            if (intent == null) {
                intent = "UNKNOWN";
            }
            String summary = rs.getString("summary");
            return String.format("[%s] %s", intent, summary);
        }, roomNo);
    }
    @Override
    public java.util.List<java.util.Map<String, Object>> findActiveRequests(String roomNo, Long guestId) {
        String sql = "SELECT id, department_id, summary, status " +
                     "FROM request " +
                     "WHERE room_no = ? AND guest_id = ? AND status IN ('PENDING', 'IN_PROGRESS', 'ESCALATED') " +
                     "ORDER BY created_at DESC " +
                     "LIMIT 10"; // AI에 보낼 문맥이므로 최근 10개로 제한
                     
        return jdbcTemplate.queryForList(sql, roomNo, guestId);
    }
}
