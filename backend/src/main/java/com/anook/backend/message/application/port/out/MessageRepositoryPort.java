package com.anook.backend.message.application.port.out;

import com.anook.backend.message.domain.model.Message;

import java.util.List;

/**
 * 메시지 영속성 포트 (Out)
 *
 * Service → 이 인터페이스 → PersistenceAdapter(구현체)
 *
 * ❌ JPA Entity를 반환하지 않는다
 * ✅ 도메인 모델(Message)만 반환한다
 */
public interface MessageRepositoryPort {

    /**
     * 메시지 저장
     */
    Message save(Message message);

    /**
     * 특정 객실의 대화 내역 조회 (시간순 정렬)
     */
    List<Message> findByRoomNo(String roomNo);

    /**
     * 특정 객실의 최근 대화 내역 조회 (시간순 정렬, limit)
     */
    List<Message> findRecentByRoomNo(String roomNo, int limit);
}

