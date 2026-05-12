from app.core.config import settings
import psycopg2

try:
    conn = psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT
    )
    cur = conn.cursor()
    cur.execute("SELECT question, answer, domain_code FROM knowledge_entry WHERE question LIKE '%조식%';")
    for row in cur.fetchall():
        print(f"Q: {row[0]}")
        print(f"A: {row[1]}")
        print(f"Domain: {row[2]}")
    cur.close()
    conn.close()
except Exception as e:
    print("Connection failed:", e)
