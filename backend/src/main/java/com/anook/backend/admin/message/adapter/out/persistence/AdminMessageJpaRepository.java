package com.anook.backend.admin.message.adapter.out.persistence;

import com.anook.backend.admin.message.adapter.out.persistence.entity.AdminMessageJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * 관리자용 메시지 JPA Repository (읽기 전용)
 *
 * admin/message 모듈 내부에서만 사용
 */
public interface AdminMessageJpaRepository extends JpaRepository<AdminMessageJpaEntity, Long> {

    /**
     * 메시지가 존재하는 고유 roomNo 목록
     */
    @Query("SELECT DISTINCT m.roomNo FROM AdminMessage m ORDER BY m.roomNo")
    List<String> findDistinctRoomNos();

    /**
     * 특정 roomNo의 메시지를 시간순으로 조회
     */
    List<AdminMessageJpaEntity> findByRoomNoOrderByCreatedAtAsc(String roomNo);
}
