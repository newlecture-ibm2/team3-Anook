"""
/analyze 엔드포인트 (인프라 브릿지)
─────────────────────────────────
백엔드(PythonAiHttpAdapter)가 호출하는 단일 진입점.

처리 흐름:
  1. RAG 지식 검색 (COMMON 도메인) → 매칭되면 즉시 응답
  2. 라우터 엔진으로 도메인 분류 (HK, FB, FACILITY 등)
  3-a. TASK → domain_code 찍어서 백엔드에 전달 (→ request 테이블 생성)
  3-b. CHITCHAT → 친절한 AI 응답만 반환 (→ request 생성 안 함)
  3-c. CLARIFICATION → 되묻기 응답 반환

※ 부서별 에이전트(intent/entities 파싱)는 팀원이 플러그인으로 추가 예정.
  지금은 라우터가 분류한 domain_code만 전달하고,
  entities는 빈 객체({})로 내려보냅니다.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from app.domains.rag import service as rag_service
from app.core.router_engine import route
from app.infrastructure.gemini.client import call_gemini, ai_log_meta_ctx
from app.utils.pii_masking import mask_pii, has_pii

router = APIRouter()


class AnalyzeRequest(BaseModel):
    text: str
    room_no: str
    language: Optional[str] = "ko"
    chat_history: List[dict] = []


# ── 부서별 에이전트 레지스트리 ──
# 팀원이 에이전트를 완성하면 여기에 등록합니다.
from app.core.facility_engine import run_facility_agent
from app.core.hk_engine import run_hk_agent
from app.core.concierge_engine import run_concierge_agent

DOMAIN_AGENTS: Dict[str, Any] = {
    "FACILITY": run_facility_agent,
    "HK": run_hk_agent,
    "CONCIERGE": run_concierge_agent,
    # "FB": run_fb_agent,
    # "CONCIERGE": run_concierge_agent,
    # "FRONT": run_front_agent,
    # "EMERGENCY": run_emergency_agent,
}

# ── 다국어 정적 멘트 딕셔너리 ──
STATIC_REPLIES = {
    "ESCALATION": {
        "ko": "죄송합니다. 정확한 파악이 어려워 즉시 프런트 데스크 직원에게 연결해 드리겠습니다.",
        "en": "I apologize, but I am having trouble understanding. I will connect you to the front desk immediately.",
        "ja": "申し訳ありません。正確な把握が難しいため、すぐにフロントデスクのスタッフにお繋ぎいたします。",
        "zh": "很抱歉，我很难准确理解您的需求。我将立即为您连接前台工作人员。"
    },
    "CLARIFICATION": {
        "ko": "죄송합니다, 조금 더 자세히 말씀해 주시겠어요? 어떤 도움이 필요하신지 알려주시면 바로 도와드리겠습니다.",
        "en": "I'm sorry, could you please provide more details? Let us know how we can help you, and we will assist you right away.",
        "ja": "申し訳ありませんが、もう少し詳しく教えていただけますか？どのようなご用件かお知らせいただければ、すぐに対応いたします。",
        "zh": "对不起，您能再详细说明一下吗？请告诉我们您需要什么帮助，我们会立即为您处理。"
    },
    "CANCEL": {
        "ko": "네, 가장 최근 요청을 취소 처리하겠습니다.",
        "en": "Okay, I will cancel your most recent request.",
        "ja": "はい、直近のリクエストをキャンセルいたします。",
        "zh": "好的，我将取消您最近的请求。"
    },
    "TASK_WAIT": {
        "ko": "네, 알겠습니다. 담당 부서에 요청을 전달하겠습니다. 잠시만 기다려 주세요.",
        "en": "Understood. I will forward your request to the department in charge. Please wait a moment.",
        "ja": "承知いたしました。担当部署にリクエストを転送いたします。少々お待ちください。",
        "zh": "好的，我将把您的请求转交给相关部门。请稍等片刻。"
    },
    "INFO_NOT_FOUND": {
        "ko": "죄송합니다, 해당 정보를 찾지 못했습니다. 프론트 데스크(내선 0번)로 문의해 주세요.",
        "en": "I'm sorry, I couldn't find that information. Please contact the front desk (extension 0).",
        "ja": "申し訳ありませんが、その情報が見つかりませんでした。フロントデスク（内線0番）までお問い合わせください。",
        "zh": "抱歉，我没有找到相关信息。请联系前台（分机0）。"
    },
    "ERROR": {
        "ko": "요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        "en": "A problem occurred while processing your request. Please try again later.",
        "ja": "リクエストの処理中に問題が発生しました。しばらくしてからもう一度お試しください。",
        "zh": "处理您的请求时出现问题。请稍后再试。"
    }
}

def _get_static_reply(key: str, lang: str) -> str:
    lang = lang.lower()
    if lang not in ["ko", "en", "ja", "zh"]:
        lang = "en"
    return STATIC_REPLIES.get(key, {}).get(lang, STATIC_REPLIES[key]["en"])


@router.post("/analyze")
async def analyze_message(request: AnalyzeRequest) -> Dict[str, Any]:
    """
    백엔드 PythonAiHttpAdapter가 호출하는 단일 분석 엔드포인트.
    """
    # 요청마다 컨텍스트 초기화
    ai_log_meta_ctx.set({})
    
    response = await _analyze_message_core(request)
    
    # ── [전역 무한 되묻기 방어 로직 (Global Clarification Counter)] ──
    # 라우터의 고정된 되묻기 뿐만 아니라, 부서별 에이전트가 던지는 동적 질문("수건 몇장?")까지 모두 포함하여
    # AI가 3번 연속으로 질문만 하고 요청(domain_code)을 확정짓지 못하는 경우 프론트로 강제 이관합니다.
    guest_reply = response.get("guest_reply", "").strip()
    is_clarification = (response.get("domain_code") is None) and ("?" in guest_reply)
    
    if is_clarification:
        consecutive_questions = 0
        for msg in reversed(request.chat_history):
            if msg.get("role") == "ai":
                content = msg.get("content", "").strip()
                # 과거 대화에서도 AI가 질문(?)을 던졌는지 확인
                if "?" in content:
                    consecutive_questions += 1
                else:
                    # 질문이 아닌 일반 안내문이나 요청 접수 완료 메시지라면 사이클 리셋
                    break
        
        # 이미 3번 연속으로 질문했다면 (이번이 4번째라면) 강제 이관
        if consecutive_questions >= 3:
            print(f"\n[Analyze] 🚨 연속 질문(되묻기) {consecutive_questions}회 누적으로 인한 FRONT 강제 이관 발동")
            response = {
                "guest_reply": _get_static_reply("ESCALATION", request.language),
                "summary": "추가 확인 실패 (강제 이관)",
                "domain_code": "FRONT",
                "priority": "NORMAL",
                "entities": {"intent": "ESCALATION"},
                "confidence": 0.0,
            }
    
    # ── [비동기 로깅 메타데이터 주입] ──
    meta = ai_log_meta_ctx.get()
    if meta:
        meta["is_fallback"] = (response.get("domain_code") == "FRONT" or response.get("confidence", 1.0) < 0.4)
        response["ai_log_meta"] = meta
        
    return response


async def _analyze_message_core(request: AnalyzeRequest) -> Dict[str, Any]:
    print(f"\n[Analyze] 📩 요청 수신 - Room: {request.room_no}, Text: '{request.text}'")

    # ── [PII 마스킹] 개인정보 선제 방어 ──
    # Gemini로 보내기 전에 전화번호, 이메일, 여권 등 민감 정보를 마스킹
    original_text = request.text
    if has_pii(request.text):
        request.text = mask_pii(request.text)
        print(f"[Analyze] 🛡️ PII 마스킹 적용: '{original_text}' → '{request.text}'")

    if request.chat_history:
        print(f"[Analyze] 📚 수신된 대화 맥락({len(request.chat_history)}개): {request.chat_history}")
    else:
        print("[Analyze] 📚 수신된 대화 맥락: 없음 (첫 대화 또는 DB 조회 실패)")

    # ──────────────────────────────────────────────
    # STEP 1: RAG 지식 검색 (COMMON 도메인 우선)
    # ──────────────────────────────────────────────
    try:
        rag_results = rag_service.search_similar(
            query=request.text, domain_code="COMMON", top_k=1, threshold=0.7
        )
        if rag_results:
            best = rag_results[0]
            response = {
                "guest_reply": best["answer"],
                "summary": "지식 기반 응답",
                "domain_code": None,       # 지식 응답은 요청 생성 안 함
                "priority": "NORMAL",
                "entities": {},
                "confidence": best["similarity"],
            }
            print(f"\n[Analyze] ✅ RAG 매칭 (유사도: {best['similarity']:.2f})")
            print(f"[Analyze] 응답: {response}\n")
            return response
    except Exception as e:
        print(f"[Analyze] ⚠️ RAG 검색 실패 (무시하고 라우터로 진행): {e}")

    # ──────────────────────────────────────────────
    # STEP 2: 라우터 엔진으로 도메인 분류
    # ──────────────────────────────────────────────
    try:
        router_results = route(request.text, request.chat_history)
        print(f"\n[Analyze] 🔀 라우터 결과: {[{'mode': r.mode, 'domain': r.domain, 'confidence': r.confidence} for r in router_results]}")
    except Exception as e:
        print(f"[Analyze] ❌ 라우터 실패: {e}")
        return _fallback_response(_get_static_reply("ERROR", request.language))

    # 첫 번째 분류 결과를 기준으로 처리 (멀티 인텐트는 추후 확장)
    primary = router_results[0]

    # ──────────────────────────────────────────────
    # STEP 3-a: TASK → 부서로 라우팅
    # ──────────────────────────────────────────────
    if primary.mode == "TASK" and primary.domain:
        domain = primary.domain

        # 부서별 에이전트가 등록되어 있으면 호출 (플러그 앤 플레이)
        if domain in DOMAIN_AGENTS:
            try:
                agent_result = DOMAIN_AGENTS[domain](
                    user_message=request.text, 
                    room_no=request.room_no, 
                    chat_history=request.chat_history
                )
                agent_confidence = agent_result.get("confidence", primary.confidence)
                final_domain_code = agent_result.get("domain_code", domain)
                final_entities = agent_result.get("entities", {})
                final_guest_reply = agent_result.get("guest_reply", "요청을 접수하였습니다.")
                final_summary = agent_result.get("summary", f"{domain} 요청")

                # 🚨 [글로벌 이관 로직] 부서 에이전트의 확신도가 0.4 미만이면 무조건 프론트 직원에게 강제 이관
                if agent_confidence < 0.4:
                    final_domain_code = "FRONT"
                    final_entities["intent"] = "ESCALATION"
                    # 만약 agent가 만든 응답에 이미 직원을 언급했다면 그대로 두고, 아니면 이관 멘트로 덮어씀
                    if not any(word in final_guest_reply for word in ["직원", "연결", "안내", "프런트", "staff", "front", "スタッフ", "前台"]):
                        final_guest_reply = _get_static_reply("ESCALATION", request.language)

                response = {
                    "guest_reply": final_guest_reply,
                    "summary": final_summary,
                    "domain_code": final_domain_code,
                    "priority": agent_result.get("priority", "NORMAL"),
                    "entities": final_entities,
                    "confidence": agent_confidence,
                    "action_type": primary.action_type,
                }
                print(f"[Analyze] ✅ {domain} 에이전트 처리 완료")
                print(f"[Analyze] 응답: {response}\n")
                return response
            except Exception as e:
                print(f"[Analyze] ⚠️ {domain} 에이전트 실패: {e}")

        # 에이전트 미등록 시 → domain_code만 찍어서 전달 (인프라 기본 동작)
        response = {
            "guest_reply": _get_static_reply("TASK_WAIT", request.language),
            "summary": f"{domain} 부서 요청 접수",
            "domain_code": domain,
            "priority": "NORMAL",
            "entities": {},
            "confidence": primary.confidence,
            "action_type": primary.action_type,
        }
        print(f"[Analyze] 📌 TASK → domain: {domain} (에이전트 미등록, 기본 응답)")
        print(f"[Analyze] 응답: {response}\n")
        return response

    # ──────────────────────────────────────────────
    # STEP 3-b: CHITCHAT → 일상 대화 응답
    # ──────────────────────────────────────────────
    if primary.mode == "CHITCHAT":
        try:
            raw = call_gemini(
                prompt=f"고객 메시지: {request.text}",
                system_instruction=(
                    f"당신은 아눅(Anook) 호텔의 친절한 AI 컨시어지입니다. "
                    f"고객의 인사나 일상 대화에 따뜻하고 간결하게 답변하되, 반드시 고객이 사용한 언어(또는 {request.language} 언어)로 대답하세요. "
                    f'반드시 {{"reply": "답변내용"}} 형식의 JSON으로만 출력하세요.'
                ),
            )
            guest_reply = raw.get("reply", "Hello! I am the Anook Hotel Concierge. Please let me know how I can help you.")
        except Exception:
            guest_reply = "Hello! I am the Anook Hotel Concierge. Please let me know how I can help you."

        response = {
            "guest_reply": guest_reply,
            "summary": "일상 대화",
            "domain_code": None,
            "priority": "NORMAL",
            "entities": {},
            "confidence": primary.confidence,
        }
        print(f"[Analyze] 💬 CHITCHAT 응답")
        print(f"[Analyze] 응답: {response}\n")
        return response

    # ──────────────────────────────────────────────
    # STEP 3-c: CLARIFICATION → 되묻기
    # ──────────────────────────────────────────────
    if primary.mode == "CLARIFICATION":
        response = {
            "guest_reply": _get_static_reply("CLARIFICATION", request.language),
            "summary": "추가 확인 필요",
            "domain_code": None,
            "priority": "NORMAL",
            "entities": {},
            "confidence": primary.confidence,
        }
        print(f"[Analyze] ❓ CLARIFICATION — reasoning: {primary.reasoning}")
        print(f"[Analyze] 응답: {response}\n")
        return response

    # ──────────────────────────────────────────────
    # STEP 3-d: INFO → RAG 지식 기반 답변 (요청 미생성)
    # ──────────────────────────────────────────────
    if primary.mode == "INFO":
        domain = primary.domain or "FRONT"
        try:
            rag_results = rag_service.search_similar(request.text, domain_code=domain, top_k=3, threshold=0.5)
            if rag_results:
                knowledge = "\n".join([f"Q: {r['question']}\nA: {r['answer']}" for r in rag_results])
                info_prompt = (
                    f"고객 질문: {request.text}\n\n"
                    f"아래 제공된 [호텔 지식]만을 바탕으로, 반드시 고객의 질문에 사용된 언어(또는 {request.language} 언어)로 친절하게 답변하세요. "
                    f"만약 [호텔 지식]에 고객의 질문에 대한 명확한 답이 없다면, 절대 유추하거나 지어내지 말고 "
                    f"'{_get_static_reply('INFO_NOT_FOUND', request.language)}' 라는 문장을 그대로 답변으로 사용하세요.\n\n"
                    f"[호텔 지식]\n{knowledge}"
                )
                raw = call_gemini(
                    prompt=info_prompt, 
                    system_instruction='당신은 친절한 아눅(Anook) 호텔 컨시어지입니다. 반드시 {"reply": "답변내용"} 형식의 JSON으로만 출력하세요.'
                )
                guest_reply = raw.get("reply", _get_static_reply("INFO_NOT_FOUND", request.language))
            else:
                # 💡 [Smart Fallback] 지식 검색 결과가 없지만 컨시어지 관련 질문인 경우
                # 에이전트(Gemini)가 대화 맥락을 통해 직접 판단하여 응답하도록 처리
                if domain == "CONCIERGE" and "CONCIERGE" in DOMAIN_AGENTS:
                    print(f"[Analyze] 💡 INFO → RAG 결과 없음. CONCIERGE 에이전트 폴백 실행")
                    agent_result = DOMAIN_AGENTS["CONCIERGE"](
                        user_message=request.text,
                        room_no=request.room_no,
                        chat_history=request.chat_history
                    )
                    guest_reply = agent_result.get("guest_reply", _get_static_reply("INFO_NOT_FOUND", request.language))
                else:
                    guest_reply = _get_static_reply("INFO_NOT_FOUND", request.language)
        except Exception as e:
            print(f"[Analyze] ⚠️ INFO 처리 중 에러 발생 (RAG/Fallback): {e}")
            guest_reply = _get_static_reply("INFO_NOT_FOUND", request.language)

        info_not_found_msg = _get_static_reply("INFO_NOT_FOUND", request.language)
        if guest_reply == info_not_found_msg:
            # AI가 답을 모르는 정보성 질문일 경우, 0번 전화 안내로 끝내지 않고 프론트데스크로 이관
            response = {
                "guest_reply": _get_static_reply("ESCALATION", request.language),
                "summary": "AI 미학습 정보 (직원 연결)",
                "domain_code": "FRONT",
                "priority": "NORMAL",
                "entities": {"intent": "ESCALATION"},
                "confidence": 0.0,
            }
        else:
            response = {
                "guest_reply": guest_reply,
                "summary": "정보 문의",
                "domain_code": None,  # 정상적인 지식 기반 답변일 때는 요청 미생성
                "priority": "NORMAL",
                "entities": {},
                "confidence": primary.confidence,
            }
            
        print(f"[Analyze] ℹ️ INFO 응답")
        print(f"[Analyze] 응답: {response}\n")
        return response

    # ──────────────────────────────────────────────
    # STEP 3-e: CANCEL → 요청 취소
    # ──────────────────────────────────────────────
    if primary.mode == "CANCEL":
        response = {
            "guest_reply": _get_static_reply("CANCEL", request.language),
            "summary": "요청 취소",
            "domain_code": None,
            "priority": "NORMAL",
            "entities": {},
            "confidence": primary.confidence,
            "action": "CANCEL_REQUEST",
        }
        print(f"[Analyze] 🚫 CANCEL 응답")
        print(f"[Analyze] 응답: {response}\n")
        return response

    return _fallback_response(_get_static_reply("ERROR", request.language))


def _fallback_response(message: str) -> Dict[str, Any]:
    """에러 발생 시 안전한 폴백 응답"""
    return {
        "guest_reply": message,
        "summary": "에러 발생",
        "domain_code": None,
        "priority": "NORMAL",
        "entities": {},
        "confidence": 0.0,
    }
