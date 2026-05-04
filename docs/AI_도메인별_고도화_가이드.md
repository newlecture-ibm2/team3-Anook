# 🧠 AI 도메인별 고도화 가이드

> **최종 업데이트:** 2026-05-04  
> **작성 배경:** RAG 인프라 구축 및 라우터 연동 완료 후, 팀원들이 각 부서별 AI 에이전트를 독립적으로 개발할 수 있도록 현재 상태와 향후 작업을 정리합니다.

---

## 📋 목차

1. [현재 진행 상황](#1--현재-진행-상황)
2. [전체 아키텍처 흐름](#2--전체-아키텍처-흐름)
3. [부서별 에이전트 개발 가이드](#3--부서별-에이전트-개발-가이드)
4. [에이전트 등록 방법 (플러그 앤 플레이)](#4--에이전트-등록-방법-플러그-앤-플레이)
5. [entities와 intent 규칙](#5--entities와-intent-규칙)
6. [DB 스키마 관련 리팩토링 예정 사항](#6--db-스키마-관련-리팩토링-예정-사항)
7. [테스트 및 검증 방법](#7--테스트-및-검증-방법)
8. [FAQ](#8--faq)

---

## 1. 📊 현재 진행 상황

### ✅ 완료된 인프라

| 항목 | 파일 위치 | 설명 |
|------|-----------|------|
| Gemini 공통 클라이언트 | `ai/app/infrastructure/gemini/client.py` | 모든 AI 모듈이 공유하는 Gemini API 호출 래퍼 |
| 임베딩 클라이언트 | `ai/app/infrastructure/embedding/client.py` | `gemini-embedding-2` 모델 (768차원) |
| RAG 지식 검색 | `ai/app/domains/rag/service.py` | pgvector 코사인 유사도 기반 벡터 검색 |
| 메인 라우터 엔진 | `ai/app/core/router_engine.py` | 고객 메시지 → 6개 부서 도메인 분류 |
| 라우터 프롬프트 | `ai/app/prompts/router_prompt.py` | 영문 시스템 프롬프트 (토큰 비용 절감) |
| 분석 브릿지 `/analyze` | `ai/app/api/analyze.py` | 백엔드 연동 단일 진입점 (RAG → 라우터 → 에이전트) |
| 백엔드 AI 어댑터 | `backend/.../PythonAiHttpAdapter.java` | Python `/analyze` 호출 및 응답 파싱 |
| 백엔드 이벤트 발행 | `backend/.../SendMessageService.java` | `domain_code` 존재 시 `RequestDetectedEvent` 발행 |
| RAG 관리자 페이지 | `frontend/src/app/admin/rag/` | 도메인별 지식 CRUD UI |
| `.env` 환경변수 관리 | `ai/.env` | GEMINI_API_KEY, DB 접속 정보 |

### ❌ 아직 미개발 (팀원 작업 영역)

| 항목 | 담당 | 설명 |
|------|------|------|
| HK 에이전트 | 하우스키핑 담당 | 수건/어메니티/청소 등 intent + entities 파싱 |
| FB 에이전트 | F&B 담당 | 룸서비스/메뉴/음료 주문 파싱 |
| FACILITY 에이전트 | 시설 담당 | 에어컨/TV/와이파이 고장 증상 파싱 |
| CONCIERGE 에이전트 | 컨시어지 담당 | 택시/관광/짐보관 등 파싱 |
| FRONT 에이전트 | 프론트 담당 | 체크인아웃/키카드/결제 문의 파싱 |
| EMERGENCY 에이전트 | 긴급 담당 | 화재/응급/안전 위협 파싱 |

---

## 2. 🔀 전체 아키텍처 흐름

```
고객 채팅 입력 ("수건 2개 주세요")
│
▼
┌──────────────────────────────────────────┐
│  프론트엔드 (Next.js)                      │
│  POST /api/chat/{roomNo}/messages        │
└──────────┬───────────────────────────────┘
           │ BFF 프록시
           ▼
┌──────────────────────────────────────────┐
│  백엔드 (Spring Boot :8080)               │
│  SendMessageService                      │
│  → 고객 메시지 DB 저장                      │
│  → PythonAiHttpAdapter.analyze() 호출     │
└──────────┬───────────────────────────────┘
           │ HTTP POST /analyze
           ▼
┌──────────────────────────────────────────────────────┐
│  AI 서버 (FastAPI :8000) — analyze.py                 │
│                                                       │
│  [STEP 1] RAG 지식 검색 (COMMON)                       │
│     └─ 매칭 시 → 즉시 지식 답변 반환 (domain_code: null) │
│                                                       │
│  [STEP 2] 라우터 엔진 (router_engine.py)                │
│     └─ Gemini가 mode + domain + confidence 분류         │
│                                                       │
│  [STEP 3] 분기 처리                                     │
│     ├─ TASK → domain_code 찍어서 반환                   │
│     │     └─ 에이전트 등록 시: intent + entities 포함     │
│     │     └─ 에이전트 미등록 시: 기본 응답 + domain만 전달  │
│     ├─ CHITCHAT → 친절한 AI 대화 응답                    │
│     └─ CLARIFICATION → 되묻기 응답                      │
└──────────┬───────────────────────────────────────────┘
           │ JSON 응답
           ▼
┌──────────────────────────────────────────┐
│  백엔드 (Spring Boot)                     │
│  → AI 응답 메시지 DB 저장                   │
│  → WebSocket Push (고객 채팅 화면)          │
│  → domain_code 존재 시:                    │
│     RequestDetectedEvent 발행              │
│     → request 테이블에 요청 생성             │
│     → 직원 대시보드에 실시간 알림             │
└──────────────────────────────────────────┘
```

### `/analyze` 응답 JSON 규격

```json
{
  "guest_reply": "네, 알겠습니다. 수건 2장을 객실로 보내드리겠습니다.",
  "summary": "HK 부서 요청 접수",
  "domain_code": "HK",
  "priority": "NORMAL",
  "entities": {
    "intent": "TOWEL_REQUEST",
    "item": "수건",
    "count": 2
  },
  "confidence": 0.95
}
```

> **핵심:** `domain_code`가 `null`이 아니면 백엔드가 자동으로 `request` 테이블에 요청을 생성합니다.

---

## 3. 🛠️ 부서별 에이전트 개발 가이드

> **📌 필수 참조 파일:** `docs/AI_AGENT_ONBOARDING_GUIDE.md`에 4단계 개발 순서가 상세히 적혀 있습니다.

### 3.1 파일 생성 순서 (HK 예시)

```
ai/app/
├── prompts/
│   └── hk_prompt.py        ← Step 1: 시스템 프롬프트
├── core/
│   └── hk_engine.py         ← Step 2: 에이전트 엔진
└── api/v1/endpoints/
    └── hk.py                ← Step 3: API 엔드포인트 (독립 테스트용)
```

### 3.2 Step 1 — 시스템 프롬프트 (`ai/app/prompts/hk_prompt.py`)

```python
"""하우스키핑 부서 AI 에이전트 시스템 프롬프트"""

HK_SYSTEM_PROMPT = """
You are a Housekeeping AI agent for Anook Hotel.
Extract structured information from the guest's request.

OUTPUT FORMAT (strictly JSON):
{
  "request_id": "auto-generated",
  "room_no": "from input",
  "domain": "HK",
  "summary": "3줄 요약 (Korean)",
  "priority": "LOW | NORMAL | HIGH | URGENT",
  "status": "PENDING",
  "confidence": 0.0~1.0,
  "entities": {
    "intent": "TOWEL | CLEANING | AMENITY | BEDDING | MINIBAR | OTHER",
    "item": "요청 물품명 (Korean)",
    "count": number or null
  },
  "needs_clarification": false,
  "clarification_question": "",
  "missing_fields": []
}

RULES:
- intent MUST always be included in entities (for dashboard statistics)
- If count is unclear, set needs_clarification=true and ask
- Write summary and reasoning in KOREAN
""".strip()
```

### 3.3 Step 2 — 에이전트 엔진 (`ai/app/core/hk_engine.py`)

```python
from app.infrastructure.gemini.client import call_gemini
from app.prompts.hk_prompt import HK_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

def run_hk_agent(user_message: str, room_no: str = "", chat_history: list = None) -> dict:
    """하우스키핑 에이전트: 고객 메시지에서 HK 관련 정보를 추출"""
    
    if chat_history:
        context = "\n".join([
            f"{'고객' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[대화 맥락]\n{context}\n\n[현재 요청]\n고객: {user_message}"
    else:
        prompt = f"고객 객실: {room_no}\n고객 메시지: {user_message}"
    
    raw = call_gemini(prompt=prompt, system_instruction=HK_SYSTEM_PROMPT)
    
    # Pydantic 검증
    result = HotelRequestSchema(**raw)
    
    # /analyze 응답 형태로 변환
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

### 3.4 Step 3 — 독립 API 엔드포인트 (`ai/app/api/v1/endpoints/hk.py`)

> 이 파일은 **개별 테스트용**입니다. 실제 채팅 흐름은 `/analyze`를 통해 자동 호출됩니다.

```python
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.core.hk_engine import run_hk_agent

router = APIRouter()

class DomainRequest(BaseModel):
    message: str
    room_no: str
    chat_history: List[dict] = []

@router.post("/hk")
async def handle_hk(request: DomainRequest):
    return run_hk_agent(request.message, request.room_no, request.chat_history)
```

---

## 4. 🔌 에이전트 등록 방법 (플러그 앤 플레이)

에이전트 개발이 완료되면, **딱 한 줄**만 추가하면 전체 파이프라인에 연결됩니다.

### 📂 파일: `ai/app/api/analyze.py`

```python
# ── 부서별 에이전트 레지스트리 (37번째 줄 근처) ──

from app.core.hk_engine import run_hk_agent       # ← import 추가

DOMAIN_AGENTS: Dict[str, Any] = {
    "HK": run_hk_agent,       # ← 등록 완료!
    # "FB": run_fb_agent,      # ← 다음 팀원이 완성 후 등록
    # "FACILITY": ...,
}
```

> **⚠️ 등록 전:** 라우터가 `domain: HK`로 분류하면 기본 응답 + `domain_code: "HK"`만 전달  
> **✅ 등록 후:** HK 에이전트가 `intent`, `entities`까지 파싱한 풍부한 JSON을 전달

---

## 5. 📊 entities와 intent 규칙

### 배경

백엔드 아키텍처 개편으로 기존 `intent` 기반 분기 로직이 제거되었습니다.

- **라우팅:** `domain` (부서) 기준으로만 수행
- **통계:** `entities.intent` 기준으로 그룹핑 (프론트엔드 도넛 차트)

> **한 줄 요약: `intent`는 로직이 아니라, 통계를 위한 데이터로 `entities` 안에 넣는다.**

### 필수 규칙

1. **`entities` 안에 `intent` 키를 반드시 포함** (대시보드 통계용)
2. `intent` 값은 정규화된 대문자 영문 사용 (예: `TOWEL_REQUEST`, `ROOM_SERVICE`)
3. `domain`과 `intent`는 별개로 관리

### 부서별 entities 예시

> **참조 파일:** `ai/app/schemas/common.py` 21번째 줄 주석

| 부서 | entities 예시 |
|------|--------------|
| HK | `{"intent": "TOWEL_REQUEST", "item": "수건", "count": 2}` |
| FB | `{"intent": "ROOM_SERVICE", "menu": "콜라", "price": 5000}` |
| FACILITY | `{"intent": "AC_REPAIR", "symptom": "안 켜짐", "location": "침실"}` |
| CONCIERGE | `{"intent": "TAXI", "destination": "인천공항", "time": "14:00"}` |
| FRONT | `{"intent": "CHECKOUT", "requested_time": "11:00"}` |
| EMERGENCY | `{"intent": "FIRE", "floor": "3층"}` |

### 기대 효과

- **백엔드:** `entities -> 'intent'` 기준으로 `GROUP BY` → `COUNT(*)` 통계 생성
- **프론트엔드:** 도넛 차트 (Most Frequent Requests) 정상 렌더링
- **전체:** ERD 변경 없음, 빠른 적용, 확장성 유지

---

## 6. ⚠️ DB 스키마 관련 리팩토링 예정 사항

> 현재는 서비스 동작에 문제가 없지만, 프로젝트 규모가 커지면 아래 리팩토링이 필요할 수 있습니다.

### 6.1 `knowledge_entry` 테이블 — `updated_at` 자동 갱신

**현재 상태:** `updated_at`은 `DEFAULT NOW()`만 설정되어 있어, INSERT 시에만 자동 세팅됩니다. UPDATE 시에는 Java 코드(`KnowledgeJpaEntity.updateFields()`)에서 수동으로 `LocalDateTime.now()`를 세팅하고 있습니다.

**추후 리팩토링:**
```sql
-- 트리거 함수로 자동 갱신 (권장)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_entry_modtime
    BEFORE UPDATE ON knowledge_entry
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
```

### 6.2 `request` 테이블 — `entities` 내 `intent` 인덱싱

**현재 상태:** `entities` 컬럼은 `JSONB` 타입이지만, `intent` 값에 대한 인덱스가 없습니다.

**추후 리팩토링 (데이터가 쌓인 후):**
```sql
-- intent 값으로 통계 쿼리 시 성능 최적화
CREATE INDEX IF NOT EXISTS idx_request_entities_intent 
    ON request USING btree ((entities->>'intent'));
```

### 6.3 `DomainCode` Enum — 값 추가 시 주의

**현재 상태:** Java 백엔드의 `DomainCode` enum과 파이썬 라우터의 `VALID_DOMAINS` 집합이 별도로 관리됩니다.

**주의 사항:** 새로운 부서 코드를 추가할 경우, 반드시 아래 **3곳을 동시에** 수정해야 합니다:

| 위치 | 파일 |
|------|------|
| Java Enum | `backend/.../knowledge/domain/model/DomainCode.java` |
| Python 라우터 | `ai/app/core/router_engine.py` → `VALID_DOMAINS` |
| Python 라우터 프롬프트 | `ai/app/prompts/router_prompt.py` → 부서 테이블 |

### 6.4 벡터 차원 수 변경 시 영향 범위

**현재 설정:** 임베딩 벡터는 `768차원` (`gemini-embedding-2`, `output_dimensionality=768`)

**변경 시 영향:**
- `schema.sql` → `embedding vector(768)` 수정 필요
- `ai/app/infrastructure/embedding/client.py` → `output_dimensionality` 수정
- 기존 DB에 저장된 임베딩 데이터 **전체 재생성** 필요 (마이그레이션 스크립트 작성)

---

## 7. 🧪 테스트 및 검증 방법

### 7.1 파이썬 서버 터미널 로그 확인

채팅을 입력하면 파이썬 터미널(`uvicorn`)에 실시간 로그가 출력됩니다:

```
[Analyze] 🔀 라우터 결과: [{'mode': 'TASK', 'domain': 'HK', 'confidence': 0.95}]
[Analyze] 📌 TASK → domain: HK (에이전트 미등록, 기본 응답)
[Analyze] 응답: {'guest_reply': '네, 알겠습니다...', 'domain_code': 'HK', ...}
```

### 7.2 개별 에이전트 독립 테스트 (curl)

```bash
# 라우터만 테스트
curl -X POST http://localhost:8000/api/v1/router \
  -H "Content-Type: application/json" \
  -d '{"message": "수건 2개 주세요", "room_no": "707"}'

# RAG 검색 테스트
curl -X POST http://localhost:8000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "와이파이 비밀번호", "domain_code": "COMMON"}'

# 전체 파이프라인 테스트 (/analyze)
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "수건 2개 주세요", "room_no": "707", "language": "ko"}'
```

### 7.3 프론트엔드 E2E 테스트

1. 고객 로그인 → 채팅창 진입
2. "수건 2개 주세요" 입력
3. AI 응답 확인 (+ 파이썬 터미널 로그 확인)
4. 관리자 대시보드 → 요청 목록에 HK 요청이 생성되었는지 확인

---

## 8. ❓ FAQ

### Q: 에이전트 없이도 요청이 생성되나요?
**A:** 네. 라우터가 `domain_code: "HK"`를 찍어주면, 백엔드가 자동으로 `request` 테이블에 요청을 생성합니다. 다만 `entities`가 비어 있어 도넛 차트 통계에는 반영되지 않습니다.

### Q: 에이전트를 개발하면 뭐가 달라지나요?
**A:** `entities` 안에 `intent`, `item`, `count` 등이 채워져서:
- 고객에게 더 구체적인 응답 가능 ("수건 2장을 보내드리겠습니다" vs "담당 부서에 전달하겠습니다")
- 대시보드 도넛 차트에 통계 데이터가 쌓임
- 직원 대시보드에 상세한 요청 카드가 표시됨

### Q: 절대 수정하면 안 되는 파일은?
**A:** `AI_AGENT_ONBOARDING_GUIDE.md`에 명시된 3개 파일:
1. `ai/app/infrastructure/gemini/client.py` — Gemini 통신 코어
2. `ai/app/schemas/common.py` — 공통 응답 스키마
3. `ai/app/core/router_engine.py` — 메인 라우터

### Q: RAG 지식과 라우터 중 뭐가 먼저 실행되나요?
**A:** RAG가 먼저입니다. COMMON 지식에 매칭되면 라우터를 태우지 않고 바로 답변합니다. RAG에 없을 때만 라우터가 동작합니다.

### Q: 새 부서를 추가하고 싶으면?
**A:** [6.3 DomainCode Enum 섹션](#63-domaincode-enum--값-추가-시-주의)을 참조하세요. Java Enum, Python 라우터, 프롬프트 3곳을 동시에 수정해야 합니다.

---

## 📎 관련 문서

| 문서 | 설명 |
|------|------|
| `docs/AI_AGENT_ONBOARDING_GUIDE.md` | 에이전트 4단계 개발 가이드 (코드 뼈대 포함) |
| `ai/app/schemas/common.py` | `HotelRequestSchema` 공통 응답 규격 |
| `ai/app/api/analyze.py` | 인프라 브릿지 (에이전트 레지스트리) |
| `docs/DB_스키마_리팩토링_제안.md` | DB 스키마 변경 상세 제안서 |
