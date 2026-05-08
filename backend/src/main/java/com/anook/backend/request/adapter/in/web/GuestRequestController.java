package com.anook.backend.request.adapter.in.web;

import com.anook.backend.global.exception.BusinessException;
import com.anook.backend.global.exception.ErrorCode;
import com.anook.backend.request.application.dto.response.GetMyRequestsResult;
import com.anook.backend.request.application.port.in.CancelRequestUseCase;
import com.anook.backend.request.application.port.in.ConfirmRequestUseCase;
import com.anook.backend.request.application.port.in.GetMyRequestsUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * 투숙객 전용 요청 컨트롤러
 *
 * [AN-252] 요청 취소 엔드포인트 추가:
 *   - POST /chat/{roomNo}/requests/{requestId}/cancel
 *   - JWT에서 guestId + roomNo를 추출하여 본인 검증 수행
 */
@Slf4j
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class GuestRequestController {

    private final GetMyRequestsUseCase getMyRequestsUseCase;
    private final CancelRequestUseCase cancelRequestUseCase;
    private final ConfirmRequestUseCase confirmRequestUseCase;

    /**
     * 내 요청 목록 조회
     */
    @GetMapping("/{roomNo}/requests")
    public ResponseEntity<List<GetMyRequestsResult>> getMyRequests(
            @PathVariable String roomNo,
            Principal principal
    ) {
        validateRoomNo(principal, roomNo);
        Long guestId = Long.parseLong(principal.getName());
        List<GetMyRequestsResult> results = getMyRequestsUseCase.getMyRequests(roomNo, guestId);
        return ResponseEntity.ok(results);
    }

    /**
     * [AN-252] 요청 직접 취소 (Grace Period 내 버튼 클릭)
     *
     * 프론트엔드 위젯 카드의 [취소] 또는 [수정] 버튼 클릭 시 호출된다.
     * - [취소] 버튼: 요청을 CANCELLED로 변경
     * - [수정] 버튼: 요청을 CANCELLED로 변경 + 프론트엔드가 채팅 입력창에 포커스 (프론트 로직)
     */
    @PostMapping("/{roomNo}/requests/{requestId}/cancel")
    public ResponseEntity<Map<String, String>> cancelRequest(
            @PathVariable String roomNo,
            @PathVariable Long requestId,
            Principal principal
    ) {
        validateRoomNo(principal, roomNo);
        Long guestId = Long.parseLong(principal.getName());

        log.info("[GuestRequestController] 취소 요청 수신 — roomNo: {}, requestId: {}, guestId: {}", roomNo, requestId, guestId);

        cancelRequestUseCase.cancelByGuest(requestId, roomNo, guestId);

        return ResponseEntity.ok(Map.of("message", "요청이 취소되었습니다."));
    }

    /**
     * [수락하기] 빠른 등록
     */
    @PostMapping("/{roomNo}/requests/{requestId}/confirm")
    public ResponseEntity<Map<String, String>> confirmRequest(
            @PathVariable String roomNo,
            @PathVariable Long requestId,
            Principal principal
    ) {
        validateRoomNo(principal, roomNo);
        Long guestId = Long.parseLong(principal.getName());

        log.info("[GuestRequestController] 수락 요청 수신 — roomNo: {}, requestId: {}, guestId: {}", roomNo, requestId, guestId);

        confirmRequestUseCase.confirmRequest(requestId, roomNo);

        return ResponseEntity.ok(Map.of("message", "요청이 즉시 접수되었습니다."));
    }

    /**
     * URL의 roomNo와 토큰의 roomNo 클레임이 일치하는지 검증 (격리 보안)
     */
    private void validateRoomNo(Principal principal, String roomNo) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            Object details = auth.getDetails();
            if (details instanceof Map<?, ?> claims) {
                String tokenRoomNo = (String) claims.get("roomNo");
                if (tokenRoomNo != null && !tokenRoomNo.equals(roomNo)) {
                    log.warn("접근 거부: URL roomNo({}) != Token roomNo({})", roomNo, tokenRoomNo);
                    throw new BusinessException(ErrorCode.ACCESS_DENIED);
                }
            }
        }
    }
}
