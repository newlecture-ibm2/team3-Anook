# 🌍 부서별 에이전트 다국어 미러링(완료 멘트) 적용 가이드

안녕하세요 팀원 여러분! 👋
고객이 자기 나라 언어로 요청했을 때, 중간에 되묻는 질문뿐만 아니라 **마지막으로 "네, 접수되었습니다" 하고 안내하는 최종 완료 멘트까지 완벽하게 고객의 언어로 미러링**하기 위한 가이드입니다.

공통 스키마(`common.py`)에 **`final_reply`** 필드를 새롭게 뚫어두었습니다! 
각 부서별 에이전트(HK, FACILITY, CONCIERGE 등)를 담당하시는 분들은 본인의 에이전트 코드와 프롬프트를 아래 가이드에 따라 수정해 주시면 됩니다.

---

## 🛠️ 수정 방법 (2-Steps)

### Step 1. 프롬프트 수정 (`*_prompt.py`)
에이전트가 `final_reply`를 JSON으로 출력할 수 있도록 프롬프트의 출력 포맷(스키마)과 룰을 업데이트해 주세요.

**변경 전 (예시)**
```json
  "needs_clarification": false,
  "clarification_question": "",
  "clarification_options": [],
```
**변경 후**
```json
  "needs_clarification": false,
  "clarification_question": "",
  "final_reply": "요청이 최종 접수되었을 때 안내할 완료 멘트 (반드시 고객 언어로 작성)",
  "clarification_options": [],
```

**✅ 추가해야 할 룰(Rule)**
프롬프트 하단 `RULES` 섹션에 다음 문구를 필수로 추가해 주세요:
> "만약 `needs_clarification`이 false라면, 요청이 성공적으로 접수되었다는 최종 안내 멘트를 `final_reply`에 반드시 **고객이 사용한 언어**로 작성하세요."

---

### Step 2. 엔진 로직 수정 (`*_engine.py`)
기존에는 파이썬 코드 안에서 한국어 문자열을 직접 포맷팅해서 최종 응답을 만들고 있었습니다. 이 부분을 방금 추가한 `result.final_reply`를 꺼내어 쓰도록 교체해 주세요.

**변경 전 (하드코딩된 한국어 멘트)**
```python
    return {
        "guest_reply": result.clarification_question if result.needs_clarification
                       else f"네, {result.entities.get('item')}을(를) 객실로 보내드리겠습니다.",
        ...
```

**변경 후 (`result.final_reply` 동적 매핑)**
```python
    return {
        "guest_reply": result.clarification_question if result.needs_clarification else result.final_reply,
        ...
```

---

## 💡 요약
1. `common.py`에 `final_reply`는 이미 추가해 두었으니 여러분이 신경 쓰지 않으셔도 됩니다!
2. 본인이 담당하시는 부서의 **프롬프트**에서 `final_reply`를 고객 언어로 생성하게 지시하세요.
3. 본인이 담당하시는 부서의 **엔진 코드**에서 하드코딩된 한국어를 지우고 `result.final_reply`를 꽂아 넣으세요.

이렇게 하면 외국인 고객이 어떤 부서로 연결되든 100% 자기 나라 언어로 자연스럽게 응답받을 수 있게 됩니다! 적용하시다가 궁금한 점 있으시면 언제든 질문 남겨주세요. 🚀
