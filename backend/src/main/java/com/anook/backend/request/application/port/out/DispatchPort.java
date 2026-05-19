package com.anook.backend.request.application.port.out;

import com.anook.backend.request.application.dto.response.RequestWebSocketPayload;

/**
 * WebSocket 메시지 발송을 위한 Out Port
 */
public interface DispatchPort {
    
    /**
     * 특정 객실의 고객에게 알림을 발송합니다. (/topic/room/{roomNo})
     */
    void dispatchToRoom(String roomNo, RequestWebSocketPayload payload);

    /**
     * 특정 부서의 직원에게 알림을 발송합니다. (/topic/dept/{deptCode})
     */
    void dispatchToDepartment(String deptCode, RequestWebSocketPayload payload);

    /**
     * 전체 관리자에게 알림을 발송합니다. (/topic/frontdesk)
     */
    void dispatchToFrontdesk(RequestWebSocketPayload payload);
}
