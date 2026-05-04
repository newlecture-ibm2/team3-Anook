package com.anook.backend.request.application.port.in;

import com.anook.backend.request.application.dto.response.GetMyRequestsResult;

import java.util.List;

/**
 * 고객 요청 상태 조회 UseCase
 */
public interface GetMyRequestsUseCase {
    
    /**
     * 방 번호와 투숙객 ID로 모든 요청 목록을 조회합니다. (데이터 격리)
     * 
     * @param roomNo 방 번호
     * @param guestId 투숙객 ID
     * @return 요청 목록
     */
    List<GetMyRequestsResult> getMyRequests(String roomNo, Long guestId);
}
