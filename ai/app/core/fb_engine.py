import httpx
from app.infrastructure.gemini.client import call_gemini
from app.prompts.fb_prompt import FB_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema
from app.domains.rag import service as rag_service

import os

def _fetch_menu_context() -> str:
    """백엔드 PMS API를 호출하여 메뉴 데이터를 가져와 프롬프트 컨텍스트로 변환"""
    try:
        # 환경 변수에 BACKEND_URL이 있으면 사용하고 (배포용), 없으면 로컬 도커 환경의 호스트 접근 주소를 사용
        base_url = os.getenv("BACKEND_URL", "http://host.docker.internal:8080")
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/pms/menus")
            
        if resp.status_code == 200:
            menus = resp.json()
            menu_lines = []
            for m in menus:
                name = m.get("name")
                price = m.get("price")
                category = m.get("category")
                allergens = m.get("allergens")
                allergy_str = f" (알러지: {allergens})" if allergens else ""
                menu_lines.append(f"- [{category}] {name}: {price:,}원{allergy_str}")
            return "\n".join(menu_lines)
        else:
            print(f"[FB Agent] 메뉴 조회 API 실패: HTTP {resp.status_code}")
            return "메뉴 정보를 현재 불러올 수 없습니다."
    except Exception as e:
        print(f"[FB Agent] 메뉴 조회 API 호출 중 오류 발생: {e}")
        return "메뉴 정보를 현재 불러올 수 없습니다. 프론트데스크로 문의 부탁드립니다."

def run_fb_agent(user_message: str, room_no: str = "unknown", chat_history: list = None) -> dict:
    """F&B 에이전트: 메뉴 조회, RAG 지식 결합, 2턴 주문 확인 로직 처리"""
    
    # 1. pms_menu 백엔드 조회
    menu_context = _fetch_menu_context()
    
    # 2. RAG 검색 → FB 도메인 지식 (운영시간, 기타 정책 등)
    rag_context = ""
    try:
        rag_results = rag_service.search_similar(
            query=user_message, domain_code="FB", top_k=3, threshold=0.5
        )
        if rag_results:
            rag_context = "\n".join([f"- {r['question']}: {r['answer']}" for r in rag_results])
    except Exception as e:
        print(f"[FB Agent] RAG 검색 실패: {e}")

    # 3. 대화 맥락 조립
    prompt = ""
    if menu_context:
        prompt += f"[Available Menu]\n{menu_context}\n\n"
        
    if rag_context:
        prompt += f"[FB Knowledge]\n{rag_context}\n\n"
        
    if chat_history:
        context = "\n".join([
            f"{'Guest' if m.get('role')=='user' else 'AI'}: {m.get('content')}"
            for m in chat_history[-5:]
        ])
        prompt += f"[Chat History]\n{context}\n\n"
    
    prompt += f"[Current Request]\nGuest: {user_message}"

    # 4. Gemini 호출
    raw = call_gemini(prompt=prompt, system_instruction=FB_SYSTEM_PROMPT)

    # 5. Pydantic 검증
    if "request_id" not in raw or raw["request_id"] == "auto":
        raw["request_id"] = "auto"
    if "room_no" not in raw or raw["room_no"] == "unknown":
        raw["room_no"] = room_no
    if "domain" not in raw:
        raw["domain"] = "FB"

    result = HotelRequestSchema(**raw)

    # 6. 자연스러운 응답 생성
    if result.needs_clarification:
        guest_reply = result.clarification_question
    else:
        # 주문 확정 시 자연스러운 응답
        if result.entities.get("intent") == "ROOM_SERVICE":
            guest_reply = "룸서비스 주문이 최종 접수되었습니다. 객실로 정성껏 준비하여 가져다 드리겠습니다."
        else:
            guest_reply = "요청하신 사항을 접수하였습니다. 담당 부서에서 확인 후 도와드리겠습니다."

    # 7. analyze.py 응답 포맷 반환 (needs_clarification 이면 domain_code=None으로 request 생성 방지)
    return {
        "guest_reply": guest_reply,
        "summary": result.summary,
        "domain_code": None if result.needs_clarification else "FB",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
    }
