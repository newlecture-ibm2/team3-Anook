package com.anook.backend.guest.application.service;

import com.anook.backend.guest.application.port.in.CheckOutGuestUseCase;
import com.anook.backend.guest.application.port.out.GuestRepositoryPort;
import com.anook.backend.guest.application.port.out.ReceiptQueryPort;
import com.anook.backend.guest.domain.event.GuestCheckedOutEvent;
import com.anook.backend.global.exception.BusinessException;
import com.anook.backend.global.exception.ErrorCode;
import com.anook.backend.guest.domain.model.Guest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PMS 투숙객 체크아웃 서비스 (Hard Delete)
 *
 * 체크아웃 전 다음 조건을 검증한다:
 * 1) 투숙객 존재 확인
 * 2) 미결제 영수증 확인 (pms_receipt 테이블 — 부서 무관)
 *
 * [리팩토링 이력]
 * - 기존: FB 부서의 request 상태를 별도로 검사하여 미정산 건 확인 (RequestQueryPort 사용)
 * - 변경: 영수증이 COMPLETED 시점에만 생성되므로, pms_receipt의 UNPAID 여부만 확인하면
 *   모든 부서(FB, HK 등)의 미결제 유료 서비스를 통합 검증 가능.
 *   → RequestQueryPort 의존 제거, 코드 극적 단순화.
 *
 * ❌ JPA Repository 직접 import 금지
 * ✅ Port 인터페이스만 의존
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class CheckOutGuestService implements CheckOutGuestUseCase {

    private final GuestRepositoryPort guestRepository;
    private final ReceiptQueryPort receiptQueryPort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public void checkOut(Long guestId) {
        // 1) 투숙객 존재 확인
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GUEST_NOT_FOUND, "guestId=" + guestId));

        // 2) 미결제 영수증 확인 (부서 무관 — FB, HK 등 모든 유료 서비스 통합 검증)
        if (receiptQueryPort.hasUnpaidReceipts(guest.getRoomNumber())) {
            throw new BusinessException(ErrorCode.UNPAID_RECEIPTS_EXIST);
        }

        String roomNumber = guest.getRoomNumber();

        // 3) Hard Delete
        guestRepository.deleteById(guestId);

        // 4) 체크아웃 이벤트 발행 → ANOOK 세션 무효화
        eventPublisher.publishEvent(new GuestCheckedOutEvent(roomNumber));
        log.info("[CheckOut] {}호 체크아웃 완료 → 이벤트 발행", roomNumber);
    }
}

