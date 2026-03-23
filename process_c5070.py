import pandas as pd
import os

INPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pmorigine.csv"
OUTPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"

# Column mapping: CSV Header -> DB Column
COLUMN_MAPPING = {
    'Model Name': 'model',
    'Page': 'page_number',
    'Key': 'ref_number',
    'Parts No.': 'part_code',
    'Parts Name': 'name',
    'Destinations': 'destination',
    'Class': 'class',
    'Quantity': 'quantity',
    'Ship Unit': 'ship_unit',
    'PMN No.': 'pmn_no'
}

def process_c5070():
    print(f"Reading {INPUT_FILE}...")
    try:
        # Read with semicolon delimiter
        df = pd.read_csv(INPUT_FILE, sep=';', on_bad_lines='skip', dtype=str)
        
        # Rename columns
        print("Renaming columns...")
        df.rename(columns=COLUMN_MAPPING, inplace=True)
        
        # Standardize Model Name
        print("Setting model name to 'C5070'...")
        df['model'] = 'C5070'
        
        # Add missing columns
        if 'section_name' not in df.columns:
            print("Adding empty 'section_name' column...")
            df['section_name'] = ''
            
        # Ensure column order matches DB schema preference (optional but good for readability)
        desired_order = [
            'model', 'section_name', 'page_number', 'ref_number', 'part_code', 
            'name', 'destination', 'class', 'quantity', 'ship_unit', 'pmn_no'
        ]
        
        # Reorder columns, keeping only those that exist
        final_cols = [c for c in desired_order if c in df.columns]
        # specific handling if we missed any original columns that we want to keep?
        # The user said "name columns same as supabase". Let's stick to the mapped ones + section_name.
        
        df = df[final_cols]
        
        # Save
        print(f"Saving to {OUTPUT_FILE}...")
        df.to_csv(OUTPUT_FILE, index=False, sep=';')
        print("Done!")
        
        # Preview
        print("\nPreview of first 5 rows:")
        print(df.head())
        print("\nColumns:", list(df.columns))

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process_c5070()
