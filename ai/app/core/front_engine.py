"""
프론트데스크 AI 엔진
"""
from app.infrastructure.gemini.client import call_gemini_async
from app.prompts.front_prompt import FRONT_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

async def run_front_agent(user_message: str, room_no: str = "", chat_history: list = None) -> dict:
    """프론트데스크 에이전트: 고객 메시지에서 프론트 관련 정보를 추출"""
    
    if chat_history:
        context = "\n".join([
            f"{'고객' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[대화 맥락]\n{context}\n\n[현재 요청]\n고객: {user_message}"
    else:
        prompt = f"고객 객실: {room_no}\n고객 메시지: {user_message}"
    
    raw = await call_gemini_async(prompt=prompt, system_instruction=FRONT_SYSTEM_PROMPT)
    
    # 방어 로직: 배열로 오면 첫 번째 요소 추출
    if isinstance(raw, list):
        raw = raw[0] if raw else {}

    # 필수 필드 주입 방어 로직 (Pydantic 에러 방지)
    if "request_id" not in raw or raw["request_id"] == "auto":
        raw["request_id"] = "auto"
    if "room_no" not in raw or raw["room_no"] == "unknown" or raw["room_no"] is None:
        raw["room_no"] = room_no
    if "domain" not in raw or raw["domain"] is None:
        raw["domain"] = "FRONT"

    # Pydantic 검증
    result = HotelRequestSchema(**raw)
    
    # 챗봇 응답(guest_reply) 분기 처리
    guest_reply = "프론트데스크에서 확인 후 처리해 드리겠습니다."
    if result.needs_clarification:
        guest_reply = result.clarification_question
    elif result.entities.get("intent") == "ESCALATION":
        guest_reply = result.entities.get("fallback_message", "프론트데스크 직원에게 즉시 연결해 드리겠습니다. 잠시만 기다려주세요.")

    # /analyze 응답 형태로 변환
    return {
        "guest_reply": guest_reply,
        "clarification_options": result.clarification_options,
        "summary": result.summary,
        "domain_code": "FRONT",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
        "missing_fields": result.missing_fields,
    }
