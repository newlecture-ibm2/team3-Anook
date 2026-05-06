package com.anook.backend.staff.request.adapter.in.web;

import com.anook.backend.staff.request.application.port.in.ChangeRequestStatusUseCase;
import com.anook.backend.staff.request.application.port.in.GetStaffRequestsUseCase;
import com.anook.backend.staff.request.adapter.in.web.dto.response.StaffTaskResult;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 직원 전용 요청 상태 변경 컨트롤러
 */
@RestController
@RequestMapping("/staff/requests")
@RequiredArgsConstructor
public class StaffRequestController {

    private final ChangeRequestStatusUseCase changeRequestStatusUseCase;
    private final GetStaffRequestsUseCase getStaffRequestsUseCase;

    @GetMapping
    public ResponseEntity<List<StaffTaskResult>> getStaffRequests(
            @RequestParam(required = false, defaultValue = "ALL") String departmentId,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "ALL") String priority
    ) {
        List<StaffTaskResult> requests = getStaffRequestsUseCase.getRequests(departmentId, status, priority);
        return ResponseEntity.ok(requests);
    }

    @PatchMapping("/{id}/accept")
    public ResponseEntity<String> acceptRequest(@PathVariable Long id, @RequestBody StaffActionDto dto) {
        changeRequestStatusUseCase.acceptRequest(id, dto.staffId(), dto.version());
        return ResponseEntity.ok("요청 수락 및 담당자 배정 완료");
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<String> completeRequest(@PathVariable Long id, @RequestBody StaffActionDto dto) {
        changeRequestStatusUseCase.completeRequest(id, dto.staffId(), dto.version());
        return ResponseEntity.ok("요청 완료 처리 완료");
    }

    @PatchMapping("/{id}/transfer")
    public ResponseEntity<String> transferRequest(@PathVariable Long id, @RequestBody TransferDto dto) {
        changeRequestStatusUseCase.transferRequest(id, dto.staffId(), dto.toDepartmentId(), dto.reason(), dto.version());
        return ResponseEntity.ok("부서 전달 완료");
    }

    public record StaffActionDto(Long staffId, Integer version) {}
    
    public record TransferDto(Long staffId, String toDepartmentId, String reason, Integer version) {}
}
