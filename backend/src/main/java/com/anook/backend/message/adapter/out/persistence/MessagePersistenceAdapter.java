package com.anook.backend.message.adapter.out.persistence;

import com.anook.backend.message.application.port.out.MessageRepositoryPort;
import com.anook.backend.message.domain.model.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 메시지 영속성 어댑터
 *
 * MessageRepositoryPort 구현체
 * Domain ↔ JPA Entity 변환을 이 클래스 안에서만 수행
 *
 * ✅ Port(Out)에는 도메인 모델(Message)만 반환
 * ❌ JPA Entity를 Port 밖으로 노출하지 않음
 */
@Component
@RequiredArgsConstructor
public class MessagePersistenceAdapter implements MessageRepositoryPort {

    private final MessageJpaRepository jpaRepository;

    @Override
    public Message save(Message message) {
        MessageJpaEntity entity = MessageJpaEntity.fromDomain(message);
        MessageJpaEntity saved = jpaRepository.save(entity);
        return saved.toDomain();
    }

    @Override
    public List<Message> findByRoomNoAndGuestId(String roomNo, Long guestId) {
        return jpaRepository.findByRoomNoAndGuestIdOrderByCreatedAtAsc(roomNo, guestId)
                .stream()
                .map(MessageJpaEntity::toDomain)
                .toList();
    }
}

