import pandas as pd
import numpy as np

INPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"
OUTPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"

def filter_destination():
    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE, sep=';', on_bad_lines='skip', dtype=str)
        original_count = len(df)
        print(f"Original row count: {original_count}")
        
        if 'destination' in df.columns:
            # Normalize NaN to empty string for easier processing, or handle mixed
            # Keep if: destination is NaN/None/Empty OR destination has 'C'
            
            # Helper to check condition
            def keep_row(dest):
                if pd.isna(dest) or dest.strip() == '':
                    return True
                return 'C' in dest

            filtered_df = df[df['destination'].apply(keep_row)]
            
            remaining = len(filtered_df)
            removed = original_count - remaining
            
            print(f"Rows remaining: {remaining}")
            print(f"Rows removed: {removed}")
            
            if removed > 0:
                print("Sample removed destinations:")
                removed_df = df[~df['destination'].apply(keep_row)]
                print(removed_df['destination'].unique())

            # Save
            print(f"Saving to {OUTPUT_FILE}...")
            filtered_df.to_csv(OUTPUT_FILE, index=False, sep=';')
            print("Done!")
            
        else:
            print("WARNING: 'destination' column not found!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    filter_destination()
