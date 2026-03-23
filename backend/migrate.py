import sqlite3, os

db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clubverse.db")
c = sqlite3.connect(db)
try:
    c.execute('ALTER TABLE users ADD COLUMN interests TEXT DEFAULT "[]"')
    c.commit()
    print("Done — interests column added!")
except Exception as e:
    print(f"Note: {e}")
c.close()
