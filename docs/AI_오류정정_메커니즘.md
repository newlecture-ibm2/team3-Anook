# AI 오류 정정 및 요청 수정 메커니즘

AI는 100% 완벽하지 않습니다. 고객이 AI의 처리 결과를 보고 **"틀렸어!"** 또는 **"수량 바꿔줘"**라고 할 때를 대비한 안전장치와, 이를 뒷받침하는 워크플로우 구조를 설계했습니다.

---

## 0. 요청 워크플로우 간소화 (ASSIGNED 제거) ✅ 구현 완료

> 기존 4단계를 3단계로 통합하여 직원과 고객 모두의 인터랙션을 단순화

### Before (4단계)
```
PENDING → ASSIGNED → IN_PROGRESS → COMPLETED
대기 중    배정 완료    처리 중        처리 완료
```

### After (3단계)
```
PENDING → IN_PROGRESS → COMPLETED
대기 중    처리 중        처리 완료
```

### 왜 ASSIGNED를 제거했는가?

호텔 운영 현장에서 직원이 업무를 **수락하는 행위 = 바로 처리를 시작**하는 것과 같습니다. "배정은 받았지만 아직 시작 안 한" 상태는 실질적으로 의미가 없으므로, **수락 즉시 처리 중(IN_PROGRESS)**으로 전환하여 고객에게 즉각적인 피드백을 제공합니다.

### 취소 정책 변경

| 요청 상태 | 고객 취소 |
|---|---|
| PENDING (대기 중) | ✅ 즉시 취소 가능 |
| IN_PROGRESS (처리 중) | ❌ 직원 승인 필요 (Staff Confirmation) |
| COMPLETED (완료) | ❌ 취소 불가 |

### 영향 범위
- Backend: `RequestStatus` Enum, `Request.java` 상태 전이, `AdminRequestJpaEntity`
- Frontend: Guest 상태바(3단계 마커), Admin/Staff 대시보드 필터 전부 정리
- DB: `data.sql` 시드 데이터 ASSIGNED → IN_PROGRESS 변경

---

## 1. Grace Period (10초 유예 시간) ✅ 구현 완료

> Gmail의 '보내기 취소'처럼, 요청 접수 후 10초간 직원 알림을 지연시키는 패턴

### 흐름

```
고객: "수건 2장 줘"
  → AI 분석 → [수건 2장] 위젯 카드 렌더링
  → 카드 하단에 10초 카운트다운 + [수정] [취소] 버튼 활성화
  → 10초 경과 → 버튼 사라짐 → 직원 태블릿에 알림 발송
```

### 핵심 로직

| 구분 | 처리 |
|---|---|
| 일반 요청 | DB 저장(PENDING) → 10초 Delay Queue 대기 → 직원 알림 |
| URGENT 요청 | DB 저장(PENDING) → **즉시** 직원 알림 (10초 스킵) |
| 10초 내 취소 | PENDING → CANCELLED 즉시 전환, 직원 알림 발송 안 됨 |

### 구현 파일
- `GracePeriodScheduler.java` — 비동기 지연 큐
- `CreateRequestOnEventService.java` — URGENT 분기 처리
- `RequestCard.tsx` — 카운트다운 타이머 + 버튼 UI

---

## 2. Cancel & Replace (대화형 수정) ✅ 구현 완료

> Grace Period 이전/이후 관계없이, 채팅으로 "3장으로 바꿔줘"라고 하면 기존 요청을 취소하고 새 요청을 자동 생성하는 패턴

### 흐름

```
고객: "수건 2장 줘"      → 요청 #1 생성 (PENDING, HK, 수건 2장)
고객: "아니 3장으로 줘"   → 요청 #1 자동 취소(CANCELLED)
                         → 요청 #2 생성 (PENDING, HK, 수건 3장)
```

### 핵심 로직

- AI 라우터가 과거 대화 5개(`chat_history`)를 기억하므로 수정 의도를 새 TASK로 자연 감지
- 새 요청 생성 직전, **같은 객실 + 같은 게스트 + 같은 부서**의 PENDING 요청을 DB에서 조회
- 기존 PENDING 요청이 있으면 → CANCELLED로 변경 + WebSocket으로 고객 카드 취소 반영
- 그 다음 새 요청 INSERT → 새 위젯 카드 렌더링

### 왜 UPDATE가 아니라 Cancel & Replace?

| 방식 | 문제점 |
|---|---|
| ❌ 기존 요청을 UPDATE | 동시성 이슈, 부서 변경 시 FK 충돌, 이력 추적 불가 |
| ✅ 기존 취소 + 새로 INSERT | 데이터 무결성 보장, 이력 추적 가능, 구현 단순 |

### 구현 파일
- `CreateRequestOnEventService.java` — `cancelExistingPendingRequests()` 메서드
- `RequestRepositoryPort.java` — `findPendingByRoomNoAndGuestIdAndDepartmentId()`

---

## 3. Staff Confirmation (직원 승인 후 취소) 🔜 구현 예정

> 직원이 이미 수락하여 처리 중(IN_PROGRESS)인 요청을, 고객이 취소하려 할 때 직원의 승인을 거치는 패턴

### 흐름

```
고객: "수건 취소할게요"
  → 요청 상태가 PENDING? → 즉시 취소 (기존 로직)
  → 요청 상태가 IN_PROGRESS? → cancelRequested = true
    → 직원 태블릿: [고객 취소 요청됨] 뱃지 + [승인] [거절] 버튼
    → 관리자 대시보드: 취소 요청 전용 칼럼 (오래된 건 하이라이트)
    → 직원이 [승인] → CANCELLED + 고객에게 알림
    → 직원이 [거절] → cancelRequested 해제 + 고객에게 "취소 불가" 안내
```

### 왜 필요한가?

직원이 이미 수건을 들고 출발한 상태에서 고객이 마음대로 취소하면, 직원은 헛걸음을 합니다. 이를 방지하기 위해 **직원이 "네, 아직 안 갔어요. 취소 OK" 또는 "아뇨, 이미 출발했습니다"를 직접 결정**하도록 합니다.

### 상세 설계
→ [Staff_Confirmation_WF.md](./Staff_Confirmation_WF.md) 참조

---

## 전체 취소/수정 정책 요약

```
┌─────────────────────────────────────────────────────────┐
│                    고객이 취소/수정 시도                    │
├──────────┬──────────────────────────────────────────────┤
│ 요청 상태  │ 처리 방식                                     │
├──────────┼──────────────────────────────────────────────┤
│ PENDING  │ ① Grace Period 내(10초): 즉시 취소, 조용히 사라짐 │
│ (대기 중)  │ ② Grace Period 후: 즉시 취소 + 직원에게 취소 알림  │
│          │ ③ 대화형 수정: Cancel & Replace 자동 처리         │
├──────────┼──────────────────────────────────────────────┤
│IN_PROGRESS│ 고객 단독 취소 불가 → 직원 승인 필요              │
│ (처리 중)  │ (Staff Confirmation 워크플로우)                 │
├──────────┼──────────────────────────────────────────────┤
│COMPLETED │ 취소 불가 (이미 완료)                            │
└──────────┴──────────────────────────────────────────────┘
```
