package com.anook.backend.admin.request.application.port.out;

public interface AdminRequestDispatchPort {
    void dispatchCancelRejected(String roomNo, Long requestId, String domainCode, String summary);
    void dispatchStaffMessage(String roomNo, Long messageId, String content);
    void dispatchCancelSuccess(String roomNo, Long requestId, String domainCode, String summary);
}
