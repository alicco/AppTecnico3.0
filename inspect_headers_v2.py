import pandas as pd
import os
import sys

# Set encoding to utf-8 just in case
sys.stdout.reconfigure(encoding='utf-8')

files = [
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C14000_C12000.xlsx",
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C6100_ok.xlsx",
    r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C7100_C7090.csv"
]

with open('header_info.txt', 'w', encoding='utf-8') as outfile:
    for f in files:
        outfile.write(f"\n--- {os.path.basename(f)} ---\n")
        try:
            if f.endswith('.xlsx'):
                df = pd.read_excel(f, nrows=2)
            else:
                df = pd.read_csv(f, nrows=2, on_bad_lines='skip')
            
            outfile.write(f"Columns: {list(df.columns)}\n")
        except Exception as e:
            outfile.write(f"Error reading {os.path.basename(f)}: {e}\n")
