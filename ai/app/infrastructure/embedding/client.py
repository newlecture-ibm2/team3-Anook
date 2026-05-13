from google import genai
from app.core.config import settings
from typing import List

# API 키 설정
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# 임베딩 모델 설정
EMBEDDING_MODEL = "gemini-embedding-2"

def generate_embedding(text: str) -> List[float]:
    """
    주어진 텍스트를 gemini-embedding-2 모델을 사용하여 768차원 벡터로 변환합니다.
    """
    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text
        )
        return result.embeddings[0].values[:768]
    except Exception as e:
        print(f"Failed to generate embedding: {e}")
        raise
