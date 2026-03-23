import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

async def get_schema():
    conn = await asyncpg.connect(DB_URL)
    rows = await conn.fetch("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'manual_spare_parts' 
        ORDER BY ordinal_position
    """)
    cols = [r['column_name'] for r in rows]
    with open('db_schema.txt', 'w') as f:
        f.write('\n'.join(cols))
    
    print(f"Columns written to db_schema.txt. Count: {len(cols)}")
    await conn.close()

asyncio.run(get_schema())
