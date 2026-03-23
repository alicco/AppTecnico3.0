import asyncio
import asyncpg
import pandas as pd
import re
import os

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

# File to model mappings
FILE_MAPPINGS = [
    {
        "file": r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C14010_C12010_C10500.xlsx",
        "models": ["C14010", "C12010", "C10500"],
        "type": "xlsx"
    }
]

def clean_fault_isolation(text):
    if not isinstance(text, str):
        return None
    
    # Extract all DipSW/SW patterns
    # Matches "DipSW 1-1" or "SW 1-1" or "DipSW1-1"
    matches = re.findall(r'((?:DipSW|SW)\s*\d+-\d+)', text, re.IGNORECASE)
    
    if not matches:
        return None
        
    # Join unique matches with comma
    # Use dict.fromkeys to remove duplicates while preserving order
    return ', '.join(list(dict.fromkeys(matches)))

async def update_fault_isolation():
    conn = await asyncpg.connect(DB_URL)
    
    total_updated = 0
    total_not_found = 0
    
    for mapping in FILE_MAPPINGS:
        print(f"\n=== Processing {os.path.basename(mapping['file'])} ===")
        print(f"Target models: {mapping['models']}")
        
        try:
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
                print(f"  Available columns: {list(df.columns)}")
                continue
            
            print(f"  Found column: '{fault_col}'")
            
            file_updated = 0
            file_not_found = 0
            
            for _, row in df.iterrows():
                code = str(row['Code']).strip() if 'Code' in row else None
                # Fallback if 'Code' column has different case
                if not code:
                    for col in df.columns:
                        if col.lower() == 'code':
                            code = str(row[col]).strip()
                            break
                            
                raw_isolation = row[fault_col]
                
                if not code or pd.isna(raw_isolation):
                    continue
                
                # Apply cleaning
                cleaned_isolation = clean_fault_isolation(str(raw_isolation))
                
                if not cleaned_isolation:
                    continue

                # Update for each target model
                for model in mapping['models']:
                    # Update ONLY if currently empty or we want to overwrite (user implies overwrite/import)
                    # Let's overwrite to ensure it's clean
                    result = await conn.execute("""
                        UPDATE error_codes 
                        SET faulty_part_isolation = $1
                        WHERE code = $2 
                        AND printer_id IN (SELECT id FROM printers WHERE model_name = $3)
                    """, cleaned_isolation, code, model)
                    
                    count = int(result.split()[-1])
                    if count > 0:
                        file_updated += count
                    else:
                        file_not_found += 1
            
            print(f"  Updated: {file_updated}, Not found/Skipped: {file_not_found}")
            total_updated += file_updated
            total_not_found += file_not_found
            
        except Exception as e:
            print(f"  ERROR processing file: {e}")
    
    await conn.close()
    
    print(f"\n=== SUMMARY ===")
    print(f"Total records updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(update_fault_isolation())
