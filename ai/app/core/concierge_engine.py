from app.infrastructure.gemini.client import call_gemini
from app.prompts.concierge_prompt import CONCIERGE_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

def run_concierge_agent(user_message: str, room_no: str = "", chat_history: list = None) -> dict:
    """
    컨시어지 에이전트 엔진 (Step 0-2)
    ───────────────────────────
    고객 메시지를 받아 Gemini를 호출하고, 컨시어지 도메인에 특화된 정보를 추출한다.
    """
    
    # 대화 맥락 조립 (최근 5개 메시지)
    if chat_history:
        context = "\n".join([
            f"{'고객' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[대화 맥락]\n{context}\n\n[현재 요청]\n고객: {user_message}"
    else:
        prompt = f"고객 객실: {room_no}\n고객 메시지: {user_message}"
    
    # Gemini 호출                                                                                                                                                                                                                                         
    raw = call_gemini(prompt=prompt, system_instruction=CONCIERGE_SYSTEM_PROMPT)
    
    # Pydantic 스키마 검증
    result = HotelRequestSchema(**raw)
    
    # 기본 응답 메시지 생성 (intent별 상세화는 단계 1에서 수행)
    default_reply = f"요청하신 컨시어지 서비스({result.entities.get('intent', '문의사항')})를 확인하였습니다. 담당 직원이 곧 안내해 드리겠습니다."
    
    # /analyze 응답 규격에 맞게 변환
    return {
        "guest_reply": result.clarification_question if result.needs_clarification else default_reply,
        "summary": result.summary,
        "domain_code": "CONCIERGE",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
    }
