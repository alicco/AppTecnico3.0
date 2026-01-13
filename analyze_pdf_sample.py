import pdfplumber
import re

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
output_path = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_analysis.txt"

print(f"Analyzing {pdf_path} (First 50 pages sample)...")

with pdfplumber.open(pdf_path) as pdf:
    with open(output_path, "w", encoding="utf-8") as f:
        # Check first 50 pages only for sample
        pages_to_check = pdf.pages[:50]
        for i, page in enumerate(pages_to_check):
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                for line in lines:
                    # Search for PS followed by digits
                    if "PS" in line:
                         # Relaxed search to capture context
                         f.write(f"Page {i+1}: {line}\n")

print(f"Sample analysis complete. Results saved to {output_path}")
