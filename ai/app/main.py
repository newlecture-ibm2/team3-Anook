import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title="Anook AI Service",
    description="FastAPI based AI service for Hotel Management",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실운영 환경에서는 허용할 도메인을 구체적으로 지정해야 합니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api/v1")

from app.api.analyze import router as analyze_router
app.include_router(analyze_router)

from app.api.translate import router as translate_router
app.include_router(translate_router)

@app.get("/health")
def health_check():
    db_status = "unknown"
    try:
        conn = psycopg2.connect(
            host=settings.POSTGRES_HOST,
            database=settings.POSTGRES_DB,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            connect_timeout=3
        )
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected ({str(e)})"

    return {
        "status": "healthy",
        "service": "anook-ai",
        "database": db_status
    }

import google.generativeai as genai

@app.get("/api/v1/test-ai")
def test_ai(prompt: str = "안녕? 넌 누구야? 짧게 대답해줘."):
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {
            "status": "success",
            "prompt": prompt,
            "response": response.text
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
