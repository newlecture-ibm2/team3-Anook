# 🚀 [AI 팀 온보딩] 도메인별 AI 에이전트 개발 가이드 (Plug & Play)

> **💡 개발자(팀원) 분들께 드리는 팁:**  
> **AI 코딩 어시스턴트에게 이 마크다운 파일 내용 전체를 던져주면서 "이 가이드를 읽고 우리 부서(예: F&B) 에이전트 코드를 짜줘" 라고 명령하세요!** 그러면 이 아키텍처에 완벽하게 맞는 코드를 알아서 짜줄 것입니다.

---

## 📌 아키텍처 원칙 (AI 어시스턴트 필수 숙지)

현재 프로젝트는 메인 AI 라우터(고객 요청 분류)와 전체 API 통신 인프라가 이미 구축되어 있습니다.
새로운 부서의 AI 에이전트를 개발할 때는 기존 코드를 건드리지 않고, 지정된 폴더에 새로운 파일을 생성하여 **'플러그 앤 플레이(Plug & Play)'** 방식으로 붙여야 합니다.

**🚫 절대 수정하면 안 되는 공통 파일 (Do NOT Modify):**
1. `ai/app/infrastructure/gemini/client.py`: Gemini 통신 코어 래퍼. 무조건 이것을 import 해서 써야 함.
2. `ai/app/schemas/common.py`: 프론트 대시보드 및 백엔드(Java) DB와 1:1 매칭되는 응답 규격(`HotelRequestSchema`).
3. `ai/app/core/router_engine.py`: 고객 메시지를 부서로 뿌려주는 메인 라우터.

**🚨 타 부서 에이전트 프롬프트 작성 가이드라인 (역할 분담 원칙):**
멀티 에이전트 환경에서 프롬프트 충돌(핑퐁 지옥)을 막기 위해 프롬프트 작성 시 아래 3가지를 반드시 명시해야 합니다.

1. **라우팅 금지:** "프롬프트에 '이건 프론트 일이니까 프론트로 보내라' 같은 지시문을 절대 쓰지 마세요. domain: FRONT 같은 라우터 명령을 넣으면 에러가 터질 수 있습니다. 라우팅은 오직 **메인 라우터**에서만 담당하며, 각 부서는 부서의 데이터(entities)를 뽑아내는 데만 집중해 주세요. (AI 정체성 혼란을 막기 위해)" 

> **그렇다면 각 부서로 라우팅되었지만, 도저히 해결 불가능한 상황이라면?**

2. **모르겠으면 확신도를 냅다 낮출 것:** "혹시라도 내 부서 업무가 아닌 이상한 텍스트가 들어왔거나, 도저히 해결 불가능한 상황이면 프롬프트에서 억지로 지어내지 마세요. 그냥 `confidence`를 `0.4` 미만으로 낮게 줘버리라고 프롬프트에 명시하세요. 그러면 전체 시스템이 알아서 프론트데스크 직원에게 이관(Fallback) 시켜줍니다. -> 이렇게 시스템적으로 확신도를 조절해서 FD로 이관하는 방식을 사용해야 합니다 (라우팅 X)"

3. **`common.py`에 `clarification_options`이 추가되었습니다. (디테일이 빠졌을 때):** "선택지(`clarification_options`)를 만들어 주는 역할을 합니다. [예: 마실 것 좀 줘 -> AI가 제공하는 선택지: 물, 콜라, 오렌지 주스]
단, `clarification_options`를 사용할 때는 '어떤 부서를 원하세요?' 같은 광범위한 질문을 하면 안 됩니다. 오직 자기 부서의 필수 정보(예: 수건 개수, 룸서비스 종류)가 누락되었을 때만 그걸 채우기 위해 사용해 주세요."

---

## 🛠️ 개발 순서 및 작성 가이드 (AI 어시스턴트는 아래 4단계를 수행하세요)

AI 어시스턴트는 사용자가 요청한 부서(예: `HK`, `FB`, `FACILITY` 등)에 맞추어 아래 4개의 파일을 생성 및 수정해야 합니다. (이하 가이드는 `HK` 부서를 예시로 설명합니다.)

### Step 1. 시스템 프롬프트 생성 (`ai/app/prompts/{domain}_prompt.py`)
- 해당 부서의 AI가 지켜야 할 규칙(시스템 프롬프트)을 작성합니다. 한국어로 작성해도 무방하지만, **가급적 100% 영어로 번역하여 작성하는 것을 권장**합니다.
  - 💸 **비용 및 속도 최적화:** 한글 대비 토큰 소모량이 **절반(약 50%)**으로 줄어들어 API 비용이 아껴지고 응답 속도가 비약적으로 빨라집니다.
  - 🛡️ **치명적 에러 방지:** 영문으로 "Strictly output JSON" 지시를 내릴 경우, AI가 마크다운이나 인사말을 섞어 서버 파싱 에러(JSONDecodeError)를 낼 확률이 **거의 0%에 수렴**합니다. (단, 개발자가 읽을 `reasoning` 필드 등은 예외적으로 "KOREAN"으로 출력하라고 지시하세요.)
- **[매우 중요]** 출력 형식은 반드시 `ai/app/schemas/common.py` 에 정의된 `HotelRequestSchema` 에 맞추어 JSON 형식으로 응답하라고 지시해야 합니다.
- **[핵심 룰]** 대시보드 통계를 위해 `entities` 딕셔너리 안에 **`intent` 키를 무조건 포함**하라고 프롬프트에 명시하세요. (예: `{"intent": "TOWEL", "item": "수건", "count": 2}`)

### Step 2. 에이전트 엔진 생성 (`ai/app/core/{domain}_engine.py`)
- 복잡한 Gemini API 호출 코드를 직접 짜지 말고, **반드시 `app.infrastructure.gemini.client` 의 `call_gemini` 함수를 import 하여 사용**하세요.
- AI가 뱉어낸 응답을 `HotelRequestSchema` 로 Pydantic 검증(Validation)한 뒤 반환하는 로직을 작성하세요.
- 대화 맥락 기억을 위해 파라미터에 `chat_history: list = None` 을 추가하고, 이를 프롬프트에 조립하는 로직을 넣으세요.

*(엔진 뼈대 예시)*
```python
from app.infrastructure.gemini.client import call_gemini
from app.prompts.hk_prompt import HK_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

def run_hk_agent(user_message: str, chat_history: list = None) -> HotelRequestSchema:
    # 1. 과거 대화 맥락 조립 로직 (생략)
    # ...
    
    # 2. 공통 클라이언트로 Gemini 호출
    raw_result = call_gemini(
        prompt=final_prompt, 
        system_instruction=HK_SYSTEM_PROMPT
    )
    
    # 3. Pydantic 검증 및 반환
    result = HotelRequestSchema(**raw_result)
    return result
```

### Step 3. API 엔드포인트 플러그 생성 (`ai/app/api/v1/endpoints/{domain}.py`)
- 백엔드(Spring Boot) 서버가 이 도메인 에이전트를 호출할 수 있도록 FastAPI 엔드포인트를 만듭니다.
- 엔드포인트의 `response_model`은 `HotelRequestSchema` 이어야 합니다.

*(엔드포인트 뼈대 예시)*
```python
from fastapi import APIRouter
from app.core.hk_engine import run_hk_agent
from pydantic import BaseModel
from app.schemas.common import HotelRequestSchema
from typing import List

router = APIRouter()

class DomainRequest(BaseModel):
    message: str
    room_no: str
    chat_history: List[dict] = []

@router.post("/hk", response_model=HotelRequestSchema)
async def handle_hk_request(request: DomainRequest):
    return run_hk_agent(request.message, request.chat_history)
```

### Step 4. 메인 라우터(멀티탭)에 플러그 꽂기 (`ai/app/api/v1/router.py` 수정)
- 위에서 생성한 엔드포인트 라우터를 메인 앱에 등록합니다.
- **기존 코드를 지우지 말고**, 하단에 `include_router` 코드를 **추가**하기만 하세요.

*(추가 예시)*
```python
from fastapi import APIRouter
from app.api.v1.endpoints.router import router as router_endpoint
# 추가할 내용 1: 작성한 엔드포인트 가져오기
from app.api.v1.endpoints.hk import router as hk_endpoint 

api_router = APIRouter()

# 기존 메인 라우터
api_router.include_router(router_endpoint, tags=["router"])

# 추가할 내용 2: 멀티탭에 도메인 플러그 꽂기
api_router.include_router(hk_endpoint, prefix="/hk", tags=["housekeeping"])
```

---

**🤖 AI 어시스턴트 님, 위 룰을 완벽히 이해했다면 사용자가 요청한 부서명에 맞춰 4개의 스텝 코드를 순서대로 작성해 주세요.**
