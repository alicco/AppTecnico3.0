import pdfplumber
import re

pdf_path = "dipswC6100.pdf"

print(f"Inspecting {pdf_path} for Switch 1...")

with pdfplumber.open(pdf_path) as pdf:
    current_sw = None
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                if not row or len(row) < 2: continue
                r0 = str(row[0]) if row[0] else ""
                
                # Update current SW
                if r0:
                    clean = re.sub(r'\D', '', r0)
                    if clean:
                        current_sw = int(clean)
                
                if current_sw == 1:
                     print(f"Row (SW={current_sw}): {row}")
