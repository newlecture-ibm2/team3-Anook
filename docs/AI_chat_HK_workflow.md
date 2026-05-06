# HK(하우스키핑) 도메인 AI 에이전트 구현 — One-pass 프롬프트 + Entity 추출 + RAG 연동

> **브랜치**: `young/feat/AN-201/HK-One-pass`
> **목표**: 라우터가 `domain=HK`로 분류한 고객 메시지를 받아, **단일 Gemini 호출로** 다국어 감지 + 번역 + 비품 Entity 추출 + 되묻기 판단까지 수행하는 HK 전용 에이전트를 구현한다.
> 추가로, danhee가 `router_engine.py`에 준비해둔 `chat_history` 맥락 조립 로직을 **공통 파이프라인에 연결**한다.

---

## 배경: 현재 파이프라인과 HK 에이전트의 위치

```
고객 메시지
    │
    ▼
① 라우터 엔진 (router_engine.py)  ←  현재 작동 중
    │  mode=TASK, domain=HK
    ▼
② DOMAIN_AGENTS["HK"] = run_hk_agent   ←  🔴 이번에 만들 것
    │
    ▼
③ analyze.py → 백엔드로 JSON 응답 반환
```

[analyze.py L36-44](file:///home/young/workspace/team3-Anook/ai/app/api/analyze.py#L36-L44)에 이미 에이전트 레지스트리가 준비되어 있고, `run_hk_agent`를 등록만 하면 플러그인됩니다.

---

## 확정 사항

| # | 항목 | 결정 |
|---|---|---|
| 1 | AI 출력 형식 | **JSON** (`HotelRequestSchema` 호환). 기존 파이프 코드 방식은 폐기 |
| 2 | 호출 횟수 | **One-pass** (단일 Gemini 호출로 모든 것을 처리) |
| 3 | 다국어 처리 | 프롬프트 내에서 언어 감지 → 한국어 번역 → 분류를 한번에 수행 |
| 4 | 되묻기 기준 | 품목 or 수량 누락 시 `needs_clarification=true` + 질문 생성 |
| 5 | RAG 연동 | HK 도메인 전용 지식(`domain_code='HK'`)을 RAG에서 검색하여 프롬프트에 주입 |
| 6 | 비품 코드 방식 | Enum 하드코딩 ❌ → **RAG 지식 + 프롬프트 Few-shot** Soft-constraint 방식 |
| 7 | chat_history | **방식 A (공통 수정)** — 백엔드 message 모듈 + analyze.py 연결하여 danhee의 `router_engine.py` 맥락 로직 활성화 |
| 8 | RAG 시드 범위 | 비품 목록, 수량 제한, 청소 운영 시간, 턴다운/미니바/세탁 안내 (추후 동적 추가) |

---

## Proposed Changes

### Step 0. chat_history 공통 파이프라인 연결 (방식 A)

> danhee가 [router_engine.py L30-49](file:///home/young/workspace/team3-Anook/ai/app/core/router_engine.py#L30-L49)에 `chat_history[-5:]` 맥락 조립 로직을 만들어뒀지만, 데이터를 보내주는 쪽이 미연결 상태. 이번에 전체 파이프라인을 연결한다.

#### [MODIFY] [MessageAiPort.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/application/port/out/MessageAiPort.java)

```diff
-    MessageAiResult analyze(String text, String roomNo, String language);
+    MessageAiResult analyze(String text, String roomNo, String language,
+                            List<Map<String, String>> chatHistory);
```

#### [MODIFY] [SendMessageService.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/application/service/SendMessageService.java#L80-L85)

```diff
 public void processAiAsync(String roomNo, String content, String language) {
+    // 최근 5개 메시지 조회 (대화 맥락용)
+    List<Message> recentMessages = messagePort.findRecentByRoomNo(roomNo, 5);
+    List<Map<String, String>> chatHistory = recentMessages.stream()
+        .map(m -> Map.of("role", m.getSenderType().equals("GUEST") ? "user" : "ai",
+                         "content", m.getContent()))
+        .toList();
+
-    MessageAiResult analysis = aiPort.analyze(content, roomNo, language);
+    MessageAiResult analysis = aiPort.analyze(content, roomNo, language, chatHistory);
```

> `MessageRepositoryPort`에 `findRecentByRoomNo(String roomNo, int limit)` 메서드 추가 필요

#### [MODIFY] [PythonAiHttpAdapter.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/adapter/out/ai/PythonAiHttpAdapter.java#L47-L57)

```diff
 public MessageAiResult analyze(String text, String roomNo, String language,
+                                List<Map<String, String>> chatHistory) {
     Map<String, Object> response = webClient.post()
             .uri("/analyze")
-            .bodyValue(Map.of("text", text, "room_no", roomNo, "language", language))
+            .bodyValue(Map.of(
+                "text", text,
+                "room_no", roomNo,
+                "language", language,
+                "chat_history", chatHistory
+            ))
```

#### [MODIFY] [MockAiAdapter.java](file:///home/young/workspace/team3-Anook/backend/src/main/java/com/anook/backend/message/adapter/out/ai/MockAiAdapter.java#L27)

```diff
-public MessageAiResult analyze(String text, String roomNo, String language) {
+public MessageAiResult analyze(String text, String roomNo, String language,
+                                List<Map<String, String>> chatHistory) {
     // Mock은 chatHistory 무시, 기존 로직 그대로 유지
```

#### [MODIFY] [analyze.py](file:///home/young/workspace/team3-Anook/ai/app/api/analyze.py#L28-L31)

```diff
 class AnalyzeRequest(BaseModel):
     text: str
     room_no: str
     language: Optional[str] = "ko"
+    chat_history: List[dict] = []
```

+ `route()` 호출 시 `chat_history` 전달:
```diff
-    router_results = route(request.text)
+    router_results = route(request.text, request.chat_history)
```

+ 에이전트 호출 시도 전달:
```diff
-    agent_result = DOMAIN_AGENTS[domain](request.text)
+    agent_result = DOMAIN_AGENTS[domain](request.text, request.chat_history)
```

---

### Step 1. HK 시스템 프롬프트

#### [NEW] [hk_prompt.py](file:///home/young/workspace/team3-Anook/ai/app/prompts/hk_prompt.py)

HK 전용 One-pass 시스템 프롬프트. **단일 호출로** 아래를 모두 처리:

```
입력: "Could you bring 2 extra towels to room 501?"
    ↓ (One-pass Gemini 호출)
출력 JSON:
{
    "request_id": "auto",
    "room_no": "501",
    "domain": "HK",
    "summary": "수건 2장 추가 요청",
    "priority": "NORMAL",
    "status": "PENDING",
    "confidence": 0.95,
    "entities": {"intent": "TOWEL_REQUEST", "item": "수건", "count": 2},
    "needs_clarification": false,
    "clarification_question": "",
    "missing_fields": []
}
```

프롬프트 설계 핵심:
- **영문으로 작성** (토큰 비용 50% 절감, JSON 파싱 에러 방지)
- 지원 언어: 한국어, 영어, 일본어, 중국어 등 다국어 → 항상 한국어로 `summary` 생성
- **비품 목록 + 수량 기본값**을 RAG에서 가져와 프롬프트에 동적 삽입 (Section: `[Room Amenity Info]`)
- 되묻기 규칙: `item`이 불명확하거나 `count`가 누락이면 `needs_clarification=true`
- Few-shot 예시 3~4개 포함 (정상 케이스 + 되묻기 케이스)
- `entities.intent` 반드시 포함 (대시보드 통계용)
- 출력 형식은 **`HotelRequestSchema`에 맞춘 JSON**

---

### Step 2. HK 에이전트 엔진

#### [NEW] [hk_engine.py](file:///home/young/workspace/team3-Anook/ai/app/core/hk_engine.py)

> ⚠️ 가이드 준수: `core/hk_engine.py`에 위치 (NOT `domains/housekeeping/`)

```python
from app.infrastructure.gemini.client import call_gemini
from app.prompts.hk_prompt import HK_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema
from app.domains.rag import service as rag_service

def run_hk_agent(user_message: str, chat_history: list = None) -> dict:
    """
    HK 에이전트: One-pass로 다국어 감지 + Entity 추출 + 되묻기 판단
    
    Returns:
        analyze.py가 기대하는 dict 형태
        (내부적으로 HotelRequestSchema로 Pydantic 검증 후 변환)
    """
    # 1. RAG 검색 → HK 도메인 지식 (비품 목록, 수량 제한 등)
    rag_context = ""
    try:
        rag_results = rag_service.search_similar(
            query=user_message, domain_code="HK", top_k=3, threshold=0.5
        )
        if rag_results:
            rag_context = "\n".join([f"- {r['question']}: {r['answer']}" for r in rag_results])
    except Exception:
        pass

    # 2. 대화 맥락 조립
    if chat_history:
        context = "\n".join([
            f"{'Guest' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[Chat History]\n{context}\n\n"
    else:
        prompt = ""
    
    # 3. RAG 지식 삽입 + 현재 메시지
    if rag_context:
        prompt += f"[Room Amenity Info]\n{rag_context}\n\n"
    prompt += f"[Current Request]\nGuest: {user_message}"

    # 4. Gemini One-pass 호출
    raw = call_gemini(prompt=prompt, system_instruction=HK_SYSTEM_PROMPT)

    # 5. Pydantic 검증 (HotelRequestSchema)
    result = HotelRequestSchema(**raw)

    # 6. analyze.py 응답 형태로 변환
    return {
        "guest_reply": result.clarification_question if result.needs_clarification
                       else f"네, {result.entities.get('item', '요청하신 물품')}을(를) 객실로 보내드리겠습니다.",
        "summary": result.summary,
        "domain_code": "HK",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
    }
```

핵심 포인트:
- `call_gemini()` 공통 클라이언트 사용 ✅
- `HotelRequestSchema`로 Pydantic 검증 ✅
- `chat_history` 파라미터 수신 (analyze.py에서 전달) ✅
- RAG 지식 동적 주입 ✅

---

### Step 3. 독립 API 엔드포인트 + 레지스트리 등록

#### [NEW] [hk.py](file:///home/young/workspace/team3-Anook/ai/app/api/v1/endpoints/hk.py)

> 가이드 Step 3 준수: 독립 테스트용 엔드포인트

```python
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.core.hk_engine import run_hk_agent
from app.schemas.common import HotelRequestSchema

router = APIRouter()

class DomainRequest(BaseModel):
    message: str
    room_no: str
    chat_history: List[dict] = []

@router.post("/hk", response_model=HotelRequestSchema)
async def handle_hk(request: DomainRequest):
    return run_hk_agent(request.message, request.chat_history)
```

#### [MODIFY] [router.py](file:///home/young/workspace/team3-Anook/ai/app/api/v1/router.py) — Step 4 플러그 꽂기

```diff
+from app.api.v1.endpoints.hk import router as hk_endpoint

 api_router.include_router(router_endpoint, tags=["router"])
+api_router.include_router(hk_endpoint, prefix="/hk", tags=["housekeeping"])
```

#### [MODIFY] [analyze.py](file:///home/young/workspace/team3-Anook/ai/app/api/analyze.py#L36-L44) — 레지스트리 등록

```diff
+from app.core.hk_engine import run_hk_agent

 DOMAIN_AGENTS: Dict[str, Any] = {
-    # "HK": run_hk_agent,
+    "HK": run_hk_agent,
 }
```

---

### Step 4. HK 도메인 RAG 지식 시드 데이터

#### [NEW] hk_knowledge_seed.sql (또는 관리자 RAG 페이지에서 수동 등록)

`knowledge_entry` 테이블에 HK 도메인 전용 지식 시드 데이터:

| question | answer | domain_code |
|---|---|---|
| 객실에 비치되는 비품 종류는? | 수건(대/소), 가운, 슬리퍼, 어메니티 세트(샴푸/컨디셔너/바디워시/치약/칫솔), 생수, 미니바 | HK |
| 수건 추가 요청 시 최대 수량은? | 객실당 최대 4장까지 추가 가능합니다. | HK |
| 생수 추가 요청 시 최대 수량은? | 객실당 최대 6병까지 추가 가능합니다. | HK |
| 어메니티 추가 요청 시 제공 가능 항목은? | 샴푸, 컨디셔너, 바디워시, 치약, 칫솔, 면도기, 빗 | HK |
| 객실 청소 서비스 운영 시간은? | 09:00 ~ 21:00 (야간 긴급 청소는 프론트 데스크 연락) | HK |
| 턴다운 서비스란? | 저녁 시간(18:00~20:00)에 침구 정리, 커튼 닫기, 조명 조절 등을 해드리는 서비스입니다. | HK |
| 세탁 서비스 이용 방법은? | 객실 내 세탁 봉투에 넣어 요청하시면 당일 수거, 익일 배달됩니다. 긴급 세탁(당일 배달)은 추가 요금이 있습니다. | HK |
| 미니바 보충은 어떻게 하나요? | 매일 객실 청소 시 자동 보충됩니다. 즉시 보충이 필요하시면 요청해 주세요. | HK |

---

### 변경하지 않는 파일 (Onboarding 가이드 준수)

| 파일 | 이유 |
|---|---|
| `infrastructure/gemini/client.py` | 🚫 수정 금지 (공통 인프라) |
| `schemas/common.py` | 🚫 수정 금지 (공통 스키마) |
| `core/router_engine.py` | 🚫 수정 금지 (라우터 엔진) |
| `prompts/router_prompt.py` | 🚫 수정 금지 (라우터 프롬프트) |

---

## 전체 파일 변경 요약

### AI 서버 (Python)

| 유형 | 파일 | 설명 |
|---|---|---|
| **NEW** | `prompts/hk_prompt.py` | HK One-pass 시스템 프롬프트 |
| **NEW** | `core/hk_engine.py` | HK 에이전트 엔진 (RAG + Gemini + 검증) |
| **NEW** | `api/v1/endpoints/hk.py` | 독립 테스트용 엔드포인트 |
| **MODIFY** | `api/v1/router.py` | HK 엔드포인트 include (+2줄) |
| **MODIFY** | `api/analyze.py` | AnalyzeRequest에 chat_history 추가 + 레지스트리 등록 + 에이전트/라우터에 chat_history 전달 |

### 백엔드 (Java — message 모듈)

| 유형 | 파일 | 설명 |
|---|---|---|
| **MODIFY** | `MessageAiPort.java` | analyze() 시그니처에 chatHistory 파라미터 추가 |
| **MODIFY** | `MessageRepositoryPort.java` | `findRecentByRoomNo()` 메서드 추가 |
| **MODIFY** | `SendMessageService.java` | 최근 5개 메시지 조회 → chatHistory 조립 → 전달 |
| **MODIFY** | `PythonAiHttpAdapter.java` | HTTP body에 chat_history 필드 추가 |
| **MODIFY** | `MockAiAdapter.java` | 시그니처 맞춤 (mock은 chatHistory 무시) |
| **MODIFY** | `MessagePersistenceAdapter.java` | findRecentByRoomNo() 구현 |

---

## 작업 순서 타임라인

| 순서 | 단계 | 핵심 작업 | 예상 소요 |
|---|---|---|---|
| **Step 0** | chat_history 공통 연결 | 백엔드 message 모듈 6개 파일 + analyze.py 수정 | 1시간 |
| **Step 1** | HK 프롬프트 설계 | `prompts/hk_prompt.py` — One-pass 영문 시스템 프롬프트 | 1~2시간 |
| **Step 2** | HK 에이전트 엔진 | `core/hk_engine.py` — RAG 연동 + Gemini 호출 + HotelRequestSchema 검증 | 1~2시간 |
| **Step 3** | 등록 | `api/v1/endpoints/hk.py` + `router.py` include + `analyze.py` 레지스트리 | 30분 |
| **Step 4** | RAG 시드 데이터 | HK 도메인 지식 등록 (관리자 페이지 or SQL) | 1시간 |
| **Step 5** | E2E 테스트 | 다국어 입력 → HK 에이전트 → JSON 응답 → 백엔드 request 생성 검증 | 30분 |

---

## Verification Plan

### 자동 테스트
```bash
# 1. 독립 HK 에이전트 테스트
curl -X POST http://localhost:8000/api/v1/hk/hk \
  -H "Content-Type: application/json" \
  -d '{"message": "수건 2장 주세요", "room_no": "101"}'

# 2. 전체 파이프라인 테스트 (/analyze)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "수건 좀 갖다주세요", "room_no": "101"}'

# 3. 다국어 테스트
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Could you bring extra towels?", "room_no": "101"}'

# 4. 되묻기 테스트 (수량 누락)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "수건이요", "room_no": "101"}'

# 5. chat_history 연결 테스트
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "3개요", "room_no": "101", "chat_history": [
    {"role": "user", "content": "수건이요"},
    {"role": "ai", "content": "수건을 몇 장 가져다드릴까요?"}
  ]}'
```

### 검증 기준
1. ✅ `entities.intent`가 적절한 값(TOWEL_REQUEST, CLEANING 등)으로 추출되는가
2. ✅ 다국어 입력이 올바르게 처리되고, `summary`가 한국어로 생성되는가
3. ✅ 품목/수량 누락 시 `needs_clarification=true`로 반환되는가
4. ✅ `guest_reply`가 자연스럽게 생성되는가
5. ✅ chat_history 전달 시 라우터/에이전트가 맥락을 활용하는가
6. ✅ 기존 라우터 파이프라인(HK가 아닌 다른 도메인)이 깨지지 않는가
7. ✅ `HotelRequestSchema`로 Pydantic 검증이 통과하는가
