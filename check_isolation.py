import asyncio
import asyncpg

async def check_faulty_isolation():
    conn = await asyncpg.connect('postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres')
    
    # Check C7100
    rows = await conn.fetch("""
        SELECT code, faulty_part_isolation 
        FROM error_codes ec 
        JOIN printers p ON ec.printer_id = p.id 
        WHERE p.model_name = 'C7100' AND faulty_part_isolation IS NOT NULL AND faulty_part_isolation != ''
        LIMIT 5
    """)
    print(f"C7100 with faulty_part_isolation: {len(rows)}")
    for r in rows:
        print(f"  {r['code']}: {r['faulty_part_isolation'][:50]}...")
    
    # Check which models HAVE faulty_part_isolation
    models = await conn.fetch("""
        SELECT p.model_name, COUNT(*) as cnt
        FROM error_codes ec 
        JOIN printers p ON ec.printer_id = p.id 
        WHERE faulty_part_isolation IS NOT NULL AND faulty_part_isolation != ''
        GROUP BY p.model_name
    """)
    print("\nModels with faulty_part_isolation data:")
    for m in models:
        print(f"  {m['model_name']}: {m['cnt']}")
    
    await conn.close()

asyncio.run(check_faulty_isolation())
