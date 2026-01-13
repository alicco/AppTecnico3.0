import pdfplumber
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdfs = [
    r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf",
    r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf"
]

for pdf_path in pdfs:
    print(f"\n--- TEXT DUMP {pdf_path} (Page 2) ---")
    with pdfplumber.open(pdf_path) as pdf:
        print(pdf.pages[1].extract_text()[:3000])
