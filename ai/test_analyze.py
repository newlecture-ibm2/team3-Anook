import asyncio
from app.schemas.router import RouterOutputSchema
from app.api.analyze import AnalyzeRequest, _analyze_message_core
import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

async def test():
    req = AnalyzeRequest(text="피가 나요 구급상자 좀 주세요", room_no="101")
    res = await _analyze_message_core(req)
    print("Test 1 (피가 나요 구급상자 좀 주세요):", res)

    req2 = AnalyzeRequest(text="피가 나요", room_no="101")
    res2 = await _analyze_message_core(req2)
    print("Test 2 (피가 나요):", res2)

if __name__ == "__main__":
    asyncio.run(test())
