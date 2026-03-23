import asyncio
import asyncpg
import pandas as pd
import os

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
CSV_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"
TARGET_MODELS = ['C5065', 'C5070', 'C5080']

async def import_family():
    print(f"Reading CSV: {CSV_FILE}")
    df = pd.read_csv(CSV_FILE, sep=';', dtype=str)
    # Replace NaN with None for SQL
    df = df.where(pd.notnull(df), None)
    records = df.to_dict('records')
    print(f"CSV contains {len(records)} rows.")

    conn = await asyncpg.connect(DB_URL)
    
    try:
        # 1. Ensure models exist in printers table
        print("\n--- Ensuring Models Exist ---")
        for model in TARGET_MODELS:
            # Check existence
            exists = await conn.fetchval("SELECT id FROM printers WHERE model_name = $1", model)
            if not exists:
                print(f"Creating model: {model}")
                await conn.execute("INSERT INTO printers (model_name) VALUES ($1)", model)
            else:
                print(f"Model exists: {model}")

        # 2. Delete existing parts for these models
        print("\n--- Cleaning Old Data ---")
        for model in TARGET_MODELS:
            deleted = await conn.execute("DELETE FROM manual_spare_parts WHERE model = $1", model)
            print(f"Deleted old parts for {model}: {deleted}")

        # 3. Import Data
        print("\n--- Importing New Data ---")
        total_inserted = 0
        
        # Prepare batch insert query
        query = """
            INSERT INTO manual_spare_parts 
            (model, section_name, page_number, ref_number, part_code, name, destination, class, quantity, ship_unit, pmn_no)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """

        for model in TARGET_MODELS:
            print(f"Inserting records for {model}...")
            # Create list of tuples for executemany
            # Note: CSV 'model' column is ignored/overwritten by the current loop's model
            batch_data = []
            for r in records:
                 batch_data.append((
                     model, 
                     r.get('section_name'), 
                     r.get('page_number'), 
                     r.get('ref_number'), 
                     r.get('part_code'), 
                     r.get('name'), 
                     r.get('destination'), 
                     r.get('class'), 
                     r.get('quantity'), 
                     r.get('ship_unit'), 
                     r.get('pmn_no')
                 ))
            
            await conn.executemany(query, batch_data)
            count = len(batch_data)
            total_inserted += count
            print(f"  -> Inserted {count} rows.")

        print(f"\n✅ Total Inserted: {total_inserted}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(import_family())
