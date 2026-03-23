import pandas as pd
import os
import sys

# Set encoding to utf-8
sys.stdout.reconfigure(encoding='utf-8')

file_path = r"c:\Users\forza\Gemini\AppTecnico3.0\Codici_C14010_C12010_C10500.xlsx"

print(f"\n--- {os.path.basename(file_path)} ---")
try:
    df = pd.read_excel(file_path, nrows=2)
    print("Columns:", list(df.columns))
except Exception as e:
    print(f"Error reading file: {e}")
