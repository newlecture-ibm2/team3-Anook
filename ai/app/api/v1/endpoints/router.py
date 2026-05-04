"""
라우터 API 엔드포인트
────────────────────
POST /api/v1/router
고객 메시지를 받아 도메인 분류 결과를 배열(List)로 반환합니다.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from app.core.router_engine import route
from app.schemas.router import RouterOutputSchema

router = APIRouter()


class RouterRequest(BaseModel):
    """라우터 요청 DTO"""
    message: str = Field(description="고객이 채팅창에 입력한 원문 텍스트")
    room_no: str = Field(description="고객의 객실 번호")
    chat_history: List[dict] = Field(
        default_factory=list, 
        description="최근 채팅 내역 (예: [{'role': 'user', 'content': '수건 2장 줘'}, {'role': 'ai', 'content': '알겠습니다'}])"
    )

@router.post("/router", response_model=List[RouterOutputSchema])
async def classify_message(request: RouterRequest):
    """
    고객 메시지를 AI 라우터로 분류합니다.
    """
    try:
        result = route(request.message, chat_history=request.chat_history)
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI 응답 파싱 실패: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"라우터 처리 중 오류: {str(e)}")
