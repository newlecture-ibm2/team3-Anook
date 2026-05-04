from fastapi import APIRouter
from app.api.v1.endpoints.router import router as router_endpoint

api_router = APIRouter()

# ── 메인 라우터 (AN-194: 도메인 분류) ──
api_router.include_router(router_endpoint, tags=["router"])

# 도메인별 라우터를 향후 여기서 import 하여 등록합니다.
# 예시: api_router.include_router(breakfast.router, prefix="/breakfast", tags=["breakfast"])
