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


@router.post("/analyze")
async def analyze_message(request: AnalyzeRequest) -> Dict[str, Any]:
    """
    백엔드 PythonAiHttpAdapter가 호출하는 단일 분석 엔드포인트.
    """
    # 요청마다 컨텍스트 초기화
    ai_log_meta_ctx.set({})
    
    response = await _analyze_message_core(request)
    
    # ── [비동기 로깅 메타데이터 주입] ──
    meta = ai_log_meta_ctx.get()
    if meta:
        meta["is_fallback"] = (response.get("domain_code") == "FRONT" or response.get("confidence", 1.0) < 0.4)
        response["ai_log_meta"] = meta
        
    return response


async def _analyze_message_core(request: AnalyzeRequest) -> Dict[str, Any]:
    print(f"\n[Analyze] 📩 요청 수신 - Room: {request.room_no}, Text: '{request.text}'")
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
        return _fallback_response("죄송합니다. 잠시 후 다시 시도해 주세요.")

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
                    if "직원" not in final_guest_reply:
                        final_guest_reply = "죄송합니다. 정확한 파악이 어려워 즉시 프런트 데스크 직원에게 연결해 드리겠습니다."

                response = {
                    "guest_reply": final_guest_reply,
                    "summary": final_summary,
                    "domain_code": final_domain_code,
                    "priority": agent_result.get("priority", "NORMAL"),
                    "entities": final_entities,
                    "confidence": agent_confidence,
                }
                print(f"[Analyze] ✅ {domain} 에이전트 처리 완료")
                print(f"[Analyze] 응답: {response}\n")
                return response
            except Exception as e:
                print(f"[Analyze] ⚠️ {domain} 에이전트 실패: {e}")

        # 에이전트 미등록 시 → domain_code만 찍어서 전달 (인프라 기본 동작)
        response = {
            "guest_reply": "네, 알겠습니다. 담당 부서에 요청을 전달하겠습니다. 잠시만 기다려 주세요.",
            "summary": f"{domain} 부서 요청 접수",
            "domain_code": domain,
            "priority": "NORMAL",
            "entities": {},
            "confidence": primary.confidence,
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
                prompt=f"호텔 고객이 이렇게 말합니다: {request.text}",
                system_instruction=(
                    '당신은 아눅(Anook) 호텔의 친절한 AI 컨시어지입니다. '
                    '고객의 인사나 일상 대화에 따뜻하고 간결하게 답변하세요. '
                    '{"reply": "답변내용"} 형식의 JSON으로만 출력하세요.'
                ),
            )
            guest_reply = raw.get("reply", "안녕하세요! 아눅 호텔 컨시어지입니다. 무엇이든 편하게 말씀해 주세요.")
        except Exception:
            guest_reply = "안녕하세요! 아눅 호텔 컨시어지입니다. 무엇이든 편하게 말씀해 주세요."

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
            "guest_reply": "죄송합니다, 조금 더 자세히 말씀해 주시겠어요? 어떤 도움이 필요하신지 알려주시면 바로 도와드리겠습니다.",
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
                info_prompt = f"고객 질문: {request.text}\n\n아래 호텔 지식을 참고하여 친절하게 한국어로 답변해주세요.\n{knowledge}"
                raw = call_gemini(
                    prompt=info_prompt, 
                    system_instruction='당신은 친절한 아눅(Anook) 호텔 컨시어지입니다. 반드시 {"reply": "답변내용"} 형식의 JSON으로만 출력하세요.'
                )
                guest_reply = raw.get("reply", "해당 정보를 확인 중입니다.")
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
                    guest_reply = agent_result.get("guest_reply", "죄송합니다, 해당 정보를 찾지 못했습니다.")
                else:
                    guest_reply = "죄송합니다, 해당 정보를 찾지 못했습니다. 프론트 데스크(내선 0번)로 문의해 주세요."
        except Exception as e:
            print(f"[Analyze] ⚠️ INFO 처리 중 에러 발생 (RAG/Fallback): {e}")
            guest_reply = "죄송합니다, 해당 정보를 찾지 못했습니다. 프론트 데스크(내선 0번)로 문의해 주세요."

        response = {
            "guest_reply": guest_reply,
            "summary": "정보 문의",
            "domain_code": None,  # ← 요청 미생성
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
            "guest_reply": "네, 가장 최근 요청을 취소 처리하겠습니다.",
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

    return _fallback_response("요청을 처리하는 중 문제가 발생했습니다.")


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
