import asyncio
import asyncpg

async def list_models():
    conn = await asyncpg.connect('postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres')
    rows = await conn.fetch("SELECT model_name FROM printers ORDER BY model_name")
    print([r['model_name'] for r in rows])
    await conn.close()

asyncio.run(list_models())
