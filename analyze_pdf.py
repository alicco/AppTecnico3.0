import pdfplumber
import re

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
output_path = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_analysis.txt"

print(f"Analyzing {pdf_path}...")

with pdfplumber.open(pdf_path) as pdf:
    with open(output_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                for line in lines:
                    # Search for PS followed by digits (e.g., PS1, PS12)
                    if re.search(r'\bPS\d+\b', line):
                        f.write(f"Page {i+1}: {line}\n")

print(f"Analysis complete. Results saved to {output_path}")
