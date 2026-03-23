import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

async def debug_c5070():
    conn = await asyncpg.connect(DB_URL)
    
    print("=== Searching for C5070 in Printers ===")
    rows = await conn.fetch("SELECT id, model_name FROM printers WHERE model_name LIKE '%5070%'")
    
    if not rows:
        print("❌ No model found with name containing '5070'")
        # List all models just in case
        all_models = await conn.fetch("SELECT model_name FROM printers ORDER BY model_name")
        print("Available models:", [r['model_name'] for r in all_models])
    else:
        for r in rows:
            print(f"✅ Found Model: {r['model_name']} (ID: {r['id']})")
            
            # Check parts for this model
            parts_stats = await conn.fetch("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN section_name IS NOT NULL AND section_name != '' THEN 1 END) as with_section,
                    COUNT(CASE WHEN section_name IS NULL OR section_name = '' THEN 1 END) as without_section
                FROM manual_spare_parts 
                WHERE model = $1
            """, r['model_name'])
            
            stats = parts_stats[0]
            print(f"  Total Parts: {stats['total']}")
            print(f"  With Section: {stats['with_section']}")
            print(f"  Without Section: {stats['without_section']}")
            
            if stats['without_section'] > 0:
                print("\n  Sample parts without section:")
                bad_parts_rows = await conn.fetch("""
                    SELECT part_code, name, page_number 
                    FROM manual_spare_parts 
                    WHERE model = $1 AND (section_name IS NULL OR section_name = '') 
                    LIMIT 5
                """, r['model_name'])
                for b in bad_parts_rows:
                    print(f"    - {b['part_code']} ({b['name']}) [Page: {b['page_number']}]")

    await conn.close()

asyncio.run(debug_c5070())
