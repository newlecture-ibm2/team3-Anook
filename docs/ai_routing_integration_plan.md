# AI 라우팅 대시보드 연동 계획서 (AN-256 확장)

## 목적
기존에 비동기 저장으로 구현된 AI 호출 로그(`ai_log` 테이블) 데이터를 프론트엔드의 관리자 대시보드(`/admin/ai-routing` 페이지)에 시각화하여, 관리자가 실시간으로 AI 응답 성능과 비용(토큰)을 모니터링할 수 있게 한다.

---

## 1. 데이터 매핑 (DB ↔ 프론트엔드 UI)

현재 DB의 `ai_log` 테이블 스펙은 프론트엔드의 요구사항과 **1:1 매칭**되므로 추가적인 컬럼 확장이 필요하지 않다.

### 📊 상단 Summary Card (요약 지표)
| 프론트엔드 UI | DB `ai_log` 활용 방안 |
| :--- | :--- |
| **평균 응답 속도** | 전체 데이터의 `AVG(latency_ms)` 계산 |
| **누적 소모 토큰** | 전체 데이터의 `SUM(prompt_tokens + completion_tokens)` 계산 |
| **AI 라우팅 성공률** | `is_fallback = false` 인 건수의 비율(%) 계산 (`is_fallback = true` 비율은 Fallback % 로 표시) |

### 📝 하단 Table (세부 접속 로그)
| 프론트엔드 UI | DB `ai_log` 활용 방안 | 비고 |
| :--- | :--- | :--- |
| **시간** | `created_at` | YYYY.MM.DD HH:mm:ss 포맷 변환 |
| **요청 미리보기** | `raw_prompt` | 프론트에서 50자 내외로 자름 (말줄임표 처리) |
| **총 토큰** | `prompt_tokens + completion_tokens` | 합산하여 표시 |
| **지연시간** | `latency_ms` | 3000ms 이상일 경우 UI에 빨간색 `SLOW` 뱃지 조건부 렌더링 |
| **상세 보기 (모달)** | `model_name`, `raw_prompt`, `raw_response` | 상세 모달에서 전체 프롬프트 및 응답 확인 가능 |

---

## 2. 개발 Action Plan

현재 백엔드에는 저장(Save) 로직만 존재하므로, 조회를 위한 Controller와 UseCase를 추가하고 프론트엔드에서 연동하는 작업이 필요하다.

### 📌 [Backend] 조회 API 개발
`com.anook.backend.ailog` 모듈 내에 관리자 전용 조회 로직 추가.

1. **`AdminAiLogController` 생성** (경로: `/admin/ai-logs`)
2. **Summary API (`GET /admin/ai-logs/summary`)**
   - 역할: 평균 지연 시간, 총 소모 토큰, 라우팅 성공률(%) 등 집계 데이터 반환
3. **List API (`GET /admin/ai-logs`)**
   - 역할: 페이징(`Pageable`)이 적용된 AI 상세 로그 리스트 반환 (최신순 정렬)

### 📌 [Frontend] 데이터 연동
기존 하드코딩된 `/admin/ai-routing` 페이지를 BFF 및 Custom Hook 방식으로 변경.

1. **`useAiLogs.ts` 훅 생성**
   - BFF API (`/api/admin/ai-logs`)를 호출하여 상태(상단 요약 데이터, 테이블 리스트 데이터, loading, error 등) 관리.
2. **`page.tsx` 수정**
   - 하드코딩된 `SummaryCard`와 `Table` 데이터를 `useAiLogs`에서 받아온 동적 데이터로 교체.
3. **`LogDataModal.tsx` 연결**
   - 테이블에서 [상세 보기] 버튼 클릭 시 해당 Row의 상세 데이터(전체 프롬프트 및 응답)를 모달에 Props로 전달하여 표시.
