import asyncio
import asyncpg

DB_URL = 'postgresql://postgres.sitxqsefkuaovgqunawa:4275142Ss.!@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'

# Models to clean
TARGET_MODELS = ["C12000", "C14000", "C6100", "C6085", "C7100", "C7090"]

async def cleanup_fault_isolation():
    conn = await asyncpg.connect(DB_URL)
    
    print("=== Cleaning Fault Isolation Data ===")
    print("Removing text after DIPSW references...")
    
    # Get all records with fault isolation data for target models
    rows = await conn.fetch("""
        SELECT ec.id, ec.faulty_part_isolation, p.model_name
        FROM error_codes ec
        JOIN printers p ON ec.printer_id = p.id
        WHERE p.model_name = ANY($1)
        AND ec.faulty_part_isolation IS NOT NULL
        AND ec.faulty_part_isolation != ''
    """, TARGET_MODELS)
    
    print(f"Found {len(rows)} records to process")
    
    updated = 0
    for row in rows:
        original = row['faulty_part_isolation']
        
        # Find patterns like "Control while detached" or similar and remove them
        # Looking for the pattern: DipSW X-X followed by anything else
        import re
        
        # Keep only DipSW references, remove "Control while detached" etc.
        # Pattern: Keep everything up to and including DipSW X-X patterns
        # Remove: ", Control while detached" or similar trailing text
        
        # Split by comma or newline and keep only lines/parts with DipSW
        cleaned_parts = []
        parts = re.split(r'[,\n]', original)
        
        for part in parts:
            part = part.strip()
            # Keep if it contains DipSW or SW followed by numbers
            if re.search(r'(?:DipSW|SW)\s*\d+-\d+', part, re.IGNORECASE):
                # Extract just the DipSW part, remove trailing descriptions
                # e.g., "DipSW 7-1 Control while detached" -> "DipSW 7-1"
                match = re.search(r'((?:DipSW|SW)\s*\d+-\d+)', part, re.IGNORECASE)
                if match:
                    cleaned_parts.append(match.group(1))
        
        cleaned = ', '.join(cleaned_parts) if cleaned_parts else original
        
        # Only update if changed
        if cleaned != original:
            await conn.execute("""
                UPDATE error_codes SET faulty_part_isolation = $1 WHERE id = $2
            """, cleaned, row['id'])
            updated += 1
            if updated <= 5:  # Show first 5 examples
                print(f"  Example: '{original[:60]}...' -> '{cleaned}'")
    
    await conn.close()
    print(f"\nTotal records cleaned: {updated}")

if __name__ == "__main__":
    asyncio.run(cleanup_fault_isolation())
