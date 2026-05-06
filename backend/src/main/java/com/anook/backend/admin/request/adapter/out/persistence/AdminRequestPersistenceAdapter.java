package com.anook.backend.admin.request.adapter.out.persistence;

import com.anook.backend.admin.request.adapter.out.persistence.entity.AdminRequestJpaEntity;
import com.anook.backend.admin.request.application.port.out.AdminRequestQueryPort;
import com.anook.backend.admin.request.domain.model.AdminRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * AdminRequestQueryPort 구현체 — JPA 기반
 *
 * request 테이블에 대한 읽기/쓰기를 JPA Entity로 처리합니다.
 * 부서명/직원명 등 다른 모듈 데이터는 Service에서 별도 Port로 조회합니다.
 */
@Component
@RequiredArgsConstructor
public class AdminRequestPersistenceAdapter implements AdminRequestQueryPort {

    private final AdminRequestJpaRepository jpaRepository;

    @Override
    public List<AdminRequest> findAll(String status, String departmentId, String priority, String sort) {
        List<AdminRequestJpaEntity> entities = jpaRepository.findAllWithFilters(
                (status != null && !status.isBlank()) ? status.toUpperCase() : null,
                (departmentId != null && !departmentId.isBlank()) ? departmentId.toUpperCase() : null,
                (priority != null && !priority.isBlank()) ? priority.toUpperCase() : null
        );

        return entities.stream()
                .map(AdminRequestJpaEntity::toDomain)
                .toList();
    }

    @Override
    public Optional<AdminRequest> findById(Long id) {
        return jpaRepository.findById(id)
                .map(AdminRequestJpaEntity::toDomain);
    }

    @Override
    public void assignStaff(Long requestId, Long staffId) {
        AdminRequestJpaEntity entity = jpaRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));
        entity.updateAssignedStaff(staffId);
        jpaRepository.save(entity);
    }

    @Override
    public void updatePriority(Long requestId, String priority) {
        AdminRequestJpaEntity entity = jpaRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));
        entity.updatePriority(priority);
        jpaRepository.save(entity);
    }

    @Override
    public void cancel(Long requestId) {
        AdminRequestJpaEntity entity = jpaRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));
        entity.cancel();
        jpaRepository.save(entity);
    }

    @Override
    public void escalate(Long requestId) {
        AdminRequestJpaEntity entity = jpaRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("요청을 찾을 수 없습니다. id=" + requestId));
        entity.approveEscalation();
        jpaRepository.save(entity);
    }

    @Override
    public List<AdminRequest> findEscalations() {
        List<AdminRequestJpaEntity> escalated = jpaRepository.findByStatusOrderByCreatedAtDesc("ESCALATED");
        return escalated.stream()
                .map(AdminRequestJpaEntity::toDomain)
                .toList();
    }

    @Override
    public AdminRequest save(String departmentId, String roomNo, String summary,
                             String rawText, String priority, Long assignedStaffId) {
        AdminRequestJpaEntity entity = AdminRequestJpaEntity.createManual(
                departmentId, roomNo, summary, rawText, priority, assignedStaffId);
        return jpaRepository.save(entity).toDomain();
    }

    // === 통계 ===

    @Override
    public long countAll() {
        return jpaRepository.count();
    }

    @Override
    public List<Object[]> countByStatus() {
        return jpaRepository.countGroupByStatus();
    }

    @Override
    public List<Object[]> countByDepartment() {
        return jpaRepository.countGroupByDepartment();
    }

    @Override
    public List<Object[]> countByPriority() {
        return jpaRepository.countGroupByPriority();
    }
}
