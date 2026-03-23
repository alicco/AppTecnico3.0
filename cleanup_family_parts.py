import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
MODELS_TO_REMOVE = ['C5065', 'C5080']

async def cleanup_family():
    conn = await asyncpg.connect(DB_URL)
    
    print("=== Cleaning Up Redundant Models ===")
    
    for model in MODELS_TO_REMOVE:
        deleted = await conn.execute("DELETE FROM manual_spare_parts WHERE model = $1", model)
        print(f"Deleted parts for {model}: {deleted}")
        
    print("Done. Only C5070 parts remain for this family.")
    await conn.close()

asyncio.run(cleanup_family())
