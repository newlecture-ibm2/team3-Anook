from app.infrastructure.gemini.client import call_gemini
from app.prompts.facility_prompt import FACILITY_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

def run_facility_agent(user_message: str, room_no: str = "", chat_history: list = None) -> dict:
    """시설관리 에이전트: 고객 메시지에서 시설/수리 관련 정보를 추출"""
    
    if chat_history:
        context = "\n".join([
            f"{'고객' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[대화 맥락]\n{context}\n\n[현재 요청]\n고객: {user_message}"
    else:
        prompt = f"고객 객실: {room_no}\n고객 메시지: {user_message}"
    
    raw = call_gemini(prompt=prompt, system_instruction=FACILITY_SYSTEM_PROMPT)
    
    # Pydantic 검증
    result = HotelRequestSchema(**raw)
    
    # 기본 접수 응답 메시지 생성
    symptom = result.entities.get('symptom', '불편 사항')
    default_reply = f"접수되었습니다. 담당 부서에서 객실로 방문하여 {symptom}을(를) 확인 및 조치해 드리겠습니다."
    
    # /analyze 응답 형태로 변환
    return {
        "guest_reply": result.clarification_question if result.needs_clarification else default_reply,
        "summary": result.summary,
        "domain_code": "FACILITY",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
    }
