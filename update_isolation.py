import asyncio
import asyncpg
import pandas as pd

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

# File to model mappings
FILE_MAPPINGS = [
    {
        "file": r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C14000_C12000.xlsx",
        "models": ["C12000", "C14000"],
        "type": "xlsx"
    },
    {
        "file": r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C6100_ok.xlsx",
        "models": ["C6100", "C6085"],
        "type": "xlsx"
    },
    {
        "file": r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C7100_C7090.csv",
        "models": ["C7100", "C7090"],
        "type": "csv"
    }
]

async def update_fault_isolation():
    conn = await asyncpg.connect(DB_URL)
    
    total_updated = 0
    total_not_found = 0
    
    for mapping in FILE_MAPPINGS:
        print(f"\n=== Processing {mapping['file']} ===")
        print(f"Target models: {mapping['models']}")
        
        # Read the file
        if mapping['type'] == 'xlsx':
            df = pd.read_excel(mapping['file'])
        else:
            df = pd.read_csv(mapping['file'], on_bad_lines='skip')
        
        # Get the fault isolation column (case-insensitive search)
        fault_col = None
        for col in df.columns:
            if 'faulty' in col.lower() and 'isolation' in col.lower():
                fault_col = col
                break
        
        if not fault_col:
            print(f"  WARNING: Could not find Faulty Isolation column in {mapping['file']}")
            continue
        
        print(f"  Found column: '{fault_col}'")
        
        # Filter rows with non-empty fault isolation
        df_valid = df[df[fault_col].notna() & (df[fault_col] != '')]
        print(f"  Rows with fault isolation data: {len(df_valid)}")
        
        file_updated = 0
        file_not_found = 0
        
        for _, row in df_valid.iterrows():
            code = str(row['Code']).strip()
            fault_isolation = str(row[fault_col]).strip()
            
            if not code or not fault_isolation or fault_isolation == 'nan':
                continue
            
            # Update for each target model
            for model in mapping['models']:
                result = await conn.execute("""
                    UPDATE error_codes 
                    SET faulty_part_isolation = $1
                    WHERE code = $2 
                    AND printer_id IN (SELECT id FROM printers WHERE model_name = $3)
                    AND (faulty_part_isolation IS NULL OR faulty_part_isolation = '')
                """, fault_isolation, code, model)
                
                count = int(result.split()[-1])
                if count > 0:
                    file_updated += count
                else:
                    file_not_found += 1
        
        print(f"  Updated: {file_updated}, Not found/already set: {file_not_found}")
        total_updated += file_updated
        total_not_found += file_not_found
    
    await conn.close()
    
    print(f"\n=== SUMMARY ===")
    print(f"Total records updated: {total_updated}")
    print(f"Total not found/already set: {total_not_found}")

if __name__ == "__main__":
    asyncio.run(update_fault_isolation())
