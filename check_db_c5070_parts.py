import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

async def check_c5070_parts():
    conn = await asyncpg.connect(DB_URL)
    
    print("=== Checking manual_spare_parts for '5070' ===")
    
    # Check count
    count = await conn.fetchval("SELECT COUNT(*) FROM manual_spare_parts WHERE model ILIKE '%5070%'")
    print(f"Total parts found for model LIKE %5070%: {count}")
    
    if count > 0:
        print("\nSample records:")
        rows = await conn.fetch("SELECT id, model, part_code, name, section_name FROM manual_spare_parts WHERE model ILIKE '%5070%' LIMIT 10")
        for r in rows:
            print(f"[{r['id']}] Model: {r['model']} | Code: {r['part_code']} | Section: {r['section_name']}")
            
        # Check distribution
        print("\nModel Name Distribution:")
        models = await conn.fetch("SELECT model, COUNT(*) as c FROM manual_spare_parts WHERE model ILIKE '%5070%' GROUP BY model")
        for m in models:
            print(f"  '{m['model']}': {m['c']}")
            
    await conn.close()

asyncio.run(check_c5070_parts())
