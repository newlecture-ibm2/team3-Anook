from app.infrastructure.gemini.client import call_gemini
from app.prompts.facility_prompt import FACILITY_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema

# ── 대상물(equipment) 정규화 매핑 ──
# 고객이 같은 설비를 다양하게 부르는 경우를 통일
EQUIPMENT_ALIASES = {
    # 냉난방
    "냉방기": "에어컨", "에어콘": "에어컨", "AC": "에어컨", "aircon": "에어컨",
    "히터": "난방기", "온풍기": "난방기", "라디에이터": "난방기",
    # 수도/배관
    "양변기": "변기", "화장실 변기": "변기",
    "수도꼭지": "수전", "세면대 수도": "수전",
    # 네트워크
    "wifi": "와이파이", "WiFi": "와이파이", "인터넷": "와이파이", "무선랜": "와이파이",
    # 가전
    "텔레비전": "TV", "티비": "TV",
    "드라이기": "헤어드라이어", "드라이어": "헤어드라이어",
    "커피포트": "전기포트", "포트": "전기포트",
    "미니바": "냉장고",
    "블라인드": "커튼",
}


def _normalize_equipment(equipment: str) -> str:
    """대상물 이름을 정규화된 표준명으로 변환"""
    return EQUIPMENT_ALIASES.get(equipment, equipment)


def _build_guest_reply(result: HotelRequestSchema) -> str:
    """priority와 추출된 entity를 활용하여 자연스러운 고객 응답 메시지 생성"""
    if result.needs_clarification:
        return result.clarification_question

    if getattr(result, "final_reply", ""):
        return result.final_reply

    equipment = result.entities.get('equipment', '해당 시설')
    symptom = result.entities.get('symptom', '불편 사항')
    location = result.entities.get('location', '객실')
    priority = result.priority

    if priority == "URGENT":
        return (
            f"긴급 접수되었습니다! {location}의 {equipment} 문제({symptom})로 "
            f"시설팀이 즉시 출동합니다. 안전에 유의해 주세요."
        )
    elif priority == "HIGH":
        return (
            f"접수되었습니다. {location}의 {equipment} {symptom} 문제를 "
            f"시설팀이 우선적으로 방문하여 조치하겠습니다."
        )
    else:
        return (
            f"접수되었습니다. {location}의 {equipment} {symptom} 건으로 "
            f"시설팀이 방문하여 확인해 드리겠습니다."
        )


def run_facility_agent(user_message: str, room_no: str, chat_history: list = None) -> dict:
    """시설관리 에이전트: 고객 메시지에서 시설/수리 관련 정보를 추출"""
    
    if chat_history:
        context = "\n".join([
            f"{'고객' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt = f"[대화 맥락]\n{context}\n\n[현재 요청]\n고객(객실 {room_no}): {user_message}"
    else:
        prompt = f"고객 객실: {room_no}\n고객 메시지: {user_message}"
    
    raw = call_gemini(prompt=prompt, system_instruction=FACILITY_SYSTEM_PROMPT)
    
    # AI가 룸넘버를 누락할 경우를 대비한 안전 장치 (백엔드에서 받은 room_no 강제 주입)
    if "room_no" not in raw or raw["room_no"] in ["unknown", "", "from input"]:
        raw["room_no"] = room_no

    # Pydantic 검증
    result = HotelRequestSchema(**raw)
    
    # 대상물(equipment) 정규화
    if 'equipment' in result.entities:
        result.entities['equipment'] = _normalize_equipment(result.entities['equipment'])
    
    # /analyze 응답 형태로 변환
    return {
        "guest_reply": _build_guest_reply(result),
        "summary": result.summary,
        "domain_code": None if result.needs_clarification else "FACILITY",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
        "clarification_options": result.clarification_options,
    }
