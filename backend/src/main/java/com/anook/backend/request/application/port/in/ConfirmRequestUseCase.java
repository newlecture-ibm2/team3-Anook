package com.anook.backend.request.application.port.in;

public interface ConfirmRequestUseCase {
    void confirmRequest(Long requestId, String roomNo);
}
