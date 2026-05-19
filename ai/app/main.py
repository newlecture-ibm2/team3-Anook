import psycopg2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.router import api_router
from app.core.config import settings
from app.domains.rag.service import init_neo4j_driver

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eager Initialization: 서버 시작 시점에 Neo4j 연결 검증 (Fail-Fast)
    print("Initializing Neo4j connection...")
    try:
        init_neo4j_driver()
        print("Neo4j connection verified successfully.")
    except Exception as e:
        print(f"Failed to connect to Neo4j on startup: {e}")
        # 연결 실패 시 서버 구동을 중단하려면 여기서 예외를 다시 던집니다.
        raise e
    yield
    # 종료 로직 필요 시 여기에 작성
    print("Shutting down...")

app = FastAPI(
    title="Anook AI Service",
    description="FastAPI based AI service for Hotel Management",
    version="1.0.0",
    lifespan=lifespan
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

from google import genai

@app.get("/api/v1/test-ai")
def test_ai(prompt: str = "안녕? 넌 누구야? 짧게 대답해줘."):
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
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
    import uvicorn  # type: ignore
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
