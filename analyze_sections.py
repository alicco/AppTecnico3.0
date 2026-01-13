import pdfplumber
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdfs = [
    r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf",
    r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf"
]

for pdf_path in pdfs:
    print(f"\n--- Analyzing {pdf_path} (Page 2) ---")
    with pdfplumber.open(pdf_path) as pdf:
        # Page 2 is index 1
        page = pdf.pages[1]
        text = page.extract_text()
        print(text[:1000]) # First 1000 chars
        
        # Also try to extract tables
        tables = page.extract_tables()
        print(f"Found {len(tables)} tables.")
        if tables:
            print("Table 1 snippet:")
            for row in tables[0][:5]:
                print(row)
