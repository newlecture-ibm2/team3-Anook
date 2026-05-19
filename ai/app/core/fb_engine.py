# pyrefly: ignore [missing-import]
import httpx
import asyncio
from app.infrastructure.gemini.client import call_gemini_async
from app.prompts.fb_prompt import FB_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema
from app.domains.rag import service as rag_service

import os

def _fetch_menu_context() -> str:
    """백엔드 PMS API를 호출하여 메뉴 데이터를 가져와 프롬프트 컨텍스트로 변환"""
    try:
        # 환경 변수에 BACKEND_URL이 있으면 사용하고 (배포용), 없으면 로컬 도커 환경의 호스트 접근 주소를 사용
        base_url = os.getenv("BACKEND_URL", "http://localhost:8080")
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/pms/menus")
            
        if resp.status_code == 200:
            menus = resp.json()
            # 중복 메뉴 제거 (name 기준)
            seen = set()
            unique_menus = []
            for m in menus:
                if m.get("name") not in seen:
                    seen.add(m.get("name"))
                    unique_menus.append(m)

            menu_lines = []
            for m in unique_menus:
                name = m.get("name")
                price = m.get("price")
                category = m.get("category")
                allergens = m.get("allergens")
                options = m.get("options")
                allergy_str = f" (알러지: {allergens})" if allergens else ""
                
                # 프롬프트의 REQUIRED OPTION RULE에 맞게 포맷 유지: [선택옵션] 카테고리:옵션1|옵션2
                if options:
                    option_str = f" [선택옵션] {options}"
                else:
                    option_str = ""
                    
                menu_lines.append(f"- [{category}] {name}: {price:,}원{allergy_str}{option_str}")
            return "\n".join(menu_lines)
        else:
            print(f"[FB Agent] 메뉴 조회 API 실패: HTTP {resp.status_code}")
            return "메뉴 정보를 현재 불러올 수 없습니다."
    except Exception as e:
        print(f"[FB Agent] 메뉴 조회 API 호출 중 오류 발생: {e}")
        return "메뉴 정보를 현재 불러올 수 없습니다. 프론트데스크로 문의 부탁드립니다."

async def run_fb_agent(user_message: str, room_no: str, chat_history: list = None, images: list = None, system_language: str = "ko") -> dict:
    """F&B 에이전트: 메뉴 조회, RAG 지식 결합, 2턴 주문 확인 로직 처리"""
    
    # 1. pms_menu 백엔드 조회
    menu_context = await asyncio.to_thread(_fetch_menu_context)
    
    # 2. RAG 검색 → FB 도메인 지식 (운영시간, 기타 정책 등)
    rag_context = ""
    try:
        rag_results = rag_service.search_hybrid(
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
    system_instruction_with_lang = FB_SYSTEM_PROMPT.replace("{system_language}", system_language)
    raw = await call_gemini_async(prompt=prompt, system_instruction=system_instruction_with_lang, images=images)

    # 5. Pydantic 검증
    if "request_id" not in raw or raw["request_id"] == "auto":
        raw["request_id"] = "auto"
    if "room_no" not in raw or raw["room_no"] == "unknown":
        raw["room_no"] = room_no
    if "domain" not in raw:
        raw["domain"] = "FB"
        
    # AI가 명시적으로 null을 반환한 경우 키를 제거하여 Pydantic의 기본값이 적용되도록 함
    raw = {k: v for k, v in raw.items() if v is not None}

    result = HotelRequestSchema(**raw)

    # 6. SPENDING_INQUIRY → 백엔드 API 호출로 실시간 데이터 기반 응답 생성
    if result.entities.get("intent") == "SPENDING_INQUIRY":
        guest_reply = await asyncio.to_thread(_handle_spending_inquiry, room_no, user_message)
        return {
            "guest_reply": guest_reply,
            "summary": "룸서비스 이용 금액 조회",
            "domain_code": None,  # 정보 조회일 뿐, request 생성 불필요
            "priority": "NORMAL",
            "entities": {"intent": "SPENDING_INQUIRY"},
            "confidence": result.confidence,
        }

    # 7. 자연스러운 응답 생성
    if result.needs_clarification:
        guest_reply = result.clarification_question
    else:
        # 주문 확정 시 AI가 고객 언어로 작성한 final_reply 사용 (다국어 미러링)
        guest_reply = result.final_reply or "룸서비스 주문이 접수되었습니다."

    # 8. analyze.py 응답 포맷 반환 (needs_clarification 이면 domain_code=None으로 request 생성 방지)
    return {
        "guest_reply": guest_reply,
        "summary": result.summary,
        "domain_code": None if result.needs_clarification else "FB",
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
        "missing_fields": getattr(result, "missing_fields", []),
        "clarification_options": getattr(result, "clarification_options", []),
        "reasoning": result.reasoning,
    }


def _handle_spending_inquiry(room_no: str, user_message: str) -> str:
    """백엔드 영수증 요약 API를 호출하여 이용 금액 안내 메시지를 생성"""
    try:
        base_url = os.getenv("BACKEND_URL", "http://localhost:8080")
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/fb/receipts/room/{room_no}/summary")

        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])
            total = data.get("totalAmount", 0)

            if not items:
                return "현재까지 룸서비스 이용 내역이 없습니다."

            # 항목별 내역 구성
            lines = []
            for item in items:
                name = item.get("menuName", "")
                qty = item.get("quantity", 0)
                price = item.get("totalPrice", 0)
                lines.append(f"- {name} {qty}개: {price:,}원")

            detail = "\n".join(lines)

            # 고객 언어 감지 (간단한 휴리스틱)
            is_english = any(c.isascii() and c.isalpha() for c in user_message) and not any('\uac00' <= c <= '\ud7a3' for c in user_message)

            if is_english:
                return f"Here is your room service usage so far:\n{detail}\n\nTotal: {total:,} KRW"
            else:
                return f"현재까지 룸서비스 이용 내역입니다:\n{detail}\n\n총 금액: {total:,}원"
        else:
            print(f"[FB Agent] 영수증 조회 API 실패: HTTP {resp.status_code}")
            return "이용 내역 조회 중 오류가 발생했습니다. 프론트데스크로 문의 부탁드립니다."
    except Exception as e:
        print(f"[FB Agent] 영수증 조회 API 호출 중 오류 발생: {e}")
        return "이용 내역 조회 중 오류가 발생했습니다. 프론트데스크로 문의 부탁드립니다."
