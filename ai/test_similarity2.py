import asyncio
from app.domains.rag import service

async def main():
    results = service.search_similar("감사합니다", domain_code="COMMON", top_k=3, threshold=0.0)
    for res in results:
        print(f"[{res['domain_code']}] Q: {res['question']}\n   A: {res['answer']}\n   Score: {res['similarity']}")

asyncio.run(main())
