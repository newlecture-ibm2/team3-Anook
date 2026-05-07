package com.anook.backend.request.application.service;

import com.anook.backend.request.application.port.in.ConfirmRequestUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfirmRequestService implements ConfirmRequestUseCase {

    private final GracePeriodScheduler gracePeriodScheduler;

    @Override
    public void confirmRequest(Long requestId, String roomNo) {
        log.info("[Request] 고객이 수락 버튼을 눌러 요청을 즉시 접수합니다. requestId: {}, roomNo: {}", requestId, roomNo);
        gracePeriodScheduler.confirmEarly(requestId, roomNo);
    }
}
