import psycopg2

# Database Config (Supavisor IPv4)
DB_URL = "postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

def check():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM printers")
        rows = cur.fetchall()
        print(f"Printers: {rows}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
