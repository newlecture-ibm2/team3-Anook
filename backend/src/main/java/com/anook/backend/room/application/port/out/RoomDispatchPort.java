package com.anook.backend.room.application.port.out;

/**
 * Room 모듈 전용 WebSocket 발송 Port (Out)
 *
 * 체크아웃 이벤트 발생 시 해당 객실의 브라우저에
 * 세션 만료 알림을 전송하기 위한 포트입니다.
 *
 * ❌ 다른 모듈(request, message 등)의 DispatchPort를 import하지 않습니다.
 */
public interface RoomDispatchPort {

    /**
     * 특정 객실의 브라우저에 세션 만료 알림을 발송합니다.
     * 채널: /topic/room/{roomNo}
     */
    void dispatchSessionExpired(String roomNo);
}
