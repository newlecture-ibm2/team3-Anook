package com.anook.backend.global.exception;

import com.anook.backend.global.dto.ErrorResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 전역 예외 핸들러 — BusinessException 하나만 잡아서 처리
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(BusinessException.class)
        public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
                ErrorCode code = e.getErrorCode();
                return ResponseEntity.status(code.getStatus())
                                .body(ErrorResponse.of(
                                                code.name(),
                                                e.getMessage(),
                                                code.getDetail()));
        }
}
