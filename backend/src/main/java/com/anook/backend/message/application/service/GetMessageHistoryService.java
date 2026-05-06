package com.anook.backend.message.application.service;

import com.anook.backend.message.application.dto.response.MessageDto;
import com.anook.backend.message.application.port.in.GetMessageHistoryUseCase;
import com.anook.backend.message.application.port.out.MessageRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 대화 내역 조회 서비스
 *
 * roomNo로 직접 메시지 목록 조회 (room.number가 PK)
 *
 * ❌ JPA Repository 직접 import 금지 → Port(Out)만 의존
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GetMessageHistoryService implements GetMessageHistoryUseCase {

    private final MessageRepositoryPort messagePort;

    @Override
    @Transactional(readOnly = true)
    public List<MessageDto> getHistory(String roomNo, Long guestId) {
        return messagePort.findByRoomNoAndGuestId(roomNo, guestId)
                .stream()
                .map(MessageDto::from)
                .toList();
    }
}

