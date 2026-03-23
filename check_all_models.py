import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

async def check_all_models():
    conn = await asyncpg.connect(DB_URL)
    
    rows = await conn.fetch("""
        SELECT 
            p.model_name,
            COUNT(ec.id) as total_errors,
            COUNT(CASE WHEN ec.faulty_part_isolation IS NOT NULL AND ec.faulty_part_isolation != '' THEN 1 END) as with_fault_isolation
        FROM printers p
        LEFT JOIN error_codes ec ON p.id = ec.printer_id
        GROUP BY p.model_name
        ORDER BY p.model_name
    """)
    
    with open('models_status.txt', 'w') as f:
        f.write("Model          | Total Errors | With Fault Isolation | Status\n")
        f.write("-" * 65 + "\n")
        for r in rows:
            status = "OK" if r['with_fault_isolation'] > 0 else "MISSING"
            f.write(f"{r['model_name']:<14} | {r['total_errors']:>12} | {r['with_fault_isolation']:>20} | {status}\n")
    
    await conn.close()
    print("Results written to models_status.txt")

asyncio.run(check_all_models())
