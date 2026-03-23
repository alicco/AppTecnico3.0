import pandas as pd

INPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"
OUTPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"

def clean_c5070():
    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE, sep=';', on_bad_lines='skip', dtype=str)
        original_count = len(df)
        print(f"Original row count: {original_count}")
        
        # Filter Class 'V'
        # Ensure column name consistency (case insensitive check)
        class_col = next((c for c in df.columns if c.lower() == 'class'), None)
        if class_col:
            df = df[df[class_col] != 'V']
            print(f"After removing Class 'V': {len(df)}")
        else:
            print("WARNING: 'class' column not found!")

        # Filter Part Code starting with 'V'
        code_col = next((c for c in df.columns if c.lower() == 'part_code'), None)
        if code_col:
            df = df[~df[code_col].str.startswith('V', na=False)]
            print(f"After removing codes starting with 'V': {len(df)}")
        else:
            print("WARNING: 'part_code' column not found!")
            
        print(f"Removed {original_count - len(df)} rows.")

        # Save
        print(f"Saving to {OUTPUT_FILE}...")
        df.to_csv(OUTPUT_FILE, index=False, sep=';')
        print("Done!")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_c5070()
