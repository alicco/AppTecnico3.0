import pdfplumber
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdfs = [
    (r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf", "C7100"),
    (r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf", "C12000")
]

with open("sections_dump.txt", "w", encoding="utf-8") as f:
    for pdf_path, name in pdfs:
        f.write(f"\n\n=== {name} PAGE 2 & 3 ===\n")
        with pdfplumber.open(pdf_path) as pdf:
            # Check Page 2 and 3 (Indices 1 and 2)
            for idx in [1, 2]:
                if idx < len(pdf.pages):
                    f.write(f"\n--- Page {idx+1} ---\n")
                    text = pdf.pages[idx].extract_text()
                    if text:
                        f.write(text)
                    else:
                        f.write("[No Text]")
