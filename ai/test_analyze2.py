import asyncio
from app.schemas.router import RouterOutputSchema
from app.api.analyze import AnalyzeRequest, _analyze_message_core
import google.generativeai as genai
from app.core.config import settings
genai.configure(api_key=settings.GEMINI_API_KEY)

async def test():
    req = AnalyzeRequest(text="피가 나요", room_no="101")
    res = await _analyze_message_core(req)
    print("Test Result:", res)

if __name__ == "__main__":
    asyncio.run(test())
