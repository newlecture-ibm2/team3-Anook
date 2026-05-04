from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.domains.rag import service as rag_service

router = APIRouter()

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: List[float]

class SearchRequest(BaseModel):
    query: str
    domain_code: str
    top_k: Optional[int] = 3
    threshold: Optional[float] = 0.7

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]

@router.post("/embed", response_model=EmbedResponse)
async def embed_text_endpoint(request: EmbedRequest):
    """
    주어진 텍스트를 임베딩 벡터로 변환하여 반환합니다.
    백엔드 서버가 지식을 등록/수정할 때 호출합니다.
    """
    try:
        embedding = rag_service.embed_text(request.text)
        return EmbedResponse(embedding=embedding)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@router.post("/search", response_model=SearchResponse)
async def search_similar_endpoint(request: SearchRequest):
    """
    주어진 쿼리와 유사한 지식 엔트리를 도메인 내에서 검색합니다.
    도메인 에이전트가 고객 메시지에 답변하기 위해 호출합니다.
    """
    try:
        results = rag_service.search_similar(
            query=request.query,
            domain_code=request.domain_code,
            top_k=request.top_k,
            threshold=request.threshold
        )
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search similar entries: {str(e)}")
