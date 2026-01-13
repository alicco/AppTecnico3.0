import pdfplumber
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdfs = [
    r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf",
    r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf"
]

def clean_jp(text):
    return re.sub(r'[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]', '', text).strip()

for pdf_path in pdfs:
    print(f"\n--- Analyzing {pdf_path} (Page 2) Tables ---")
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[1] # Page 2
        tables = page.extract_tables()
        
        parsed_sections = []
        
        for table in tables:
            for row in table:
                # Row structure? Usually Name | Page OR Name | ... | Page
                # Look for cell with "P" and digits
                # e.g. "P.23", "P23", "23"
                
                # Check all cells
                page_val = None
                name_val = None
                
                # Heuristic: Page is usually last column or has "P"
                # Name is usually longer text
                
                # Join row to see
                # print(f"Raw Row: {row}")
                
                clean_row = [clean_jp(c) if c else "" for c in row]
                # identifying page
                for i, cell in enumerate(clean_row):
                    # Match P123 or just digits if ambiguous?
                    m = re.search(r'P\.?\s*(\d+)', cell, re.IGNORECASE)
                    if m:
                        page_val = int(m.group(1))
                        # Assume Name is in previous column?
                        if i > 0:
                            name_val = clean_row[i-1]
                        break
                
                if not page_val and not name_val:
                     # Maybe formatted differently?
                     pass

                if page_val and name_val:
                    parsed_sections.append((page_val, name_val))

        # Sort by page
        parsed_sections.sort(key=lambda x: x[0])
        print(f"Parsed {len(parsed_sections)} sections:")
        for p, n in parsed_sections:
            print(f"  Page {p}: {n}")
