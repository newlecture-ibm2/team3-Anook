package com.anook.backend.admin.request.adapter.in.web;

import com.anook.backend.admin.request.application.dto.request.AssignRequestCommand;
import com.anook.backend.admin.request.application.dto.request.ChangeRequestPriorityCommand;
import com.anook.backend.admin.request.application.dto.request.CreateAdminRequestCommand;
import com.anook.backend.admin.request.application.dto.response.AdminRequestDetailResult;
import com.anook.backend.admin.request.application.dto.response.AdminRequestListResult;
import com.anook.backend.admin.request.application.dto.response.AdminRequestStatsResult;
import com.anook.backend.admin.request.application.port.in.ManageAdminRequestUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * 관리자 요청 관리 Controller
 *
 * 전체 요청 모니터링, 담당자 배정, 우선순위 변경, 취소 기능을 제공합니다.
 */
@RestController
@RequestMapping("/admin/requests")
@RequiredArgsConstructor
public class AdminRequestController {

    private final ManageAdminRequestUseCase manageAdminRequestUseCase;

    /**
     * 전체 요청 목록 조회 (필터링 + 정렬)
     *
     * GET
     * /admin/requests?status=PENDING&dept=HK&priority=URGENT&sort=created_at_desc
     */
    @GetMapping
    public ResponseEntity<List<AdminRequestListResult>> getAllRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dept,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) List<String> exclude,
            @RequestParam(required = false, defaultValue = "created_at_desc") String sort) {
        return ResponseEntity.ok(manageAdminRequestUseCase.getAllRequests(status, dept, priority, exclude, sort));
    }

    /**
     * 요청 상세 조회
     *
     * GET /admin/requests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminRequestDetailResult> getRequestDetail(@PathVariable Long id) {
        return ResponseEntity.ok(manageAdminRequestUseCase.getRequestDetail(id));
    }

    /**
     * 담당자 배정/재배정
     *
     * PATCH /admin/requests/{id}/assign
     */
    @PatchMapping("/{id}/assign")
    public ResponseEntity<Void> assignRequest(
            @PathVariable Long id,
            @Valid @RequestBody AssignRequestCommand command) {
        manageAdminRequestUseCase.assignRequest(id, command);
        return ResponseEntity.noContent().build();
    }

    /**
     * 상태 변경 (프론트데스크 상담 라이프사이클 처리용)
     *
     * PATCH /admin/requests/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> changeStatus(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        manageAdminRequestUseCase.changeStatus(id, status);
        return ResponseEntity.noContent().build();
    }

    /**
     * 우선순위 변경
     *
     * PATCH /admin/requests/{id}/priority
     */
    @PatchMapping("/{id}/priority")
    public ResponseEntity<Void> changeRequestPriority(
            @PathVariable Long id,
            @Valid @RequestBody ChangeRequestPriorityCommand command) {
        manageAdminRequestUseCase.changeRequestPriority(id, command);
        return ResponseEntity.noContent().build();
    }

    /**
     * 요청 취소
     *
     * PATCH /admin/requests/{id}/cancel
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelRequest(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("rejectionReason") : null;
        manageAdminRequestUseCase.cancelRequest(id, reason);
        return ResponseEntity.noContent().build();
    }

    /**
     * 취소 요청 승인
     *
     * PATCH /admin/requests/{id}/cancellation/approve
     */
    @PatchMapping("/{id}/cancellation/approve")
    public ResponseEntity<Void> approveCancellation(@PathVariable Long id) {
        manageAdminRequestUseCase.approveCancellation(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * 취소 요청 반려
     *
     * PATCH /admin/requests/{id}/cancellation/reject
     */
    @PatchMapping("/{id}/cancellation/reject")
    public ResponseEntity<Void> rejectCancellation(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("rejectionReason") : null;
        manageAdminRequestUseCase.rejectCancellation(id, reason);
        return ResponseEntity.noContent().build();
    }

    /**
     * 부서 변경 (관리자 수동 배정)
     *
     * PATCH /admin/requests/{id}/department
     */
    @PatchMapping("/{id}/department")
    public ResponseEntity<Void> changeDepartment(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String departmentId = body.get("departmentId");
        if (departmentId == null || departmentId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String summary = body.get("summary");
        String description = body.get("description");
        manageAdminRequestUseCase.changeDepartment(id, departmentId, summary, description);
        return ResponseEntity.noContent().build();
    }

    /**
     * 요약(제목) 및 설명 변경
     *
     * PATCH /admin/requests/{id}/summary
     */
    @PatchMapping("/{id}/summary")
    public ResponseEntity<Void> updateSummary(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String summary = body.get("summary");
        String description = body.get("description");
        if (summary == null || summary.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        manageAdminRequestUseCase.updateSummary(id, summary, description);
        return ResponseEntity.noContent().build();
    }

    /**
     * 직원 이관 요청 — 부서 변경 + ESCALATED 상태 전환 (관리자 승인 대기)
     *
     * PATCH /admin/requests/{id}/request-escalation
     */
    @PatchMapping("/{id}/request-escalation")
    public ResponseEntity<Void> requestEscalation(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String targetDepartmentId = body.get("departmentId");
        if (targetDepartmentId == null || targetDepartmentId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        manageAdminRequestUseCase.requestEscalation(id, targetDepartmentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 에스컬레이션 대기열 조회
     *
     * GET /admin/requests/escalations
     */
    @GetMapping("/escalations")
    public ResponseEntity<List<AdminRequestListResult>> getEscalations() {
        return ResponseEntity.ok(manageAdminRequestUseCase.getEscalations());
    }

    /**
     * 에스컬레이션 승인 — URGENT로 올리고 재배정 대기
     *
     * PATCH /admin/requests/{id}/escalate
     */
    @PatchMapping("/{id}/escalate")
    public ResponseEntity<Void> escalateRequest(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String departmentId = body.get("departmentId");
        String priority = body.get("priority");
        if (departmentId == null || departmentId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        manageAdminRequestUseCase.escalateRequest(id, departmentId, priority);
        return ResponseEntity.noContent().build();
    }

    /**
     * 관리자 수동 요청 생성
     *
     * POST /admin/requests
     */
    @PostMapping
    public ResponseEntity<AdminRequestDetailResult> createRequest(
            @Valid @RequestBody CreateAdminRequestCommand command) {
        AdminRequestDetailResult result = manageAdminRequestUseCase.createRequest(command);
        return ResponseEntity.created(URI.create("/admin/requests/" + result.id())).body(result);
    }

    /**
     * 대시보드 통계
     *
     * GET /admin/requests/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<AdminRequestStatsResult> getStats() {
        return ResponseEntity.ok(manageAdminRequestUseCase.getStats());
    }
}
