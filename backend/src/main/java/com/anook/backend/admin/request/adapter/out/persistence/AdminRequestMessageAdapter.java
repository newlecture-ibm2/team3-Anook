package com.anook.backend.admin.request.adapter.out.persistence;

import com.anook.backend.admin.message.adapter.out.persistence.AdminMessageJpaRepository;
import com.anook.backend.admin.message.adapter.out.persistence.entity.AdminMessageJpaEntity;
import com.anook.backend.admin.request.application.port.out.AdminRequestMessagePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * AdminRequestMessagePort 구현체
 *
 * admin/request 모듈의 Port(Out) 인터페이스를 구현하여
 * message 테이블에 STAFF 메시지를 저장합니다.
 *
 * ⚠️ 같은 admin 패키지 내의 admin/message 엔티티를 사용하되,
 *    message 모듈(비-admin)의 코드는 import하지 않습니다.
 */
@Component
@RequiredArgsConstructor
public class AdminRequestMessageAdapter implements AdminRequestMessagePort {

    private final AdminMessageJpaRepository adminMessageJpaRepository;

    @Override
    public void sendStaffMessage(String roomNo, String content) {
        AdminMessageJpaEntity entity = AdminMessageJpaEntity.createStaffMessage(roomNo, content);
        adminMessageJpaRepository.save(entity);
    }
}
