import sys
import os

# ai 디렉토리를 파이썬 경로에 추가하여 app 모듈을 임포트할 수 있게 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.infrastructure.database.connection import get_db_connection
from app.domains.rag.service import embed_text
from app.domains.emergency.knowledge_data import EMERGENCY_KNOWLEDGE

def seed_emergency_knowledge():
    print("🚨 긴급 상황(EMERGENCY) RAG 지식 시딩을 시작합니다...")
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # 중복 시딩 방지 (이미 해당 도메인의 지식이 존재하면 건너뜀)
            cur.execute("SELECT COUNT(*) FROM knowledge_entry WHERE domain_code = %s", ("EMERGENCY",))
            count = cur.fetchone()[0]
            if count > 0:
                print(f"⏩ [EMERGENCY] 지식이 이미 {count}건 존재합니다. 시딩(임베딩)을 건너뜁니다.")
                return

            for item in EMERGENCY_KNOWLEDGE:
                question = item["question"]
                answer = item["answer"]
                
                print(f"⏳ 임베딩 생성 중: {question[:20]}...")
                # 질문과 답변을 합쳐서 임베딩 텍스트로 사용 (검색 품질 향상)
                embed_text_input = f"질문: {question}\n답변: {answer}"
                embedding_vector = embed_text(embed_text_input)
                
                # DB에 INSERT
                sql = """
                    INSERT INTO knowledge_entry (question, answer, domain_code, status, embedding)
                    VALUES (%s, %s, %s, %s, %s::vector)
                """
                cur.execute(sql, (question, answer, "EMERGENCY", "APPROVED", embedding_vector))
                print(f"✅ 삽입 완료: {question[:20]}...")
                
        conn.commit()
        print("\n🎉 모든 긴급 상황 지식이 성공적으로 DB에 저장되었습니다!")
    except Exception as e:
        conn.rollback()
        print(f"\n❌ 시딩 중 오류 발생: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_emergency_knowledge()
