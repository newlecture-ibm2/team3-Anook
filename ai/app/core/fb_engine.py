# pyrefly: ignore [missing-import]
import httpx
import asyncio
from app.infrastructure.gemini.client import call_gemini_async
from app.prompts.fb_prompt import FB_SYSTEM_PROMPT
from app.schemas.common import HotelRequestSchema
from app.domains.rag import service as rag_service

import os

def _fetch_menu_context(system_language: str = "ko") -> str:
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
                
                # 프롬프트의 REQUIRED OPTION RULE에 맞게 포맷 유지
                option_str = ""
                if options and isinstance(options, list):
                    opt_list = []
                    for opt in options:
                        req_label = "[필수옵션]" if opt.get("isRequired") else "[선택옵션]"
                        items = "|".join(opt.get("items", []))
                        opt_list.append(f"{req_label} {opt.get('groupName')}:{items}")
                    option_str = " " + " / ".join(opt_list)
                    
                price_usd = m.get("priceUsd")
                if price_usd is None:
                    price_usd = price / 1400.0

                if system_language == "ko":
                    price_str = f"{int(price):,}원 (${round(price_usd)})"
                else:
                    price_str = f"${round(price_usd)} ({int(price):,}원)"
                    
                menu_lines.append(f"- [{category}] {name}: {price_str}{allergy_str}{option_str}")
            return "\n".join(menu_lines)
        else:
            print(f"[FB Agent] 메뉴 조회 API 실패: HTTP {resp.status_code}")
            return "메뉴 정보를 현재 불러올 수 없습니다."
    except Exception as e:
        print(f"[FB Agent] 메뉴 조회 API 호출 중 오류 발생: {e}")
        return "메뉴 정보를 현재 불러올 수 없습니다. 프론트데스크로 문의 부탁드립니다."

async def run_fb_agent(user_message: str, room_no: str, chat_history: list = None, images: list = None, system_language: str = "ko", active_requests: list = None) -> dict:
    """F&B 에이전트: 메뉴 조회, RAG 지식 결합, 2턴 주문 확인 로직 처리"""
    
    # 1. pms_menu 백엔드 조회
    menu_context = await asyncio.to_thread(_fetch_menu_context, system_language)
    
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
    
    if isinstance(raw, list):
        if not raw:
            raise ValueError("AI returned an empty list")
        raw = raw[0]

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
        guest_reply = await asyncio.to_thread(_handle_spending_inquiry, room_no, user_message, system_language)
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

    # 8. analyze.py 응답 포맷 반환
    # [AN-344] 더블체크 UX 제거:
    # - missing_fields가 비어있고 intent가 ROOM_SERVICE인 확인 질문 단계에서는
    #   domain_code="FB"를 유지하여 티켓을 생성함 → 백엔드에서 graceRemaining=-1 설정
    #   → 프론트에서 정적 RequestCard(취소/진행 버튼)가 확인 질문과 함께 표시됨
    # - missing_fields가 있거나 정보 문의(MENU_INQUIRY 등)인 경우에만 domain_code=None
    missing = getattr(result, "missing_fields", [])
    intent = result.entities.get("intent", "")
    is_order_intent = intent in ("ROOM_SERVICE", "ORDER_MODIFY")
    
    # [AN-344] 룸서비스 주문 목록 존재 여부 검증 (유효한 수량의 아이템이 1개 이상 필요)
    menu_items = result.entities.get("menu_items", [])
    has_items = False
    if isinstance(menu_items, list) and len(menu_items) > 0:
        has_items = any(
            isinstance(item, dict) and item.get("quantity", 0) > 0 
            for item in menu_items
        )
        
    is_ready_for_confirm = (
        result.needs_clarification 
        and not missing 
        and is_order_intent 
        and has_items
    )

    if is_ready_for_confirm:
        # 확인 질문 + 정적 카드를 동시에 표시 (더블체크 제거)
        domain_code = "FB"
    elif result.needs_clarification:
        # 아직 정보가 부족하거나, 정보 문의 → 티켓 생성 방지
        domain_code = None
    else:
        # 최종 확정 (고객이 "네" 응답 후) → 기존 흐름 유지
        domain_code = "FB"

    return {
        "guest_reply": guest_reply,
        "summary": result.summary,
        "domain_code": domain_code,
        "priority": result.priority,
        "entities": result.entities,
        "confidence": result.confidence,
        "missing_fields": missing,
        "clarification_options": getattr(result, "clarification_options", []),
        "reasoning": result.reasoning,
        "action_type": result.entities.get("action_type", "ADD"),
    }


def _handle_spending_inquiry(room_no: str, user_message: str, system_language: str = "ko") -> str:
    """백엔드 영수증 요약 API를 호출하여 이용 금액 안내 메시지를 생성"""
    try:
        base_url = os.getenv("BACKEND_URL", "http://localhost:8080")
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{base_url}/pms/billing/summary?roomNo={room_no}&category=ALL")

        if resp.status_code == 200:
            data = resp.json()
            items = data.get("items", [])

            if not items:
                if system_language == "ko":
                    return "현재까지 룸서비스 이용 내역이 없습니다."
                else:
                    return "There are no room service charges recorded for your room at this time."

            # F&B 이외의 다른 부서(HK 등) 유료 서비스 내역이 존재하는지 검사
            fb_categories = {"MAIN", "SIDE", "DRINK", "DESSERT"}
            has_other_dept_charges = False
            for item in items:
                item_cat = item.get("category", "").upper()
                if item_cat not in fb_categories:
                    has_other_dept_charges = True
                    break

            # F&B 외의 유료 내역이 존재하면 반려(Reject)
            if has_other_dept_charges:
                if system_language == "ko":
                    return "현재 룸서비스 외에 하우스키핑 등 다른 부서의 유료 서비스 이용 내역이 존재합니다. 정확한 확인을 위해 전체 요금 조회를 요청해 주시기 바랍니다."
                else:
                    return "You have charges from other departments (such as Housekeeping) besides Room Service. Please request a full billing summary for complete details."

            # F&B 내역만 존재하는 경우 항목별 내역 구성
            lines = []
            for item in items:
                name = item.get("menuName", "")
                qty = item.get("quantity", 0)
                price_krw = item.get("totalPriceKrw", 0)
                price_usd = item.get("totalPriceUsd", 0)

                if system_language == "ko":
                    lines.append(f"- {name} {qty}개: {int(price_krw):,}원 (${price_usd:.2f})")
                else:
                    lines.append(f"- {name} x{qty}: ${price_usd:.2f} ({int(price_krw):,}원)")

            detail = "\n".join(lines)
            total_krw = data.get("totalAmountKrw", 0)
            total_usd = data.get("totalAmountUsd", 0)

            if system_language == "ko":
                return f"현재까지 룸서비스 이용 내역입니다:\n{detail}\n\n결제 예정 금액 : {int(total_krw):,}원 (${total_usd:.2f})"
            else:
                return f"Here is your room service usage so far:\n{detail}\n\nTotal Price : ${total_usd:.2f}({int(total_krw):,}원)"
        else:
            print(f"[FB Agent] 영수증 조회 API 실패: HTTP {resp.status_code}")
            if system_language == "ko":
                return "이용 내역 조회 중 오류가 발생했습니다. 프론트데스크로 문의 부탁드립니다."
            else:
                return "We encountered an error retrieving your billing information. Please contact the front desk."
    except Exception as e:
        print(f"[FB Agent] 영수증 조회 API 호출 중 오류 발생: {e}")
        if system_language == "ko":
            return "이용 내역 조회 중 오류가 발생했습니다. 프론트데스크로 문의 부탁드립니다."
        else:
            return "We encountered an error retrieving your billing information. Please contact the front desk."
