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
from app.core.fb_engine import run_fb_agent

DOMAIN_AGENTS: Dict[str, Any] = {
    "FACILITY": run_facility_agent,
    "HK": run_hk_agent,
    "CONCIERGE": run_concierge_agent,
    "FB": run_fb_agent,
    # "CONCIERGE": run_concierge_agent,
    # "FRONT": run_front_agent,
    # "EMERGENCY": run_emergency_agent,
}

# ── 다국어 정적 멘트 딕셔너리 ──
STATIC_REPLIES = {
    "ESCALATION": {
        "ko": "제가 바로 답변드리기 어려운 부분이라, 프런트 데스크 직원에게 바로 연결해 드릴게요. 잠시만 기다려 주세요!",
        "en": "I'll connect you to the front desk right away to assist you further. Please hold on a moment!",
        "ja": "私ではすぐにお答えするのが難しいため、すぐにフロントデスクのスタッフにお繋ぎいたしますね。少々お待ちくださいませ！",
        "zh": "这个问题我马上为您连接前台工作人员，请您稍等片刻！"
    },
    "CLARIFICATION": {
        "ko": "어떤 말씀이신지 조금만 더 자세히 알려주시겠어요? 말씀해주시면 바로 도와드릴게요!",
        "en": "Could you tell me a bit more about what you need? I'd be happy to help you right away!",
        "ja": "もう少し詳しく教えていただけますでしょうか？お伺いでき次第、すぐに対応させていただきます！",
        "zh": "您能再稍微详细地告诉我一下吗？了解后我会立刻为您处理的！"
    },
    "CANCEL": {
        "ko": "네, 방금 말씀하신 요청은 바로 취소해 드릴게요.",
        "en": "Sure, I'll go ahead and cancel your most recent request.",
        "ja": "はい、先ほどのリクエストはすぐにキャンセルさせていただきますね。",
        "zh": "好的，我马上为您取消刚才的请求。"
    },
    "TASK_WAIT": {
        "ko": "네, 알겠습니다! 담당 부서로 빠르게 전달해 드릴게요. 조금만 기다려 주세요.",
        "en": "Got it! I'll pass this on to the right department right away. Please give us just a moment.",
        "ja": "かしこまりました！担当部署にすぐお伝えいたしますね。少々お待ちくださいませ。",
        "zh": "明白了！我会立刻帮您转交到相关部门，请您稍等一下哦。"
    },
    "INFO_NOT_FOUND": {
        "ko": "앗, 그 부분은 제가 바로 답변드리기 어려워 프런트 데스크 직원에게 즉시 전달해 두었습니다! 직원이 확인 후 바로 채팅으로 답변 드릴 예정이니 잠시만 기다려 주세요.",
        "en": "Oh, I'm not quite sure about that one! I have forwarded your question to the front desk staff. They will check and reply to you here shortly.",
        "ja": "あっと、その件については私ではすぐにお答えが難しいため、フロントデスクのスタッフに申し伝えました！確認次第こちらで回答いたしますので、少々お待ちくださいませ。",
        "zh": "哎呀，这个问题我马上无法给出准确答复，我已经将您的问题转达给前台工作人员了！他们确认后会很快在这里回复您，请稍等片刻。"
    },
    "ERROR": {
        "ko": "잠시 시스템에 통신 지연이 생겼나 봐요. 조금만 이따가 다시 말씀해 주시겠어요?",
        "en": "It looks like we're having a tiny system hiccup. Could you try asking again in just a moment?",
        "ja": "少しシステムに問題が発生しているようです。少し経ってからもう一度お話しいただけますでしょうか？",
        "zh": "哎呀，系统似乎出了点小问题。能麻烦您稍后再试一下吗？"
    }
}

def _get_static_reply(key: str, lang: str) -> str:
    lang = lang.lower()
    if lang not in ["ko", "en", "ja", "zh"]:
        lang = "en"
    return STATIC_REPLIES.get(key, {}).get(lang, STATIC_REPLIES[key]["en"])


def _summarize_from_context(current_text: str, chat_history: List[dict], fallback: str) -> str:
    """
    대화 맥락(chat_history)을 활용해 Gemini에게 한줄 요약을 요청합니다.
    실패 시 fallback 문자열을 그대로 반환합니다.
    """
    try:
        # 최근 6개 메시지만 사용 (토큰 절약)
        recent = chat_history[-6:] if len(chat_history) > 6 else chat_history
        context_lines = []
        for msg in recent:
            role = "고객" if msg.get("role") == "user" else "AI"
            context_lines.append(f"{role}: {msg.get('content', '')}")
        context_lines.append(f"고객: {current_text}")
        context_str = "\n".join(context_lines)

        raw = call_gemini(
            prompt=(
                f"아래 호텔 고객과 AI 컨시어지의 대화를 읽고, "
                f"고객이 원하는 것을 15자 이내의 한국어 명사형으로 한줄 요약해 주세요.\n\n"
                f"[대화]\n{context_str}"
            ),
            system_instruction='반드시 {"summary": "요약내용"} 형식의 JSON으로만 출력하세요. 예: {"summary": "아기 침대 객실 배치 요청"}'
        )
        summary = raw.get("summary", "").strip()
        if summary:
            print(f"[Analyze] 📝 맥락 기반 요약 생성: '{summary}'")
            return summary
    except Exception as e:
        print(f"[Analyze] ⚠️ 맥락 요약 생성 실패 (폴백 사용): {e}")
    return fallback


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
        context_summary = _summarize_from_context(request.text, request.chat_history, f"{domain} 부서 요청 접수")
        response = {
            "guest_reply": _get_static_reply("TASK_WAIT", request.language),
            "summary": context_summary,
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

        # ── FB 도메인 INFO는 에이전트에게 위임 (메뉴 기반 알러지 추천 등) ──
        if domain == "FB" and "FB" in DOMAIN_AGENTS:
            try:
                agent_result = DOMAIN_AGENTS["FB"](
                    user_message=request.text,
                    room_no=request.room_no,
                    chat_history=request.chat_history,
                )
                response = {
                    "guest_reply": agent_result.get("guest_reply", "메뉴 정보를 확인 중입니다."),
                    "summary": agent_result.get("summary", "FB 정보 문의"),
                    "domain_code": None,  # INFO이므로 요청 미생성
                    "priority": "NORMAL",
                    "entities": agent_result.get("entities", {}),
                    "confidence": agent_result.get("confidence", primary.confidence),
                }
                print(f"[Analyze] ℹ️ INFO+FB → FB 에이전트 위임 처리")
                print(f"[Analyze] 응답: {response}\n")
                return response
            except Exception as e:
                print(f"[Analyze] ⚠️ FB 에이전트 INFO 위임 실패, RAG 폴백: {e}")

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
            escalation_summary = _summarize_from_context(request.text, request.chat_history, "AI 미학습 정보 (직원 연결)")
            response = {
                "guest_reply": _get_static_reply("ESCALATION", request.language),
                "summary": escalation_summary,
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
