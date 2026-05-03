package com.anook.backend.staff.request.adapter.out.persistence;

import com.anook.backend.staff.request.adapter.in.web.dto.response.StaffTaskResult;
import com.anook.backend.staff.request.application.port.out.RequestQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class StaffRequestQueryAdapter implements RequestQueryPort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<StaffTaskResult> findRequests(String departmentId, String status, String priority) {
        StringBuilder sql = new StringBuilder(
                "SELECT r.id, r.status, r.priority, r.department_id, r.summary, r.raw_text, r.room_no, r.assigned_staff_id, r.confidence, r.created_at " +
                "FROM request r WHERE 1=1"
        );
        
        List<Object> params = new ArrayList<>();

        if (!"ALL".equalsIgnoreCase(departmentId)) {
            sql.append(" AND r.department_id = ?");
            params.add(departmentId);
        }
        if (!"ALL".equalsIgnoreCase(status)) {
            sql.append(" AND r.status = ?");
            params.add(status);
        }
        if (!"ALL".equalsIgnoreCase(priority)) {
            sql.append(" AND r.priority = ?");
            params.add(priority);
        }
        
        sql.append(" ORDER BY r.created_at DESC");

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            Long rId = rs.getLong("id");
            String rStatus = rs.getString("status");
            String rPriority = rs.getString("priority");
            String rDeptId = rs.getString("department_id");
            String rSummary = rs.getString("summary");
            String rRawText = rs.getString("raw_text");
            String rRoomNo = rs.getString("room_no");
            Float rConfidence = rs.getObject("confidence") != null ? rs.getFloat("confidence") : null;
            LocalDateTime rCreatedAt = rs.getTimestamp("created_at").toLocalDateTime();

            return new StaffTaskResult(
                rId,
                rStatus,
                rPriority,
                rDeptId,
                rSummary,
                rRawText,
                rRoomNo,
                null, // assignedStaffName
                rConfidence,
                rCreatedAt
            );
        }, params.toArray());
    }
}
