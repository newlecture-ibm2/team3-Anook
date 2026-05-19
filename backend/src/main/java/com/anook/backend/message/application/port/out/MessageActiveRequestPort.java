package com.anook.backend.message.application.port.out;

import java.util.List;

public interface MessageActiveRequestPort {
    /**
     * 특정 객실의 활성화된(처리 중이거나 대기 중인) 예약/요청 내역 요약을 조회합니다.
     * @param roomNo 객실 번호
     * @return 활성화된 요청 요약 문자열 리스트 (예: ["택시 예약 (오후 3시)"])
     */
    List<String> getActiveRequestSummaries(String roomNo);
}
