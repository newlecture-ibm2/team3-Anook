package com.anook.backend.request.application.port.in;

/**
 * 고객이 직접 요청을 취소하는 UseCase (Grace Period 내 버튼 클릭)
 *
 * [AN-252] AI 채팅 기반 취소(CancelRequestOnEventService)와는 별도로,
 * 프론트엔드 위젯 카드의 [취소]/[수정] 버튼을 통한 직접 취소를 처리한다.
 */
public interface CancelRequestUseCase {

    /**
     * 고객이 본인의 요청을 직접 취소한다.
     *
     * @param requestId 취소할 요청 ID
     * @param roomNo    JWT에서 추출된 고객 객실 번호 (본인 검증용)
     * @param guestId   JWT에서 추출된 고객 ID (본인 검증용)
     */
    void cancelByGuest(Long requestId, String roomNo, Long guestId);
}
