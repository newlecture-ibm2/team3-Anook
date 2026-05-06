package com.anook.backend.admin.request.application.port.in;

import com.anook.backend.admin.request.application.dto.request.AssignRequestCommand;
import com.anook.backend.admin.request.application.dto.request.ChangeRequestPriorityCommand;
import com.anook.backend.admin.request.application.dto.request.CreateAdminRequestCommand;
import com.anook.backend.admin.request.application.dto.response.AdminRequestDetailResult;
import com.anook.backend.admin.request.application.dto.response.AdminRequestListResult;
import com.anook.backend.admin.request.application.dto.response.AdminRequestStatsResult;

import java.util.List;

/**
 * 관리자 요청 관리 UseCase
 */
public interface ManageAdminRequestUseCase {

    /**
     * 전체 요청 목록 조회 (필터링 + 정렬)
     */
    List<AdminRequestListResult> getAllRequests(String status, String departmentId, String priority, String sort);

    /**
     * 단건 요청 상세 조회
     */
    AdminRequestDetailResult getRequestDetail(Long id);

    /**
     * 담당자 배정/재배정
     */
    void assignRequest(Long id, AssignRequestCommand command);

    /**
     * 우선순위 변경
     */
    void changeRequestPriority(Long id, ChangeRequestPriorityCommand command);

    /**
     * 요청 취소 (관리자 권한)
     */
    void cancelRequest(Long id);

    /**
     * 부서 변경 (관리자 수동 배정)
     */
    void changeDepartment(Long id, String departmentId);

    /**
     * 에스컬레이션 대상 목록 조회 
     */
    List<AdminRequestListResult> getEscalations();

    /**
     * 에스컬레이션 승인 
     */
    void escalateRequest(Long id, String departmentId, String priority);

    /**
     * 관리자 수동 요청 생성
     */
    AdminRequestDetailResult createRequest(CreateAdminRequestCommand command);

    /**
     * 대시보드 통계
     */
    AdminRequestStatsResult getStats();
}
