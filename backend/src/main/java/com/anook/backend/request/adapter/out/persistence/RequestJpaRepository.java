package com.anook.backend.request.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Request JPA Repository — request 모듈 전용
 */
public interface RequestJpaRepository extends JpaRepository<RequestJpaEntity, Long> {

    /**
     * 방번호로 해당 객실의 모든 요청 조회 (직원용)
     */
    List<RequestJpaEntity> findByRoomNo(String roomNo);

    /**
     * 방번호와 투숙객 ID로 해당 객실의 모든 요청 조회 (고객용 격리 조회)
     */
    List<RequestJpaEntity> findByRoomNoAndGuestId(String roomNo, Long guestId);

    /**
     * 특정 객실, 투숙객의 가장 최근 생성된 취소 가능(PENDING, ASSIGNED) 상태의 요청 1건 조회
     */
    java.util.Optional<RequestJpaEntity> findFirstByRoomNoAndGuestIdAndStatusInOrderByCreatedAtDesc(String roomNo, Long guestId, List<String> statuses);
}
