import psycopg2
from pgvector.psycopg2 import register_vector
from app.core.config import settings

def get_db_connection():
    """
    PostgreSQL 데이터베이스 연결을 생성하고 pgvector를 등록합니다.
    """
    conn = psycopg2.connect(settings.DATABASE_URL)
    register_vector(conn)
    return conn
