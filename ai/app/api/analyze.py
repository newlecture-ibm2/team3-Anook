from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.domains.rag import service as rag_service
from app.infrastructure.gemini.client import call_gemini

router = APIRouter()

class AnalyzeRequest(BaseModel):
    text: str
    room_no: str
    language: Optional[str] = "ko"

@router.post("/analyze")
async def analyze_message(request: AnalyzeRequest) -> Dict[str, Any]:
    # 1. RAG 지식 검색 (COMMON 포함)
    results = rag_service.search_similar(query=request.text, domain_code="COMMON", top_k=1, threshold=0.7)
    
    if results:
        best_match = results[0]
        guest_reply = best_match["answer"]
        domain_code = best_match["domain_code"]
        confidence = best_match["similarity"]
        
        response_json = {
            "guest_reply": guest_reply,
            "summary": "지식 기반 응답",
            "domain_code": domain_code,
            "priority": "NORMAL",
            "entities": {},
            "confidence": confidence
        }
        
        print(f"\n[AI Analyze] RAG 매칭 성공 (유사도: {confidence:.2f})")
        print(f"[AI Analyze] 응답 JSON: {response_json}\n")
        return response_json
    
    # 2. RAG에 없으면 일반 AI 응답 (단순 대화)
    # 실제로는 라우터를 태워야 하지만, 현재 백엔드 구조가 /analyze 하나에 의존하므로 
    # 간단한 Gemini 응답만 반환합니다.
    try:
        raw_response = call_gemini(
            prompt=f"고객 문의: {request.text}",
            system_instruction='당신은 아눅 호텔의 컨시어지입니다. 친절하게 답변해주세요. {"reply": "답변내용"} 형식의 JSON으로만 출력하세요.'
        )
        response_json = {
            "guest_reply": raw_response.get("reply", "안녕하세요! 컨시어지입니다."),
            "summary": "일반 대화",
            "domain_code": None, # 도메인이 없으면 백엔드에서 이벤트를 안태움
            "priority": "NORMAL",
            "entities": {},
            "confidence": 0.5
        }
        
        print(f"\n[AI Analyze] 일반 대화 생성 (Gemini)")
        print(f"[AI Analyze] 응답 JSON: {response_json}\n")
        return response_json
    except Exception as e:
        return {
            "guest_reply": "죄송합니다. 확인 후 다시 안내해 드리겠습니다.",
            "summary": "에러 발생",
            "domain_code": None,
            "priority": "NORMAL",
            "entities": {},
            "confidence": 0.0
        }
