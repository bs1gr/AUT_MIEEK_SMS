import sqlite3

db = r"C:\Users\Vasilis\AppData\Local\SMS_Native_Lite\sms_lite.db"
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()

if tables:
    print(f"✅ {len(tables)} tables found:")
    for t in tables:
        print(f"   - {t[0]}")
else:
    print("❌ No tables found (migrations not run)")

conn.close()
