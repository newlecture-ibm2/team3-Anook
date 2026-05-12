"""
Gemini API 공통 클라이언트
─────────────────────────
모든 AI 모듈(라우터, 도메인 에이전트 등)이 공유하는 Gemini 호출 래퍼.
팀원들도 이 클라이언트를 import해서 자기 부서 에이전트에 사용합니다.
"""

import json
import time
import asyncio
import contextvars
import base64
import google.generativeai as genai
from contextvars import ContextVar
from app.core.config import settings

# 로깅용 메타데이터 전역 컨텍스트 변수 (스레드/비동기 안전)
ai_log_meta_ctx: ContextVar[dict] = ContextVar("ai_log_meta", default={})

# ── 모듈 로드 시 1회만 API 키 설정 ──
genai.configure(api_key=settings.GEMINI_API_KEY)


from typing import Union

def call_gemini(
    prompt: str,
    system_instruction: str,
    model_name: str = "gemini-2.5-flash",
    temperature: float = 0.2,
    images: list[str] = None,
) -> Union[dict, list]:
    """
    Gemini에게 프롬프트를 보내고, JSON 딕셔너리 또는 리스트로 파싱하여 반환한다.

    Args:
        prompt: 사용자 입력 또는 가공된 프롬프트 문자열
        system_instruction: 시스템 프롬프트 (역할 지시)
        model_name: 사용할 Gemini 모델명
        temperature: 창의성 조절 (0.0=결정적, 1.0=창의적). 분류 작업은 낮게.

    Returns:
        파싱된 JSON 딕셔너리

    Raises:
        ValueError: Gemini 응답이 유효한 JSON이 아닐 경우
    """
    
    # [백엔드 아키텍처 해킹]: 다국어 룰 강제 주입
    global_i18n_rule = """
[GLOBAL SYSTEM RULE FOR MULTILINGUAL UX]
CRITICAL: You MUST write guest-facing fields (e.g., 'clarification_question', 'guest_reply', 'fallback_message') in the EXACT SAME LANGUAGE as the guest's input. Do NOT translate these to Korean if the guest speaks another language.
However, you MUST write staff-facing fields (e.g., 'summary', 'details', 'reasoning', 'item', 'menu') STRICTLY in KOREAN.
"""
    final_system_instruction = system_instruction + "\n" + global_i18n_rule

    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
        ),
    )

    # 시스템 프롬프트(system_instruction)를 지원하지 않는 버전을 위해 프롬프트 텍스트에 결합
    combined_prompt = f"System Instruction (MUST FOLLOW):\n{final_system_instruction}\n\n---\n\nUser Input:\n{prompt}"
    
    contents = [combined_prompt]
    if images:
        for b64 in images:
            # 프론트에서 넘어올 수 있는 "data:image/jpeg;base64," 접두사 제거
            if b64.startswith("data:image"):
                b64 = b64.split(",", 1)[1]
            image_data = base64.b64decode(b64)
            contents.append({
                "mime_type": "image/jpeg",
                "data": image_data
            })
            
    start_time = time.time()
    response = model.generate_content(contents)
    latency_ms = int((time.time() - start_time) * 1000)
    
    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`").lstrip("json").strip()
        
    prompt_tokens = 0
    completion_tokens = 0
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        prompt_tokens = response.usage_metadata.prompt_token_count
        completion_tokens = response.usage_metadata.candidates_token_count
        
    ai_log_meta_ctx.set({
        "model_name": model_name,
        "raw_prompt": combined_prompt,
        "raw_response": raw_text,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency_ms": latency_ms
    })
    
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini 응답이 유효한 JSON이 아닙니다.\n"
            f"원본 응답: {raw_text}\n"
            f"파싱 에러: {e}"
        )

async def call_gemini_async(
    prompt: str,
    system_instruction: str,
    model_name: str = "gemini-2.5-flash",
    temperature: float = 0.2,
    images: list[str] = None,
) -> Union[dict, list]:
    """
    call_gemini의 비동기 버전.
    독립된 ContextVar 내에서 실행하여 asyncio.gather 병렬 처리 시 로깅 메타데이터 충돌을 방지합니다.
    """
    ctx = contextvars.copy_context()
    
    def _run():
        return call_gemini(prompt, system_instruction, model_name, temperature, images)
        
    result = await asyncio.to_thread(ctx.run, _run)
    
    # 해당 스레드(컨텍스트)에서 갱신된 로깅 메타데이터를 추출하여 결과에 임시 주입
    # (analyze.py에서 pop하여 사용)
    meta = ctx.get(ai_log_meta_ctx)
    if meta and isinstance(result, dict):
        result["__ai_log_meta"] = meta
        
    return result
