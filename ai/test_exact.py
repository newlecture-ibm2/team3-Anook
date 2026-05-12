import asyncio
from app.infrastructure.database.connection import get_db_connection

def search_exact(query: str):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = "SELECT id, question, answer, domain_code, status FROM knowledge_entry WHERE question = %s AND status = 'APPROVED'"
            cur.execute(sql, (query,))
            rows = cur.fetchall()
            results = []
            for row in rows:
                results.append({
                    "id": row[0],
                    "question": row[1],
                    "answer": row[2],
                    "domain_code": row[3],
                    "status": row[4],
                    "similarity": 1.0
                })
            return results
    finally:
        conn.close()

results = search_exact("내 이름")
print(results)
