package com.anook.backend.fb.application.service;

import com.anook.backend.fb.application.dto.response.ReceiptItemInfo;
import com.anook.backend.fb.application.dto.response.ReceiptSummaryResult;
import com.anook.backend.fb.application.port.in.GetReceiptSummaryUseCase;
import com.anook.backend.fb.application.port.out.ReceiptQueryPort;
import com.anook.backend.global.exchangerate.application.port.in.GetExchangeRateUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetReceiptSummaryService implements GetReceiptSummaryUseCase {

    private final ReceiptQueryPort receiptQueryPort;
    private final GetExchangeRateUseCase exchangeRateUseCase;

    @Override
    public ReceiptSummaryResult getReceiptSummary(String roomNo) {
        List<ReceiptItemInfo> items = receiptQueryPort.findUnpaidByRoomNo(roomNo);
        double krwToUsdRate = exchangeRateUseCase.getKrwToUsdRate();

        List<ReceiptItemInfo> mappedItems = items.stream()
                .map(item -> {
                    if (item.unitPriceUsd() == null) {
                        double calculatedUnitUsd = item.unitPrice() * krwToUsdRate;
                        double calculatedTotalUsd = item.totalPrice() * krwToUsdRate;
                        return new ReceiptItemInfo(
                                item.menuName(),
                                item.quantity(),
                                item.unitPrice(),
                                item.totalPrice(),
                                calculatedUnitUsd,
                                calculatedTotalUsd
                        );
                    }
                    return item;
                })
                .toList();

        int totalAmount = mappedItems.stream()
                .mapToInt(ReceiptItemInfo::totalPrice)
                .sum();

        double totalAmountUsd = mappedItems.stream()
                .mapToDouble(ReceiptItemInfo::totalPriceUsd)
                .sum();

        return new ReceiptSummaryResult(roomNo, mappedItems, totalAmount, totalAmountUsd);
    }
}
