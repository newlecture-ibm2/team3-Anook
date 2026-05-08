package com.anook.backend.staff.request.application.port.in;

/**
 * 직원 요청 상태 변경 UseCase
 */
public interface ChangeRequestStatusUseCase {

    /**
     * 요청을 수락(담당자 배정 및 진행 중으로 변경)합니다.
     * 
     * @param requestId 요청 ID
     * @param staffId   담당 직원 ID
     * @param version   낙관적 락을 위한 버전
     */
    void acceptRequest(Long requestId, Long staffId, Integer version);

    /**
     * 요청을 완료 처리합니다.
     * 
     * @param requestId 요청 ID
     * @param staffId   담당 직원 ID
     * @param version   낙관적 락을 위한 버전
     */
    void completeRequest(Long requestId, Long staffId, Integer version);

    /**
     * 요청을 다른 부서로 전달(이관)합니다.
     *
     * @param requestId      요청 ID
     * @param staffId        전달을 수행하는 직원 ID
     * @param toDepartmentId 전달 대상 부서 ID
     * @param reason         전달 사유
     * @param version        낙관적 락을 위한 버전
     */
    void transferRequest(Long requestId, Long staffId, String toDepartmentId, String reason, Integer version);

    /**
     * 고객의 취소 요청을 승인합니다.
     *
     * @param requestId 요청 ID
     * @param staffId   담당 직원 ID
     * @param version   낙관적 락을 위한 버전
     */
    void approveCancellation(Long requestId, Long staffId, Integer version);

    /**
     * 고객의 취소 요청을 반려합니다.
     *
     * @param requestId 요청 ID
     * @param staffId   담당 직원 ID
     * @param version   낙관적 락을 위한 버전
     */
    void rejectCancellation(Long requestId, Long staffId, Integer version);
}
