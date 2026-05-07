# 되묻기 3회 제한 구현 계획

## 목적
AI가 투숙객에게 정보를 얻기 위해 되묻는 횟수를 **최대 3회로 제한**한다.
3회 초과 시 기존 글로벌 이관 로직(confidence < 0.4)을 활용하여 **프론트데스크(FD) 직원에게 자동 이관**한다.

---

## 현재 되묻기 작동 구조

되묻기는 두 개의 레이어에서 발생한다:

| 레이어 | 파일 | 되묻기 방식 |
|--------|------|-------------|
| **라우터** | `router_engine.py` | mode=`CLARIFICATION` → `analyze.py` STEP 3-c에서 고정 메시지 반환 |
| **부서 에이전트** | `hk_engine.py`, `facility_engine.py` 등 | `needs_clarification=True` → `domain_code=None`으로 반환 |

두 경우 모두 최종적으로 `analyze.py`를 거쳐서 응답이 나간다.
되묻기 발생 시 `domain_code=None`으로 응답하므로 **백엔드에서 request가 생성되지 않고** 채팅창에 질문만 표시된다.

---

## 핵심 설계 결정: `analyze.py` 중앙 통제

### 왜 각 부서 엔진/프롬프트가 아닌 `analyze.py`에서 처리하는가?

**1. 유지보수**
- 각 부서 엔진에 분산하면 6개 엔진 × 프롬프트 전부 수정해야 하고, 하나라도 빠지면 버그
- `analyze.py` 중앙 통제하면 **상수 1개(`MAX_CLARIFICATION`)만 수정하면 끝**

**2. 팀 협업**
- 각 부서 엔진은 다른 팀원들이 각자 개발 중
- 팀원들은 자기 엔진의 본업(정보 추출, 되묻기 판단)에만 집중하면 됨
- 되묻기 제한은 `analyze.py`가 게이트키퍼 역할

**3. 100% 신뢰성 (하드 제약)**
- 프롬프트에 "3번 이상 되묻지 마"라고 쓰는 건 소프트 제약 (LLM이 무시할 수 있음)
- `analyze.py`에서 코드로 카운팅하는 건 **하드 제약** (LLM이 응답을 뱉은 뒤 Python if문으로 강제 덮어쓰기)
- LLM의 의지와 무관하게 **100% 작동 보장**

---

## 구현 상세

### 수정 대상: `ai/app/api/analyze.py` (1개 파일만)

### Step 1. 상수 & 헬퍼 함수 추가 (DOMAIN_AGENTS 아래)

```python
# ── 되묻기 최대 횟수 ──
MAX_CLARIFICATION = 3


def _count_clarifications(chat_history: List[dict]) -> int:
    """
    chat_history에서 AI가 되물은 횟수를 센다.
    백엔드에서 보내주는 chat_history는 {"role": "user"|"ai", "content": "..."} 형태.
    AI 메시지 중 질문형 종결어를 포함하는 응답을 되묻기로 판정한다.
    """
    count = 0
    for msg in chat_history:
        if msg.get("role") == "ai":
            content = msg.get("content", "")
            if any(kw in content for kw in ["?", "까요", "주시겠", "알려주", "말씀해", "몇 개", "몇 장", "어떤"]):
                count += 1
    return count
```

### Step 2. 부서 에이전트 호출 직후, 기존 글로벌 이관 로직 **바로 위**에 삽입

```python
                final_summary = agent_result.get("summary", f"{domain} 요청")

                # 🔄 [되묻기 3회 제한] 부서 에이전트가 또 되묻기를 시도하는데
                #    이미 3번 이상 되물었다면 → confidence를 0.3으로 내려서
                #    아래 글로벌 이관 로직(< 0.4)을 자동으로 타게 만든다
                if final_domain_code is None and _count_clarifications(request.chat_history) >= MAX_CLARIFICATION:
                    print(f"[Analyze] 🔴 되묻기 {MAX_CLARIFICATION}회 초과 — 프론트데스크로 이관")
                    agent_confidence = 0.3
                    final_domain_code = domain  # 일단 부서 코드를 살려서 이관 로직 진입

                # 🚨 [글로벌 이관 로직] 기존 코드 - 수정 없음
                if agent_confidence < 0.4:
                    final_domain_code = "FRONT"
                    ...
```

---

## 동작 흐름

```
1회차: AI 되묻기 → 고객에게 질문 반환 (request 생성 안 됨)
2회차: AI 되묻기 → 고객에게 질문 반환 (request 생성 안 됨)
3회차: AI 되묻기 → 고객에게 질문 반환 (request 생성 안 됨)
4회차: AI가 또 되묻기 시도 → ❌ 차단!
       → confidence 0.3으로 강제 하락
       → 기존 이관 로직(< 0.4) 자동 트리거
       → domain_code = "FRONT", intent = "ESCALATION"
       → 프론트데스크 직원에게 이관 (request 생성됨)
       → 고객에게 "프런트 데스크 직원에게 연결해 드리겠습니다" 안내
```

---

## 부서별 영향도

| 부서 상태 | 되묻기 | 3회 제한 적용 | 팀원 추가 작업 |
|-----------|--------|--------------|--------------|
| 에이전트 **등록됨** (HK, FACILITY, CONCIERGE) | ✅ 가능 | ✅ 자동 적용 | 없음 |
| 에이전트 **미등록** (FB, FRONT, EMERGENCY) | ❌ 불가 (고정 응답) | 해당 없음 | 없음 |
| 앞으로 **새로 추가** | ✅ 가능 | ✅ 등록만 하면 자동 적용 | 없음 |

---

## 수정 파일 목록

- [ ] `ai/app/api/analyze.py` — 상수 + 헬퍼 함수 + 체크 로직 삽입
- [ ] 각 부서 엔진 (`hk_engine.py`, `facility_engine.py` 등) — **수정 없음**
- [ ] 백엔드 (Java) — **수정 없음**

---

## 구현 시점 및 선행 조건

> **이 기능은 다른 팀원들의 부서별 AI 에이전트 개발이 모두 완료된 후 일괄 적용한다.**

### 이유
- 되묻기 3회 제한은 **모든 부서 에이전트가 `DOMAIN_AGENTS`에 등록된 상태**에서 테스트해야 의미가 있음
- 현재 미등록 부서(FB, FRONT, EMERGENCY)는 되묻기 자체가 불가능하므로, 지금 적용해도 해당 부서에는 효과 없음
- 각 팀원이 자기 에이전트의 되묻기 로직(`needs_clarification`)을 충분히 테스트한 뒤, 마지막에 중앙 제한을 걸어야 사이드이펙트 없이 안전하게 적용 가능

### 적용 순서
1. 각 팀원이 부서별 AI 에이전트 개발 완료 (`fb_engine.py`, `front_engine.py`, `emergency_engine.py` 등)
2. 모든 에이전트를 `DOMAIN_AGENTS` 딕셔너리에 등록
3. 각 에이전트의 되묻기 정상 동작 확인 (단위 테스트)
4. **이 계획서의 Step 1~2 코드를 `analyze.py`에 삽입** (일괄 적용)
5. 통합 테스트: 3회 초과 되묻기 시 프론트데스크 이관 정상 동작 확인

