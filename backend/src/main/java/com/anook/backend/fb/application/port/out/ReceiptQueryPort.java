package com.anook.backend.fb.application.port.out;

import com.anook.backend.fb.application.dto.response.ReceiptItemInfo;

import java.util.List;

/**
 * 객실별 영수증 조회 Port (읽기 전용)
 */
public interface ReceiptQueryPort {
    List<ReceiptItemInfo> findUnpaidByRoomNo(String roomNo);
}
