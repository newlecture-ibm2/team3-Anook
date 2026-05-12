from app.domains.rag import service as rag_service
import os

# Mock DB connection if needed, but it should use the real one if running in the environment
# Make sure to run this where the app can access the DB

query = "와이파이 비밀번호 알려줘"
domain = "COMMON"

print(f"Searching for: {query}")
results = rag_service.search_similar(query, domain, top_k=5, threshold=0.1)

for r in results:
    print(f"ID: {r['id']}, Sim: {r['similarity']:.4f}, Q: {r['question']}")
