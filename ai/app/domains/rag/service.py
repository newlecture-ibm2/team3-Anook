from typing import List, Dict, Any, Optional
from app.infrastructure.embedding.client import generate_embedding
from app.infrastructure.database.connection import get_db_connection

def embed_text(text: str) -> List[float]:
    """
    텍스트를 임베딩 벡터로 변환합니다.
    """
    return generate_embedding(text)

def search_similar(query: str, domain_code: str, top_k: int = 3, threshold: float = 0.7) -> List[Dict[str, Any]]:
    """
    쿼리와 유사한 지식 엔트리를 데이터베이스에서 검색합니다.
    - 코사인 유사도를 사용합니다. (1 - (embedding <=> query_embedding))
    - threshold 미만인 결과는 제외합니다.
    """
    query_embedding = generate_embedding(query)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # pgvector의 코사인 거리 연산자 <=> 를 사용 (거리가 작을수록 유사함)
            # 유사도 = 1 - (embedding <=> %s)
            sql = """
                SELECT id, question, answer, domain_code, status,
                       1 - (embedding <=> %s::vector) AS similarity
                FROM knowledge_entry
                WHERE domain_code IN (%s, 'COMMON') AND status = 'APPROVED'
                AND 1 - (embedding <=> %s::vector) >= %s
                ORDER BY similarity DESC
                LIMIT %s
            """
            cur.execute(sql, (query_embedding, domain_code, query_embedding, threshold, top_k))
            rows = cur.fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "id": row[0],
                    "question": row[1],
                    "answer": row[2],
                    "domain_code": row[3],
                    "status": row[4],
                    "similarity": row[5]
                })
            return results
    finally:
        conn.close()

def get_all_answers_by_domain(domain_code: str) -> List[str]:
    """
    특정 도메인의 모든 승인된 답변(answer) 리스트를 가져옵니다.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            sql = "SELECT answer FROM knowledge_entry WHERE domain_code = %s AND status = 'APPROVED'"
            cur.execute(sql, (domain_code,))
            rows = cur.fetchall()
            return [row[0] for row in rows]
    finally:
        conn.close()
