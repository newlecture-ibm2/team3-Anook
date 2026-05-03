package com.anook.backend.global.exception;

import org.springframework.http.HttpStatus;

/**
 * 전역 에러 코드 정의
 *
 * 새로운 에러가 필요하면 여기에 enum 값만 추가하면 됩니다.
 */
public enum ErrorCode {

        // ── 404 NOT_FOUND ──
        GUEST_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "투숙객을 찾을 수 없습니다.",
                        "해당 ID의 투숙객이 존재하지 않습니다. 이미 체크아웃(Hard Delete)되었거나, 잘못된 guestId입니다. GET /admin/guests로 현재 투숙객 목록을 확인하세요."),

        ROOM_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "객실을 찾을 수 없습니다.",
                        "해당 ID의 객실이 존재하지 않습니다. GET /admin/rooms로 유효한 객실 목록을 확인하세요."),

        REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "요청을 찾을 수 없습니다.",
                        "해당 ID의 요청이 존재하지 않습니다. 올바른 taskId를 확인하세요."),

        // ── 409 CONFLICT ──
        DUPLICATE_ROOM_NUMBER(HttpStatus.CONFLICT,
                        "이미 존재하는 객실 번호입니다.",
                        "동일한 객실 번호가 이미 등록되어 있습니다. 다른 번호를 사용하세요."),

        ALREADY_CHECKED_IN(HttpStatus.CONFLICT,
                        "해당 객실에 이미 투숙객이 있습니다.",
                        "해당 객실에 이미 투숙 중인 게스트가 있습니다. 기존 투숙객을 체크아웃(DELETE /admin/guests/{id})한 후 다시 시도하세요."),

        UNSETTLED_BILLING(HttpStatus.CONFLICT,
                        "미정산 F&B 내역이 있습니다. 결제를 먼저 완료해주세요.",
                        "해당 객실에 정산되지 않은 F&B 요청이 있습니다. PATCH /admin/tasks/{taskId}/settle로 모든 F&B 요청을 정산한 후 체크아웃하세요."),

        // ── 400 BAD_REQUEST ──
        INVALID_SETTLEMENT(HttpStatus.BAD_REQUEST,
                        "정산할 수 없는 요청입니다.",
                        "정산은 department_id가 'FB'이고 status가 'COMPLETED'인 요청에만 가능합니다. 현재 요청의 상태와 부서를 확인하세요."),

        // ── Admin Settings ──

        DEPARTMENT_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "부서를 찾을 수 없습니다.",
                        "해당 부서 코드가 존재하지 않습니다. 유효한 부서를 선택해주세요."),

        STAFF_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "직원을 찾을 수 없습니다.",
                        "해당 ID의 직원이 존재하지 않습니다. GET /admin/staff로 유효한 직원 목록을 확인하세요."),

        ROLE_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "역할을 찾을 수 없습니다.",
                        "해당 ID의 역할이 존재하지 않습니다. GET /admin/roles로 유효한 역할 목록을 확인하세요."),

        ROLE_ALREADY_EXISTS(HttpStatus.CONFLICT,
                        "이미 존재하는 역할 코드입니다.",
                        "동일한 역할 코드(id)가 이미 등록되어 있습니다. 다른 코드를 사용하세요."),

        // ── PMS ──

        MENU_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "메뉴를 찾을 수 없습니다.",
                        "해당 ID의 메뉴가 존재하지 않습니다. GET /pms/menus로 유효한 메뉴 목록을 확인하세요."),

        RECEIPT_NOT_FOUND(HttpStatus.NOT_FOUND,
                        "영수증을 찾을 수 없습니다.",
                        "해당 ID의 영수증이 존재하지 않습니다."),

        UNPAID_RECEIPTS_EXIST(HttpStatus.CONFLICT,
                        "미결제 룸서비스 내역이 있습니다. 결제를 먼저 완료해주세요.",
                        "해당 객실에 미결제(UNPAID) 룸서비스 영수증이 있습니다. PATCH /pms/receipts/pay-all?roomNo=xxx로 결제 후 체크아웃하세요.");

        private final HttpStatus status;
        private final String message;
        private final String detail;

        ErrorCode(HttpStatus status, String message, String detail) {
                this.status = status;
                this.message = message;
                this.detail = detail;
        }

        public HttpStatus getStatus() {
                return status;
        }

        public String getMessage() {
                return message;
        }

        public String getDetail() {
                return detail;
        }
}
