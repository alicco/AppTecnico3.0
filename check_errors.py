import psycopg2

# Database Config (Supavisor IPv4) - Using Session Mode (5432)
DB_URL = "postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

def check():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()
        
        # Get printer id for C4080
        cur.execute("SELECT id FROM printers WHERE model_name = 'C4080'")
        printer_id = cur.fetchone()[0]
        
        # Fetch first 5 errors with correction
        cur.execute("SELECT code, correction FROM error_codes WHERE printer_id = %s LIMIT 5", (printer_id,))
        rows = cur.fetchall()
        print(f"Sample Errors (Code, Correction): {rows}")
        
        # Check column metadata to be sure
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'error_codes' AND column_name = 'correction'")
        col = cur.fetchone()
        print(f"Column 'correction' exists: {col is not None}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
