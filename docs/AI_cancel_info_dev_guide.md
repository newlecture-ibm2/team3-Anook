# 라우터 INFO / CANCEL 모드 추가 및 취소 기능 구현

라우터에 두 가지 새로운 모드를 추가하여 AI 채팅의 완성도를 높입니다.

1. **INFO 모드** — 고객이 정보를 질문할 때 ("슬리퍼 있어요?", "조식 몇시에요?") RAG 지식으로 답변만 하고 요청을 생성하지 않습니다.
2. **CANCEL 모드** — 고객이 요청 취소 의도를 표현할 때 ("취소할래요", "방금 거 없던 걸로") 가장 최근 요청을 자동 취소합니다.

## User Review Required

> [!IMPORTANT]
> **MessageAiResult에 `action` 필드 추가** — 기존 record에 필드를 하나 추가합니다. `null`이면 기존 동작과 동일하고, `"CANCEL_REQUEST"`일 때만 취소 로직이 실행됩니다. 기존 코드에 side-effect 없습니다.

> [!IMPORTANT]
> **취소 대상 선택 기준** — 해당 객실+투숙객의 가장 최근 `PENDING` 또는 `ASSIGNED` 상태의 요청을 1건 취소합니다. `IN_PROGRESS` 이상은 이미 처리 중이므로 취소 불가로 안내합니다. 이 기준이 괜찮은지 확인 부탁드립니다.

---

## Proposed Changes

### AI 서버 (Python) — 라우터에 INFO / CANCEL 모드 추가

#### [MODIFY] [router_prompt.py](file:///home/young/workspace/team3-Anook/ai/app/prompts/router_prompt.py)

> `router_prompt.py`는 수정 금지 목록에 포함되지 않습니다. (`router_engine.py`만 금지)

라우터의 mode 분류에 `INFO`와 `CANCEL`을 추가합니다. Gemini가 자연어를 분석하여 의도를 감지합니다.

```diff
  ■ STEP 1: Determine the Mode
  - "TASK"          : Specific actionable requests that require staff intervention or system processing.
  - "CHITCHAT"      : Casual conversation, greetings, weather, or gratitude (not actionable).
  - "CLARIFICATION" : Looks like a request, but too ambiguous to process without asking for more details.
+ - "INFO"          : The guest is asking a factual/informational question, NOT requesting an action.
+                     They want to know something (operating hours, availability, policies, amenities in room, etc.)
+                     Examples: "슬리퍼 있어요?", "조식 몇시에요?", "와이파이 비번이 뭐에요?", "수건 몇 장까지 가능해요?"
+ - "CANCEL"        : The guest wants to cancel or withdraw a previously made request.
+                     Examples: "취소할래요", "아까 거 안 할래요", "됐어요", "never mind", "방금 요청 없던 걸로"
```

STEP 2에 도메인 배정 조건도 수정:
```diff
  ■ STEP 2: Assign a Domain (Only if mode is "TASK")
+ For "INFO" mode, also assign a domain so the system can search the correct knowledge base.
```

JSON 출력 포맷의 mode 변경:
```diff
- "mode": "TASK | CHITCHAT | CLARIFICATION",
+ "mode": "TASK | CHITCHAT | CLARIFICATION | INFO | CANCEL",
```

Constraints 섹션에 규칙 추가:
```diff
- If mode is "CHITCHAT" or "CLARIFICATION", the domain MUST be `null`.
+ If mode is "CHITCHAT", "CLARIFICATION", or "CANCEL", the domain MUST be `null`.
+ If mode is "INFO", assign the relevant domain so the system can search the correct RAG knowledge base.
```

---

#### [MODIFY] [analyze.py](file:///home/young/workspace/team3-Anook/ai/app/api/analyze.py)

라우터가 `mode: "INFO"` 또는 `mode: "CANCEL"`을 반환할 때 각각 처리합니다.

**INFO 모드 처리** — RAG 검색 후 답변만 반환, `domain_code: None` (요청 미생성):

```diff
+ # ──────────────────────────────────────────────
+ # STEP 3-d: INFO → RAG 지식 기반 답변 (요청 미생성)
+ # ──────────────────────────────────────────────
+ if primary.mode == "INFO":
+     domain = primary.domain or "FRONT"
+     rag_results = search_similar(request.text, domain_code=domain, top_k=3, threshold=0.5)
+     if rag_results:
+         knowledge = "\n".join([f"Q: {r['question']}\nA: {r['answer']}" for r in rag_results])
+         # Gemini를 호출하여 RAG 지식을 기반으로 자연스러운 답변 생성
+         info_prompt = f"""고객 질문: {request.text}
+
+ 아래 호텔 지식을 참고하여 한국어로 친절하게 답변해주세요.
+ {knowledge}
+
+ 답변만 출력하세요. JSON 형식이 아닌 자연스러운 문장으로."""
+         raw = call_gemini(prompt=info_prompt, system_instruction="You are a helpful hotel concierge.")
+         guest_reply = raw if isinstance(raw, str) else str(raw)
+     else:
+         guest_reply = "죄송합니다, 해당 정보를 찾지 못했습니다. 프론트 데스크(내선 0번)로 문의해 주세요."
+
+     return {
+         "guest_reply": guest_reply,
+         "summary": "정보 문의",
+         "domain_code": None,  # ← 요청 미생성
+         "priority": "NORMAL",
+         "entities": {},
+         "confidence": primary.confidence,
+     }
```

**CANCEL 모드 처리** — `action: "CANCEL_REQUEST"` 반환:

```diff
+ # ──────────────────────────────────────────────
+ # STEP 3-e: CANCEL → 요청 취소
+ # ──────────────────────────────────────────────
+ if primary.mode == "CANCEL":
+     return {
+         "guest_reply": "네, 가장 최근 요청을 취소 처리하겠습니다.",
+         "summary": "요청 취소",
+         "domain_code": None,
+         "priority": "NORMAL",
+         "entities": {},
+         "confidence": primary.confidence,
+         "action": "CANCEL_REQUEST",
+     }
```

---

### 백엔드 (Java) — 취소 처리 파이프라인

#### [MODIFY] [MessageAiResult.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/application/port/out/MessageAiResult.java)

AI 응답 DTO에 `action` 필드를 추가합니다.

```diff
  public record MessageAiResult(
      String guestReply,
      String summary,
      String domainCode,
      String priority,
      Map<String, Object> entities,
-     double confidence
+     double confidence,
+     /** AI가 지시하는 특수 액션 (예: "CANCEL_REQUEST"). null이면 일반 흐름 */
+     String action
  ) {}
```

---

#### [MODIFY] [PythonAiHttpAdapter.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/adapter/out/ai/PythonAiHttpAdapter.java)

AI 서버 응답에서 `action` 필드를 파싱합니다.

```diff
+ String action = (String) response.get("action");
  return new MessageAiResult(guestReply, summary, domainCode,
-     priority, entities, confidence);
+     priority, entities, confidence, action);
```

`fallbackResult()`와 `MockAiAdapter`에도 `action: null` 추가.

---

#### [MODIFY] [SendMessageService.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/application/service/SendMessageService.java)

AI 응답 처리 부분에서 `action == "CANCEL_REQUEST"` 분기를 추가합니다.

```diff
  // 6. 태스크형 요청 감지 시 이벤트 발행
- if (analysis.domainCode() != null) {
+ if ("CANCEL_REQUEST".equals(analysis.action())) {
+     // 취소 이벤트 발행
+     eventPublisher.publishEvent(new RequestCancelledByGuestEvent(
+         this, roomNo, guestId
+     ));
+     log.info("[Message] RequestCancelledByGuestEvent 발행 — room: {}", roomNo);
+ } else if (analysis.domainCode() != null) {
      // 기존 로직 유지
  }
```

---

#### [NEW] [RequestCancelledByGuestEvent.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/infrastructure/event/RequestCancelledByGuestEvent.java)

```java
@Getter
public class RequestCancelledByGuestEvent extends ApplicationEvent {
    private final String roomNo;
    private final Long guestId;
    // 생성자
}
```

---

#### [NEW] [CancelRequestOnEventService.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/application/service/CancelRequestOnEventService.java)

이벤트를 수신하여 실제 취소를 수행합니다.

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void onGuestCancel(RequestCancelledByGuestEvent event) {
    // 1. 해당 방+투숙객의 최근 PENDING/ASSIGNED 요청 1건 조회
    // 2. request.changeStatus(CANCELLED)
    // 3. DB 저장
    // 4. WebSocket → STATUS_CHANGED (CANCELLED) → 고객/부서/관리자 알림
}
```

#### [MODIFY] [RequestRepositoryPort.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/request/application/port/out/RequestRepositoryPort.java)

```diff
+ /** 해당 방+투숙객의 가장 최근 취소 가능한(PENDING/ASSIGNED) 요청 조회 */
+ Optional<Request> findLatestCancellableByRoomNoAndGuestId(String roomNo, Long guestId);
```

---

### 프론트엔드 — 이미 완료 ✅

StatusCard의 `CANCELLED` 상태 표시는 이미 이번 세션에서 구현했으므로 추가 작업 없음.

---

## 전체 파일 변경 요약

| 유형 | 파일 | 설명 |
|---|---|---|
| **MODIFY** | `router_prompt.py` | `INFO`, `CANCEL` 모드 추가 |
| **MODIFY** | `analyze.py` | `INFO` → RAG 답변, `CANCEL` → `action: "CANCEL_REQUEST"` |
| **MODIFY** | `MessageAiResult.java` | `action` 필드 추가 |
| **MODIFY** | `PythonAiHttpAdapter.java` | `action` 파싱 추가 |
| **MODIFY** | `MockAiAdapter.java` | 시그니처 맞춤 (`action: null`) |
| **MODIFY** | `SendMessageService.java` | `CANCEL_REQUEST` 액션 분기 + 이벤트 발행 |
| **NEW** | `RequestCancelledByGuestEvent.java` | 모듈 간 취소 이벤트 |
| **NEW** | `CancelRequestOnEventService.java` | 취소 이벤트 수신 → DB 변경 + WebSocket 알림 |
| **MODIFY** | `RequestRepositoryPort.java` | `findLatestCancellableByRoomNoAndGuestId` 추가 |
| **MODIFY** | `RequestPersistenceAdapter.java` | 위 Port 구현 |

---

## Verification Plan

### 자동 테스트 (curl)

```bash
# 1. INFO 테스트 — 정보 질문 (요청 미생성 확인)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "슬리퍼 있어요?", "room_no": "707"}'
# 기대: {"domain_code": null, "guest_reply": "네, 객실에 비치되어 있습니다...", ...}
# 기대: "action" 필드 없음 (요청 미생성)

# 2. TASK 테스트 — 실제 요청 (요청 생성 확인)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "수건 2장 주세요", "room_no": "707"}'
# 기대: {"domain_code": "HK", ...}

# 3. CANCEL 테스트 — 취소 요청
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "아까 요청 취소해주세요", "room_no": "707"}'
# 기대: {"action": "CANCEL_REQUEST", "domain_code": null, ...}
```

### E2E 테스트

**INFO 흐름:**
1. 채팅에서 "슬리퍼 있어요?" → AI가 RAG 지식 기반으로 "네, 객실에 비치되어 있습니다" 답변
2. StatusCard가 **생성되지 않음** 확인 ✅
3. 관리자 대시보드에 요청이 **생성되지 않음** 확인 ✅

**CANCEL 흐름:**
1. 채팅에서 "수건 2장 주세요" → StatusCard 생성 확인
2. 채팅에서 "요청취소할래요" → AI가 "네, 가장 최근 요청을 취소 처리하겠습니다." 응답
3. StatusCard가 빨간색 바 + "요청이 취소되었습니다"로 변경 확인
4. 관리자 대시보드에서 해당 요청 상태가 CANCELLED로 변경 확인
