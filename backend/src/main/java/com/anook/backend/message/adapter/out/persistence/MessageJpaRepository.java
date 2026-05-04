package com.anook.backend.message.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 메시지 JPA Repository
 *
 * ⚠️ Service에서 직접 import 금지
 * ⚠️ MessagePersistenceAdapter 내부에서만 사용
 */
public interface MessageJpaRepository extends JpaRepository<MessageJpaEntity, Long> {

    /**
     * 특정 객실의 메시지를 시간순으로 조회
     */
    List<MessageJpaEntity> findByRoomNoOrderByCreatedAtAsc(String roomNo);

    /**
     * 특정 객실의 최근 메시지 조회 (Pageable 이용)
     */
    List<MessageJpaEntity> findByRoomNoOrderByCreatedAtDesc(String roomNo, org.springframework.data.domain.Pageable pageable);
}
