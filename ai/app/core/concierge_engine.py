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
    
    try:
        # Gemini 호출
        raw = call_gemini(prompt=prompt, system_instruction=CONCIERGE_SYSTEM_PROMPT)
        
        # Pydantic 스키마 검증
        result = HotelRequestSchema(**raw)
    except Exception as e:
        print(f"[Concierge] ⚠️ 에러 발생: {e}")
        # 에러 발생 시 안전한 Fallback 응답 반환
        return {
            "request_id": "REQ_ERR",
            "room_no": room_no,
            "domain": "FRONT", # 에러 시 프론트로 이관
            "summary": "AI 처리 오류 (Fallback)",
            "priority": "NORMAL",
            "entities": {"intent": "OTHER", "error": str(e)},
            "confidence": 0.0,
            "guest_reply": "죄송합니다. 요청을 처리하는 중에 잠시 문제가 발생했습니다. 잠시 후 다시 말씀해 주시거나 프론트 데스크(내선 0번)로 연락 부탁드립니다.",
            "needs_clarification": False,
            "clarification_question": "",
            "clarification_options": [],
            "missing_fields": []
        }
    
    # 기본 응답 메시지 생성 (intent별 상세화는 단계 1에서 수행)
    intent = result.entities.get('intent')
    entities = result.entities
    
    if intent == 'TAXI':
        dest = entities.get('destination', '목적지')
        time = entities.get('time', '지금 바로')
        count = entities.get('passenger_count', '1')
        default_reply = f"{time}에 {dest}(으)로 가시는 택시({count}명)를 예약해 드릴까요? 배차 확인 후 안내해 드리겠습니다."
    elif intent == 'LUGGAGE_STORAGE':
        count = entities.get('count', '짐')
        action = "보관" if entities.get('action') == 'store' else "찾기"
        default_reply = f"짐 {count}개를 {action}하시겠습니까? 담당 직원이 곧 도움을 드리러 가겠습니다."
    elif intent == 'RESTAURANT':
        cuisine = entities.get('cuisine_type', '맛집')
        time = entities.get('time', '정해진 시간')
        default_reply = f"{time}에 주변의 괜찮은 {cuisine} 레스토랑 예약을 도와드릴까요? 추천 리스트를 뽑아보겠습니다."
    elif intent == 'TOUR_INFO':
        category = entities.get('category', '관광지')
        default_reply = f"멋진 {category} 장소들을 찾고 계시군요! 아늑이 엄선한 추천 명소를 안내해 드리겠습니다."
    elif intent == 'RESERVATION':
        target = entities.get('target', '요청하신 항목')
        time = entities.get('time', '정해진 시간')
        default_reply = f"{time}에 {target} 예약을 진행해 드릴까요? 확인 후 다시 연락드리겠습니다."
    elif intent == 'DELIVERY':
        item = entities.get('item', '물품')
        default_reply = f"요청하신 {item} 배달/전달 건을 확인했습니다. 도착 시 객실로 안내해 드리겠습니다."
    elif intent == 'WAKE_UP_CALL':
        time = entities.get('time', '정해진 시간')
        default_reply = f"네, {time}에 모닝콜을 예약해 드렸습니다. 편안한 밤 되세요!"
    elif intent == 'MEDICAL_INFO':
        m_type = "병원" if entities.get('type') == 'Hospital' else "약국"
        default_reply = f"근처에서 가장 가까운 {m_type}을(를) 안내해 드리겠습니다. 몸 상태가 많이 안 좋으시면 직원 호출을 눌러주세요."
    elif intent == 'POSTAL_SERVICE':
        item = entities.get('item', '우편물')
        default_reply = f"요청하신 {item} 발송 대행 업무를 도와드리겠습니다. 1층 컨시어지 데스크로 방문해 주시겠어요?"
    else:
        default_reply = f"요청하신 컨시어지 서비스({intent or '문의사항'})를 확인하였습니다. 담당 직원이 곧 안내해 드리겠습니다."
    
    # /analyze 응답 규격에 맞게 변환 (HotelRequestSchema 준수)
    return {
        "request_id": result.request_id if result.request_id else "REQ_TEMP",
        "room_no": room_no,
        "domain": "CONCIERGE",
        "summary": result.summary,
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
        "guest_reply": result.clarification_question if result.needs_clarification else default_reply,
        "needs_clarification": result.needs_clarification,
        "clarification_question": result.clarification_question,
        "clarification_options": result.clarification_options,
        "missing_fields": result.missing_fields
    }
