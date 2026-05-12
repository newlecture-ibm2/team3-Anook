import asyncio
from app.core.router_engine import route

async def main():
    results = route("내 이름", [])
    for r in results:
        print(f"Mode: {r.mode}, Domain: {r.domain}, Reasoning: {r.reasoning}")

asyncio.run(main())
