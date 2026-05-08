package com.anook.backend.fb.application.service;

import com.anook.backend.fb.application.dto.response.ReceiptItemInfo;
import com.anook.backend.fb.application.dto.response.ReceiptSummaryResult;
import com.anook.backend.fb.application.port.in.GetReceiptSummaryUseCase;
import com.anook.backend.fb.application.port.out.ReceiptQueryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetReceiptSummaryService implements GetReceiptSummaryUseCase {

    private final ReceiptQueryPort receiptQueryPort;

    @Override
    public ReceiptSummaryResult getReceiptSummary(String roomNo) {
        List<ReceiptItemInfo> items = receiptQueryPort.findUnpaidByRoomNo(roomNo);
        int totalAmount = items.stream()
                .mapToInt(ReceiptItemInfo::totalPrice)
                .sum();
        return new ReceiptSummaryResult(roomNo, items, totalAmount);
    }
}
