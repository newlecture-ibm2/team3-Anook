package com.anook.backend.fb.adapter.out.persistence;

import com.anook.backend.fb.application.port.out.ReceiptSubmitPort;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReceiptSubmitAdapter implements ReceiptSubmitPort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void submitReceipt(String roomNo, Long menuId, int quantity, int totalPrice) {
        String sql = "INSERT INTO pms_receipt (room_no, menu_id, quantity, total_price, status) " +
                     "VALUES (?, ?, ?, ?, 'UNPAID')";
        jdbcTemplate.update(sql, roomNo, menuId, quantity, totalPrice);
    }
}
