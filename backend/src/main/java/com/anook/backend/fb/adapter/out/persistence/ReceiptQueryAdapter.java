package com.anook.backend.fb.adapter.out.persistence;

import com.anook.backend.fb.application.dto.response.ReceiptItemInfo;
import com.anook.backend.fb.application.port.out.ReceiptQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * pms_receipt + pms_menu 조인으로 영수증 항목 조회 (읽기 전용)
 */
@Repository
@RequiredArgsConstructor
public class ReceiptQueryAdapter implements ReceiptQueryPort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<ReceiptItemInfo> findUnpaidByRoomNo(String roomNo) {
        String sql = """
            SELECT m.name AS menu_name,
                   r.quantity,
                   m.price AS unit_price,
                   r.total_price
            FROM pms_receipt r
            JOIN pms_menu m ON r.menu_id = m.id
            WHERE r.room_no = ?
              AND r.status = 'UNPAID'
            ORDER BY r.created_at DESC
            """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new ReceiptItemInfo(
                rs.getString("menu_name"),
                rs.getInt("quantity"),
                rs.getInt("unit_price"),
                rs.getInt("total_price")
        ), roomNo);
    }
}
