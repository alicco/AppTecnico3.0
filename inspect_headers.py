import pandas as pd
import os

files = [
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C14000_C12000.xlsx",
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C6100_ok.xlsx",
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C7100_C7090.csv"
]

for f in files:
    print(f"\n--- {os.path.basename(f)} ---")
    try:
        if f.endswith('.xlsx'):
            df = pd.read_excel(f, nrows=2)
        else:
            df = pd.read_csv(f, nrows=2, on_bad_lines='skip')
        
        print("Columns:", list(df.columns))
    except Exception as e:
        print(f"Error reading {os.path.basename(f)}: {e}")
