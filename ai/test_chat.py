import httpx
import asyncio
import json

async def test_chat():
    url = "http://localhost:8000/analyze"
    print("🤖 챗봇(Graph RAG 적용)에게 질문을 전송합니다...")
    
    payload = {
        "text": "에어컨 고장난 것 같은데, 누가 고치러 오고 수리비 나오나요?",
        "room_no": "101",
        "chat_history": [],
        "language": "ko"
    }
    
    print(f"\n▶ 사용자 질문: '{payload['text']}'\n")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(url, json=payload)
            print("====================================")
            print("서버 응답 코드:", resp.status_code)
            print("AI 응답 내용:")
            
            # JSON 응답 예쁘게 출력
            print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
            print("====================================")
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
