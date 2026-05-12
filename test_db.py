import psycopg2

conn = psycopg2.connect("dbname='anook_db' user='anook_user' host='localhost' password='anook2026'")
cur = conn.cursor()
cur.execute("SELECT room_no, id FROM guest LIMIT 1")
row = cur.fetchone()
print(row)
