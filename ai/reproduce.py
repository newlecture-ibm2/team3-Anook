import asyncio
import json
import httpx

async def main():
    payload = {
        "text": "네 그리고 택시도 예약해주세요",
        "room_no": "707",
        "language": "ko",
        "chat_history": [
            {"role": "user", "content": "콜라 2개 주세요"},
            {"role": "ai", "content": "콜라는 일반과 제로 중 어떤 것으로 준비해 드릴까요?"},
            {"role": "user", "content": "제로"},
            {"role": "ai", "content": "제로 콜라 2개(8.00달러)입니다. 이대로 주문을 접수해 드릴까요?"}
        ]
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post("http://localhost:8000/analyze", json=payload)
        print("Status:", response.status_code)
        try:
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        except:
            print(response.text)

asyncio.run(main())
