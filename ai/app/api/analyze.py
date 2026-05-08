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

import random
import re
# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
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
    "STATUS_CHECK": {
        "ko": "현재 고객님의 최근 요청 진행 상태를 확인해 드리겠습니다.",
        "en": "I will check the status of your most recent request right now.",
        "ja": "現在の直近のリクエストの進捗状況を確認いたします。",
        "zh": "我现在将为您查询最近一次请求的处理状态。"
    },
    "TARGETED_CANCEL": {
        "ko": "네, 지목하신 요청을 취소 처리하겠습니다.",
        "en": "Okay, I will cancel the specific request you mentioned.",
        "ja": "はい、ご指定のリクエストをキャンセルいたします。",
        "zh": "好的，我将取消您指定的请求。"
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
async def analyze_message(request: AnalyzeRequest) -> List[Dict[str, Any]]:
    """
    백엔드 PythonAiHttpAdapter가 호출하는 단일 분석 엔드포인트.
    멀티 인텐트를 처리하기 위해 배열(List)을 반환합니다.
    """
    # 요청마다 컨텍스트 초기화
    ai_log_meta_ctx.set({})
    
    responses = await _analyze_message_core(request)
    
    final_responses = []
    
    # ── [전역 무한 되묻기 방어 로직 (Global Clarification Counter)] ──
    for response in responses:
        guest_reply = response.get("guest_reply", "").strip()
        is_clarification = (response.get("domain_code") is None) and ("?" in guest_reply)
        
        if is_clarification:
            consecutive_questions = 0
            for msg in reversed(request.chat_history):
                if msg.get("role") == "ai":
                    content = msg.get("content", "").strip()
                    if "?" in content:
                        consecutive_questions += 1
                    else:
                        break
            
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
            meta_copy = meta.copy()
            meta_copy["is_fallback"] = (response.get("domain_code") == "FRONT" or response.get("confidence", 1.0) < 0.4)
            response["ai_log_meta"] = meta_copy
            
        final_responses.append(response)
        
    return final_responses


async def _analyze_message_core(request: AnalyzeRequest) -> List[Dict[str, Any]]:
    print(f"\n[Analyze] 📩 요청 수신 - Room: {request.room_no}, Text: '{request.text}'")

    # ── [PII 마스킹] 개인정보 선제 방어 ──
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
                "domain_code": None,
                "priority": "NORMAL",
                "entities": {},
                "confidence": best["similarity"],
            }
            print(f"\n[Analyze] ✅ RAG 매칭 (유사도: {best['similarity']:.2f})")
            print(f"[Analyze] 응답: {response}\n")
            return [response]
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
        return [_fallback_response(_get_static_reply("ERROR", request.language))]

    final_responses = []
    processed_domains = set()

    # ──────────────────────────────────────────────
    # STEP 3: 모든 분류 결과 순회하며 에이전트 실행 (멀티 인텐트 처리)
    # ──────────────────────────────────────────────
    for primary in router_results:
        # STEP 3-a: TASK → 부서로 라우팅
        if primary.mode == "TASK" and primary.domain:
            domain = primary.domain
            
            # 🚨 중복된 부서(Domain)는 한 번만 호출하도록 처리
            if domain in processed_domains:
                continue
            processed_domains.add(domain)

            # 부서별 에이전트가 등록되어 있으면 호출
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
                        if not any(word in final_guest_reply for word in ["직원", "연결", "안내", "프런트", "staff", "front", "スタッフ", "前台"]):
                            final_guest_reply = _get_static_reply("ESCALATION", request.language)

                    response = {
                        "guest_reply": final_guest_reply,
                        "summary": final_summary,
                        "domain_code": final_domain_code,
                        "priority": agent_result.get("priority", "NORMAL"),
                        "entities": final_entities,
                        "confidence": agent_confidence,
                    }
                    if hasattr(primary, 'action_type'):
                        response["action_type"] = primary.action_type
                        
                    print(f"[Analyze] ✅ {domain} 에이전트 처리 완료")
                    print(f"[Analyze] 응답: {response}\n")
                    final_responses.append(response)
                    continue
                except Exception as e:
                    print(f"[Analyze] ⚠️ {domain} 에이전트 실패: {e}")

            # 에이전트 미등록 시 → 기본 응답
            response = {
                "guest_reply": _get_static_reply("TASK_WAIT", request.language),
                "summary": f"{domain} 부서 요청 접수",
                "domain_code": domain,
                "priority": "NORMAL",
                "entities": {},
                "confidence": primary.confidence,
            }
            if hasattr(primary, 'action_type'):
                response["action_type"] = primary.action_type
                
            print(f"[Analyze] 📌 TASK → domain: {domain} (에이전트 미등록, 기본 응답)")
            print(f"[Analyze] 응답: {response}\n")
            final_responses.append(response)
            continue

        # STEP 3-b: CHITCHAT → 일상 대화 응답
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
            final_responses.append(response)
            continue

        # STEP 3-c: CLARIFICATION → 되묻기
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
            final_responses.append(response)
            continue

        # STEP 3-d: INFO → RAG 지식 기반 답변 (요청 미생성)
        if primary.mode == "INFO":
            domain = primary.domain or "FRONT"

    # ──────────────────────────────────────────────
    # STEP 3-d: INFO → RAG 지식 기반 답변 (요청 미생성)
    # ──────────────────────────────────────────────
    if primary.mode == "INFO":
        domain = primary.domain or "FRONT"
        try:
            # 🧠 [지능형 쿼리 확장] - 피드백 반영: 히스토리 기반 장르 다양화
            rewrite_prompt = f"다음 손님의 질문을 지식 베이스 검색에 최적화된 구체적인 문장으로 재작성해줘: '{request.text}'"
            search_query_raw = call_gemini(
                prompt=rewrite_prompt,
                system_instruction=(
                    "당신은 호텔 검색 엔진 최적화 전문가입니다. "
                    "사용자의 질문을 호텔 지식 베이스 검색에 가장 적합한 문장으로 확장하세요. "
                    "**주의**: 사용자가 직접 언급하지 않은 구체적인 음식 이름(삼겹살, 파스타 등)이나 카테고리를 재작성된 문장에 절대로 포함하지 마세요. "
                    "질문의 의도만 자연스럽게 살려 구체화하세요. "
                    "반드시 {\"reply\": \"재작성된 문장\"} 형식의 JSON으로만 출력하세요."
                )
            )
            search_query = search_query_raw.get("reply", request.text) if isinstance(search_query_raw, dict) else request.text
            print(f"[Analyze] 🔍 검색어 확장: '{request.text}' → '{search_query}'")

            # 🛠️ [검색 엔진 고도화] - 컨시어지 한정 Pool 확대 및 스마트 필터링
            top_k = 10 if domain == "CONCIERGE" else 3
            threshold = 0.3 if domain == "CONCIERGE" else 0.5
            
            rag_results = rag_service.search_similar(search_query, domain_code=domain, top_k=top_k, threshold=threshold)
            
            # 🎨 [컨시어지 전용 리랭킹/셔플/네거티브 필터링]
            additional_instructions = ""
            if domain == "CONCIERGE" and rag_results:
                # 1. 품질 하한선 필터링 (0.3 이상만 유지)
                rag_results = [r for r in rag_results if r.get('similarity', 1.0) >= 0.3]
                
                # 2. [네거티브 필터링] 최근 대화(최근 4개 메시지)에서 언급된 식당 추출
                mentioned_places = []
                if request.chat_history:
                    # 최근 2턴(사용자/AI 한 쌍씩 4개)의 AI 답변 탐색
                    for msg in request.chat_history[-4:]:
                        if msg.get('role') == 'ai':
                            content = msg.get('content', '')
                            # [자동화] DB의 모든 답변에서 작은따옴표('') 안의 명칭 자동 추출
                            all_answers = rag_service.get_all_answers_by_domain("CONCIERGE")
                            all_places = set()
                            for ans in all_answers:
                                found = re.findall(r"'([^']+)'", ans)
                                for f in found:
                                    all_places.add(f)
                            
                            for place in all_places:
                                if place in content:
                                    mentioned_places.append(place)
                
                # 3. 중복 제외 로직: 이미 언급된 장소는 리스트의 맨 뒤로 이동
                fresh_results = [r for r in rag_results if not any(p in r['answer'] for p in mentioned_places)]
                already_said = [r for r in rag_results if any(p in r['answer'] for p in mentioned_places)]
                
                # 4. [카테고리 분리 셔플] fact는 유사도 순서 유지, recommendation만 셔플
                fact_results = [r for r in fresh_results if "[fact]" in r['question'] and r.get('similarity', 0) >= 0.7]
                rec_results = [r for r in fresh_results if "[recommendation]" in r['question']]
                other_results = [r for r in fresh_results if "[fact]" not in r['question'] and "[recommendation]" not in r['question']]
                
                is_reconfirm = "RE-CONFIRM" in (primary.reasoning or "").upper()
                if not is_reconfirm:
                    random.shuffle(rec_results)  # 추천 데이터만 셔플 (다양성 확보)
                
                # fact 우선 → 셔플된 recommendation → 기타 → 이미 언급된 것
                rag_results = fact_results + rec_results + other_results + already_said
                print(f"[Analyze] 🚫 필터링 적용 (fact: {len(fact_results)}개, rec: {len(rec_results)}개, 언급됨: {mentioned_places})")
                
                # 6. [카테고리 유지 및 자연스러운 대화] 직전 언급된 장소와 카테고리 파악
                last_place = mentioned_places[-1] if mentioned_places else None
                is_another_request = any(word in request.text for word in ["다른", "또", "더", "다음에", "더보기"])
                
                # 직전 언급 장소의 카테고리 찾기 (지식 데이터와 대조)
                last_category = None
                if last_place:
                    from app.domains.concierge.knowledge_data import CONCIERGE_KNOWLEDGE
                    for k in CONCIERGE_KNOWLEDGE:
                        if last_place in k['answer']:
                            last_category = k.get('category')
                            break
                
                # "다른 데" 요청 시 동일 카테고리 우선 배치
                if is_another_request and last_category:
                    rag_results.sort(key=lambda x: 0 if x.get('category') == last_category else 1)

                # 7. [Fact 인지 강화 및 대화 흐름 최적화]
                is_fact_included = any("[fact]" in r['question'] for r in rag_results)
                fact_instruction = ""
                if is_fact_included:
                    fact_instruction = "\n- **중요**: [fact] 태그 정보는 질문에 대한 확정적 답변이므로 즉시 활용하세요."

                last_mention_instruction = f"방금 '{last_place}'를 추천했음을 인지하고, " if last_place else ""
                additional_instructions = (
                    f"\n- 답변 시 마크다운 강조(**)를 사용하지 말고 평문으로 작성하세요. {fact_instruction}"
                    f"\n- {last_mention_instruction}사용자의 요청 흐름에 맞춰 자연스럽게 대화를 이어가세요. "
                    f"\n- 안내한 내용이 택시 호출, 꽃배달, 짐 보관 등 '요청이나 예약'이 가능한 서비스라면, 답변 마지막에 반드시 '지금 바로 예약을 도와드릴까요?' 또는 '필요하시면 바로 접수해 드릴까요?'와 같이 서비스로 이어지는 질문을 포함하세요."
                    f"\n- 예: '파스타 외에 다른 맛집을 찾으신다면 ~는 어떠세요?', '택시는 정문에서 이용 가능합니다. 지금 바로 호출해 드릴까요?' 등"
                    "\n- 이전 대화와 중복되는 장소 추천은 절대 피하세요."
                )

            if rag_results:
                knowledge = "\n".join([f"Q: {r['question']}\nA: {r['answer']}" for r in rag_results])
                info_prompt = (
                    f"고객 질문: {request.text}\n\n"
                    f"아래 제공된 [호텔 지식]만을 바탕으로, 반드시 고객의 질문에 사용된 언어(또는 {request.language} 언어)로 친절하게 답변하세요. {additional_instructions}\n"
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
                    final_responses.append(response)
                    continue
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
                    "domain_code": None,
                    "priority": "NORMAL",
                    "entities": {},
                    "confidence": primary.confidence,
                }
                
            print(f"[Analyze] ℹ️ INFO 응답")
            print(f"[Analyze] 응답: {response}\n")
            final_responses.append(response)
            continue

        # STEP 3-e: CANCEL → 요청 취소
        if primary.mode == "CANCEL":
            text_lower = request.text.lower()
            is_all = any(word in text_lower for word in ["전부", "모두", "다 취소", "전체", "all", "everything"])
            
            if is_all:
                response = {
                    "guest_reply": "네, 진행 중인 모든 요청을 취소 처리하겠습니다.",
                    "summary": "전체 요청 취소",
                    "domain_code": None,
                    "priority": "NORMAL",
                    "entities": {},
                    "confidence": primary.confidence,
                    "action": "CANCEL_ALL_REQUESTS",
                }
            else:
                reply_key = "TARGETED_CANCEL" if primary.domain else "CANCEL"
                response = {
                    "guest_reply": _get_static_reply(reply_key, request.language),
                    "summary": "요청 취소",
                    "domain_code": primary.domain,
                    "priority": "NORMAL",
                    "entities": {},
                    "confidence": primary.confidence,
                    "action": "CANCEL_REQUEST",
                }
            print(f"[Analyze] 🚫 CANCEL 응답 (is_all={is_all})")
            print(f"[Analyze] 응답: {response}\n")
            final_responses.append(response)
            continue

        # STEP 3-f: STATUS_CHECK → 진행 상태 확인
        if primary.mode == "STATUS_CHECK":
            response = {
                "guest_reply": _get_static_reply("STATUS_CHECK", request.language),
                "summary": "진행 상태 확인",
                "domain_code": None,
                "priority": "NORMAL",
                "entities": {},
                "confidence": primary.confidence,
                "action": "STATUS_CHECK",
            }
            print(f"[Analyze] 🔍 STATUS_CHECK 응답")
            print(f"[Analyze] 응답: {response}\n")
            final_responses.append(response)
            continue

    if not final_responses:
        return [_fallback_response(_get_static_reply("ERROR", request.language))]

    return final_responses


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
