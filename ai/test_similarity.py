import asyncio
from app.domains.rag.service import search_similar

async def main():
    results = search_similar("호텔 내 와이파이 연결을 위한 비밀번호 정보를 알려주세요.", domain_code=None, top_k=5, threshold=0.0)
    for i, r in enumerate(results):
        print(f"{i+1}. [{r['domain_code']}] {r['question']} (유사도: {r['similarity']:.4f})")

asyncio.run(main())
