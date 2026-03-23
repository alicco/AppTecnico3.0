import pandas as pd

INPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"
OUTPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070_duplicates.csv"

def find_duplicates():
    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE, sep=';', on_bad_lines='skip', dtype=str)
        
        # Check for duplicates based on page_number and ref_number
        # keep=False marks ALL duplicates as True
        duplicates = df[df.duplicated(subset=['page_number', 'ref_number'], keep=False)]
        
        if duplicates.empty:
            print("No duplicates found with same Page and Ref number.")
        else:
            print(f"Found {len(duplicates)} duplicate records.")
            
            # Sort by Page and Ref for easier reading
            duplicates_sorted = duplicates.sort_values(by=['page_number', 'ref_number'])
            
            # Save
            print(f"Saving duplicates to {OUTPUT_FILE}...")
            duplicates_sorted.to_csv(OUTPUT_FILE, index=False, sep=';')
            print("Done!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_duplicates()
