import asyncio
from app.api.analyze import _analyze_message_core, AnalyzeRequest
from app.core.config import settings

async def main():
    req = AnalyzeRequest(
        text="와이파이 비밀번호가 뭔가요?",
        room_no="101",
        language="ko",
        chat_history=[]
    )
    result = await _analyze_message_core(req)
    print(result)

asyncio.run(main())
