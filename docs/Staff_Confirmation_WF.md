# Staff Confirmation for Cancellation Workflow

직원이 이미 수락한(`IN_PROGRESS`) 업무를 고객이 취소하려고 할 때, **모든 부서에 예외 없이 스태프의 취소 승인(Confirm) 절차를 거치도록** 워크플로우를 고도화합니다. 관리자 대시보드에서 취소 요청을 통합 모니터링하고 오래된 건을 하이라이트합니다.

---

## Proposed Changes

### 1. Database 스키마 마이그레이션

#### [MODIFY] [schema.sql](file:///home/young/workspace/team3-Anook/backend/src/main/resources/schema.sql)
기존 마이그레이션 패턴(`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)을 따라 하단 섹션에 추가:
```sql
-- [2026-05-06] 고객 취소 요청 승인 워크플로우
ALTER TABLE request ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE request ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMP;
```

---

### 2. Backend — Domain 모델

#### [MODIFY] [Request.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/domain/model/Request.java)
- `cancelRequested` (boolean), `cancelRequestedAt` (LocalDateTime) 필드 추가.
- `reconstitute()` 팩토리 메서드 시그니처에 두 파라미터 추가.
- `create()` 에서 `cancelRequested = false` 초기화.
- 행위 메서드 추가:
  - `requestCancellation()` → `cancelRequested = true`, `cancelRequestedAt = now()`
  - `approveCancellation()` → `status = CANCELLED`, `cancelRequested = false`
  - `rejectCancellation()` → `cancelRequested = false`, `cancelRequestedAt = null`
- Getter 추가: `isCancelRequested()`, `getCancelRequestedAt()`

---

### 3. Backend — Adapter (Persistence)

#### [MODIFY] [RequestJpaEntity.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/adapter/out/persistence/RequestJpaEntity.java)
- `cancelRequested` (Boolean), `cancelRequestedAt` (LocalDateTime) 컬럼 매핑 추가.
- `fromDomain()` / `toDomain()` 양방향 매핑에 두 필드 반영.

#### [MODIFY] [AdminRequestJpaEntity.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/admin/request/adapter/out/persistence/entity/AdminRequestJpaEntity.java)
- 동일하게 `cancelRequested`, `cancelRequestedAt` 필드 및 매핑 추가.

---

### 4. Backend — WebSocket 페이로드

#### [MODIFY] [RequestWebSocketPayload.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/application/dto/response/RequestWebSocketPayload.java)
새로운 타입 3개에 대한 정적 팩토리 메서드 추가:
- `cancelRequestReceived(id, domainCode, summary, roomNo)` → type: `CANCEL_REQUEST_RECEIVED`
- `cancelApproved(id, domainCode, summary, roomNo)` → type: `CANCEL_APPROVED`
- `cancelRejected(id, domainCode, summary, roomNo)` → type: `CANCEL_REJECTED`

---

### 5. Backend — Service (비즈니스 로직)

#### [MODIFY] [CancelRequestByGuestService.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/application/service/CancelRequestByGuestService.java)
기존 `cancelByGuest()` 메서드 분기 처리:
1. `PENDING` 상태 → 기존대로 즉시 `CANCELLED` 처리.
2. `IN_PROGRESS` 상태 → `request.requestCancellation()` 호출 후 저장. 스태프/관리자에게 `CANCEL_REQUEST_RECEIVED` WebSocket 알림 발송.

#### [MODIFY] [CancelRequestUseCase.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/application/port/in/CancelRequestUseCase.java)
- `cancelByGuest()` 반환 타입을 `void` → `CancelRequestResult` DTO로 변경.
  - `CancelRequestResult(String result)` — `"CANCELLED"` 또는 `"CANCEL_REQUESTED"`

#### [MODIFY] [GuestRequestController.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/adapter/in/web/GuestRequestController.java)
- 응답 바디를 `CancelRequestResult`로 변경하여 프론트엔드가 즉시 취소 vs 승인 대기를 구분.

---

### 6. Backend — Staff 모듈 (취소 승인/반려)

#### [MODIFY] [ChangeRequestStatusUseCase.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/staff/request/application/port/in/ChangeRequestStatusUseCase.java)
기존 UseCase 인터페이스에 메서드 2개 추가:
- `approveCancellation(Long requestId, Long staffId, Integer version)`
- `rejectCancellation(Long requestId, Long staffId, Integer version)`

#### [MODIFY] ChangeRequestStatusService (구현체)
- `approveCancellation()`: `request.approveCancellation()` 호출 → 저장 → 고객에게 `CANCEL_APPROVED` WS 알림.
- `rejectCancellation()`: `request.rejectCancellation()` 호출 → 저장 → 고객에게 `CANCEL_REJECTED` WS 알림.

#### [MODIFY] [StaffRequestController.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/staff/request/adapter/in/web/StaffRequestController.java)
엔드포인트 2개 추가:
- `PATCH /staff/requests/{id}/approve-cancel`
- `PATCH /staff/requests/{id}/reject-cancel`

---

### 7. Backend — Admin 모듈 (취소 강제 처리)

#### [MODIFY] [ManageAdminRequestUseCase.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/admin/request/application/port/in/ManageAdminRequestUseCase.java)
기존 UseCase 인터페이스에 메서드 2개 추가:
- `approveCancellation(Long id)`
- `rejectCancellation(Long id)`

#### [MODIFY] ManageAdminRequestService (구현체)
- Staff와 동일한 도메인 로직 호출 + WebSocket 알림.

#### [MODIFY] [AdminRequestController.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/admin/request/adapter/in/web/AdminRequestController.java)
엔드포인트 2개 추가:
- `PATCH /admin/requests/{id}/approve-cancel`
- `PATCH /admin/requests/{id}/reject-cancel`

#### [MODIFY] [AdminRequestListResult.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/admin/request/application/dto/response/AdminRequestListResult.java)
- `cancelRequested` (boolean), `cancelRequestedAt` (String) 필드 추가.

---

### 8. Frontend — Guest App (고객 화면)

#### [MODIFY] [useChat.ts](file:///home/young/workspace/team3-Anook/frontend/src/app/guest/chat/useChat.ts)
- WebSocket 핸들러에 `CANCEL_REQUEST_RECEIVED`, `CANCEL_APPROVED`, `CANCEL_REJECTED` 타입 분기 추가.
- `activeRequest`에 `cancelRequested` 상태 반영.

#### [MODIFY] [RequestStatusBar.tsx](file:///home/young/workspace/team3-Anook/frontend/src/app/guest/chat/_components/RequestStatusBar/RequestStatusBar.tsx)
- `cancelRequested === true`일 때 상태 텍스트를 "취소 승인 대기 중..."으로 변경, 주황색 경고 스타일 적용.
- `CANCEL_REJECTED` 수신 시 "처리 중"으로 복구.

---

### 9. Frontend — Staff App (직원 화면)

#### [MODIFY] [useTasks.ts](file:///home/young/workspace/team3-Anook/frontend/src/app/staff/useTasks.ts)
- `StaffTask` 인터페이스에 `cancelRequested` 필드 추가.
- 취소 승인/반려 API 호출 훅 함수 추가 (Co-location 원칙).

#### [MODIFY] TaskCard 컴포넌트
- `cancelRequested === true`인 태스크: 빨간색 뱃지 **[고객 취소 요청됨]** 표시.
- 기존 '완료' 버튼 영역을 **[취소 승인]** + **[취소 거절]** 버튼 2개로 교체.

---

### 10. Frontend — Admin App (관리자 대시보드)

#### [MODIFY] [useAdminRequests.ts](file:///home/young/workspace/team3-Anook/frontend/src/app/admin/useAdminRequests.ts)
- `cancelRequested` 필터링 로직 추가: `cancelPending` 배열 반환.

#### [MODIFY] [AllRequestsPage](file:///home/young/workspace/team3-Anook/frontend/src/app/admin/all-requests/page.tsx)
- **[취소 요청 대기]** 전용 칼럼 신설 → `cancelPending` 카드를 모아서 표시.
- 카드에 `assignedStaffName` 눈에 띄게 노출 (관리자가 해당 직원에게 즉시 컨택 가능).
- **Overdue 하이라이트**: `cancelRequestedAt` 기준 3분 경과 시 카드 붉은색 Pulse Animation.
- 카드에서 직접 **[강제 승인]** / **[강제 반려]** 버튼 제공.

---

## Verification Plan

1. 고객이 `PENDING` 상태에서 취소 → 즉시 `CANCELLED` 확인.
2. 고객이 `IN_PROGRESS` 상태에서 취소 → REST 응답 `"CANCEL_REQUESTED"` 확인, 상태바 "취소 승인 대기 중..." 표시 확인.
3. 스태프 앱에서 `CANCEL_REQUEST_RECEIVED` WebSocket 수신 및 뱃지 표시 확인.
4. 스태프가 [취소 승인] → 고객 화면 `CANCELLED`로 전환 확인.
5. 스태프가 [취소 거절] → 고객 화면 "처리 중"으로 복구 확인.
6. 어드민 대시보드 [취소 요청 대기] 칼럼에 카드 렌더링 및 오래된 건 하이라이트 확인.
7. Backend `gradlew build` 및 Frontend `npm run lint` 통과 확인.
