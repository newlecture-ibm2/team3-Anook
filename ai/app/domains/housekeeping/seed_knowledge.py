import sys
import os

from app.infrastructure.database.connection import get_db_connection
from app.domains.rag.service import embed_text
from app.domains.housekeeping.knowledge_data import HK_KNOWLEDGE

def seed_housekeeping_knowledge():
    print("🚀 하우스키핑(HK) RAG 지식 시딩을 시작합니다...")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            for item in HK_KNOWLEDGE:
                question = item["question"]
                answer = item["answer"]
                
                print(f"⏳ 임베딩 생성 중: {question[:20]}...")
                embed_text_input = f"질문: {question}\n답변: {answer}"
                embedding_vector = embed_text(embed_text_input)
                
                sql = """
                    INSERT INTO knowledge_entry (question, answer, domain_code, status, embedding)
                    VALUES (%s, %s, %s, %s, %s::vector)
                """
                cur.execute(sql, (question, answer, "HK", "APPROVED", embedding_vector))
                print(f"✅ 삽입 완료: {question[:20]}...")
                
        conn.commit()
        print("\n🎉 하우스키핑(HK) 지식이 성공적으로 DB에 저장되었습니다!")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 시딩 중 오류 발생: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_housekeeping_knowledge()
