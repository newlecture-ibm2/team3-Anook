package com.anook.backend.request.adapter.in.web;

import com.anook.backend.global.exception.BusinessException;
import com.anook.backend.global.exception.ErrorCode;
import com.anook.backend.request.application.dto.response.GetMyRequestsResult;
import com.anook.backend.request.application.port.in.GetMyRequestsUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * 투숙객 전용 요청 조회 컨트롤러
 */
@Slf4j
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class GuestRequestController {

    private final GetMyRequestsUseCase getMyRequestsUseCase;

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
