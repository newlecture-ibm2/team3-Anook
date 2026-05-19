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
}
