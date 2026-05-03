package com.anook.backend.request.domain.model;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Request 도메인 모델 — 순수 POJO Aggregate Root
 *
 * JPA, Spring 등 프레임워크 의존 없음.
 * 행위 메서드를 통해 상태 변경 (빈혈 도메인 방지).
 */
public class Request {

    private Long id;
    private RequestStatus status;
    private Priority priority;
    private DomainCode domainCode;
    private Map<String, Object> entities;
    private double confidence;
    private String rawText;
    private String summary;
    private String roomNo;
    private Long assignedStaffId;
    private int version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // === 생성자 (팩토리 메서드 + 재구성용) ===

    private Request() {}

    /**
     * 신규 Request 생성 (이벤트 수신 시)
     */
    public static Request create(String roomNo,
                                  DomainCode domainCode,
                                  String priority,
                                  Map<String, Object> entities,
                                  double confidence,
                                  String rawText,
                                  String summary) {
        Request request = new Request();
        request.roomNo = roomNo;
        request.domainCode = domainCode;
        request.status = RequestStatus.PENDING;
        request.priority = Priority.from(priority);
        request.entities = entities;
        request.confidence = confidence;
        request.rawText = rawText;
        request.summary = summary;
        request.version = 0;
        request.createdAt = LocalDateTime.now();
        request.updatedAt = LocalDateTime.now();
        return request;
    }

    /**
     * DB에서 재구성할 때 사용 (PersistenceAdapter → Domain 변환)
     */
    public static Request reconstitute(Long id,
                                        RequestStatus status,
                                        Priority priority,
                                        DomainCode domainCode,
                                        Map<String, Object> entities,
                                        double confidence,
                                        String rawText,
                                        String summary,
                                        String roomNo,
                                        Long assignedStaffId,
                                        int version,
                                        LocalDateTime createdAt,
                                        LocalDateTime updatedAt) {
        Request request = new Request();
        request.id = id;
        request.status = status;
        request.priority = priority;
        request.domainCode = domainCode;
        request.entities = entities;
        request.confidence = confidence;
        request.rawText = rawText;
        request.summary = summary;
        request.roomNo = roomNo;
        request.assignedStaffId = assignedStaffId;
        request.version = version;
        request.createdAt = createdAt;
        request.updatedAt = updatedAt;
        return request;
    }

    // === 행위 메서드 ===

    /**
     * 상태 변경 — 유효한 전이만 허용
     */
    public void changeStatus(RequestStatus newStatus) {
        validateTransition(this.status, newStatus);
        this.status = newStatus;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 에스컬레이션 (AI 확신도 부족 시)
     */
    public void escalate(String reason) {
        this.priority = Priority.URGENT;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 직원 배정
     */
    public void assignStaff(Long staffId) {
        this.assignedStaffId = staffId;
        if (this.status == RequestStatus.PENDING) {
            this.status = RequestStatus.ASSIGNED;
        }
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 초과 시간 여부 (30분 기준)
     */
    public boolean isOverdue() {
        if (status == RequestStatus.COMPLETED || status == RequestStatus.SETTLED || status == RequestStatus.CANCELLED) {
            return false;
        }
        return createdAt != null && createdAt.plusMinutes(30).isBefore(LocalDateTime.now());
    }

    // === 상태 전이 검증 ===

    private void validateTransition(RequestStatus from, RequestStatus to) {
        boolean valid = switch (to) {
            case ASSIGNED -> from == RequestStatus.PENDING;
            case IN_PROGRESS -> from == RequestStatus.ASSIGNED;
            case COMPLETED -> from == RequestStatus.ASSIGNED || from == RequestStatus.IN_PROGRESS;
            case SETTLED -> from == RequestStatus.COMPLETED;
            case CANCELLED -> from != RequestStatus.SETTLED && from != RequestStatus.CANCELLED;
            default -> false;
        };
        if (!valid) {
            throw new IllegalStateException(
                    String.format("상태 전환 불가: %s → %s", from, to));
        }
    }

    // === Getter ===

    public Long getId() { return id; }
    public RequestStatus getStatus() { return status; }
    public Priority getPriority() { return priority; }
    public DomainCode getDomainCode() { return domainCode; }
    public Map<String, Object> getEntities() { return entities; }
    public double getConfidence() { return confidence; }
    public String getRawText() { return rawText; }
    public String getSummary() { return summary; }
    public String getRoomNo() { return roomNo; }
    public Long getAssignedStaffId() { return assignedStaffId; }
    public int getVersion() { return version; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    /**
     * department 테이블의 ID로 변환 (domainCode → deptId)
     */
    public String getDepartmentId() {
        return domainCode != null ? domainCode.getDeptId() : null;
    }
}
