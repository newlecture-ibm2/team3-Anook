# Admin → Front Desk 역할 리네이밍 리팩토링 (확정)

사용자 피드백에 따라 시스템의 "관리자(Admin)" 역할을 실제 비즈니스 도메인에 맞게 **"프론트 데스크(Front Desk)"**로 변경합니다.
모든 네이밍 규칙은 직관적이고 표준적인 `front-desk`(URL/라우트), `frontdesk`(Java 패키지명), `FRONT_DESK`(상수/권한)를 따릅니다.

## Proposed Changes

### Phase 1: Backend — DB & Security 기반 변경

#### [MODIFY] `schema.sql`
- `is_admin BOOLEAN` → `is_front_desk BOOLEAN`으로 컬럼명 변경
- 마이그레이션 ALTER 구문 추가: `ALTER TABLE department RENAME COLUMN is_admin TO is_front_desk;`

#### [MODIFY] `data.sql`
- `is_admin = EXCLUDED.is_admin` → `is_front_desk = EXCLUDED.is_front_desk`
- 시드 INSERT 구문의 컬럼명 반영 (`FRONT` 부서 `is_front_desk=TRUE`)

#### [MODIFY] `DepartmentJpaEntity.java` & `Department` 도메인
- `@Column(name = "is_admin")` → `@Column(name = "is_front_desk")`
- `private boolean isAdmin;` → `private boolean isFrontDesk;`

#### [MODIFY] Security 관련 설정
- `StaffAuthService.java`: `staff.getDepartment().isAdmin() ? "ADMIN" : "STAFF"` → `staff.getDepartment().isFrontDesk() ? "FRONT_DESK" : "STAFF"`
- `JwtAuthFilter.java`: `"ADMIN".equals(role)` → `"FRONT_DESK".equals(role)`
- `SecurityConfig.java`: 
  - `ROLE_ADMIN > ROLE_STAFF` → `ROLE_FRONT_DESK > ROLE_STAFF`
  - `.requestMatchers("/admin/**").hasRole("ADMIN")` → `.requestMatchers("/front-desk/**").hasRole("FRONT_DESK")`
- `LoginResponse.java`: 주석 업데이트

---

### Phase 2: Backend — `admin` 패키지 → `frontdesk` 패키지 이동

기존 `com.anook.backend.admin/` 하위 모듈 전체를 `com.anook.backend.frontdesk/`로 이동합니다.

| 기존 경로 | 변경 경로 |
|---|---|
| `admin/request/` | `frontdesk/request/` |
| `admin/handover/` | `frontdesk/handover/` |
| `admin/emergency/` | `frontdesk/emergency/` |
| `admin/staff/` | `frontdesk/staff/` |
| `admin/role/` | `frontdesk/role/` |
| `admin/message/` | `frontdesk/message/` |
| `admin/department/` | `frontdesk/department/` |

**주요 클래스 리네이밍 및 API 경로 변경:**
- `Admin*` 접두사가 붙은 클래스를 `FrontDesk*`로 변경
- 컨트롤러 `@RequestMapping("/admin/...")` → `@RequestMapping("/front-desk/...")`

---

### Phase 3: Backend — `admin` 모듈 외부 참조 파일 수정

- `AdminTaskSettleController.java` → `FrontDeskTaskSettleController.java` (`/front-desk/tasks`)
- `AdminAiLogController.java` → `FrontDeskAiLogController.java` (`/front-desk/ai-logs`)
- `AdminKnowledgeController.java` → `FrontDeskKnowledgeController.java` (`/front-desk/knowledge`)
- WebSocket 채널 통지 로직: `/topic/admin` → `/topic/front-desk`
  - `RequestWebSocketDispatchAdapter`, `MessageWebSocketDispatchAdapter`, `WebSocketConfig`, `WebSocketTestController`

---

### Phase 4: Frontend — 라우트 구조 변경

`app/admin/` 디렉토리를 `app/front-desk/`로 일괄 이동합니다.

| 기존 라우트 | 변경 라우트 |
|---|---|
| `/admin/dashboard` | `/front-desk/dashboard` |
| `/admin/front-desk` | `/front-desk/requests` (내부 충돌 방지를 위해 이름 변경) |
| `/admin/...` | `/front-desk/...` |

- `useAdminRequests.ts` → `useFrontDeskRequests.ts`
- `useAdminStats.ts` → `useFrontDeskStats.ts`
- `layout.tsx`: `AdminLayout` → `FrontDeskLayout` (역할 검증 속성 포함)

---

### Phase 5: Frontend — BFF API 라우트 변경

`api/admin/` 디렉토리를 `api/front-desk/`로 일괄 이동합니다.
내부 fetch URL(`BACKEND_URL/admin/...`)을 `BACKEND_URL/front-desk/...`로 수정합니다.

---

### Phase 6: Frontend — Middleware, Layout, i18n

- `middleware.ts`: 권한 체크 로직 및 리다이렉트 경로 변경 (`ADMIN` → `FRONT_DESK`)
- `useLoginForm.ts`: 로그인 성공 후 라우팅 로직 변경
- `Sidebar.tsx`, `DashboardLayout.tsx`: 사이드바 메뉴 링크 및 권한 설정 업데이트
- `GlobalEmergencyListener.tsx`: 알림 클릭 시 리다이렉트 경로 변경, WebSocket 채널 구독 변경
- `ko.json`, `en.json`: "관리자" → "프론트 데스크" 텍스트 수정
- 앱 전반의 `/api/admin/...` fetch 요청을 `/api/front-desk/...`로 일괄 수정
- 앱 전반의 `/topic/admin` WebSocket 구독을 `/topic/front-desk`로 수정

---

## Verification Plan

### Automated Tests
1. **빌드 검증**: `backend`, `frontend` 모두 정상 컴파일/빌드
2. **단위/통합 테스트**: 기존 테스트 코드 통과 여부 확인

### Manual Verification
1. 프론트 데스크(기존 관리자) 계정으로 로그인 정상 작동
2. 모든 프론트 데스크 라우트(`front-desk/*`) 접근 및 렌더링 확인
3. 요청 생성, 상태 변경, 에스컬레이션 등 주요 API 통신 확인
4. WebSocket 통신(긴급 알림 등) 정상 수신 확인
5. 직원(Staff) 계정으로 접근 통제(403) 정상 작동 여부 확인
