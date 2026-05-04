"""
Gemini API 공통 클라이언트
─────────────────────────
모든 AI 모듈(라우터, 도메인 에이전트 등)이 공유하는 Gemini 호출 래퍼.
팀원들도 이 클라이언트를 import해서 자기 부서 에이전트에 사용합니다.
"""

import json
import google.generativeai as genai
from app.core.config import settings


# ── 모듈 로드 시 1회만 API 키 설정 ──
genai.configure(api_key=settings.GEMINI_API_KEY)


from typing import Union

def call_gemini(
    prompt: str,
    system_instruction: str,
    model_name: str = "gemini-2.5-flash",
    temperature: float = 0.2,
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
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_instruction,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )

    response = model.generate_content(prompt)
    raw_text = response.text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini 응답이 유효한 JSON이 아닙니다.\n"
            f"원본 응답: {raw_text}\n"
            f"파싱 에러: {e}"
        )
