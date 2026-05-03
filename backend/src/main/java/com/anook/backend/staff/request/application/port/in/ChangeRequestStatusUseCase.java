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
     */
    void acceptRequest(Long requestId, Long staffId);

    /**
     * 요청을 완료 처리합니다.
     * 
     * @param requestId 요청 ID
     * @param staffId   담당 직원 ID
     */
    void completeRequest(Long requestId, Long staffId);
}
