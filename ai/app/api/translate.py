from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from app.infrastructure.gemini.client import call_gemini

router = APIRouter()

class TranslateRequest(BaseModel):
    text: str
    target_language: str

@router.post("/translate")
async def translate_message(request: TranslateRequest) -> Dict[str, Any]:
    """
    직원의 메시지를 투숙객의 언어로 번역합니다.
    """
    print(f"\n[Translate] 📩 번역 요청 - Text: '{request.text}', Target: {request.target_language}")
    
    try:
        raw = call_gemini(
            prompt=f"다음 문장을 '{request.target_language}' 언어로 번역해 주세요. 원문: {request.text}",
            system_instruction=(
                '당신은 호텔 컨시어지 직원의 메시지를 투숙객의 언어로 번역하는 전문 번역가입니다. '
                '정중하고 자연스러운 호텔식 표현을 사용하세요. '
                '번역된 텍스트만 포함하여 {"translated_text": "번역결과"} 형식의 JSON으로만 출력하세요.'
            )
        )
        translated = raw.get("translated_text", request.text)
        print(f"[Translate] ✅ 번역 완료: {translated}\n")
        return {"translated_text": translated}
    except Exception as e:
        print(f"[Translate] ❌ 번역 실패: {e}\n")
        # 실패 시 원문 반환
        return {"translated_text": request.text}
