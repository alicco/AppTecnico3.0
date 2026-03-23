import pypdf
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\SectionC5080pm.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
        
    with open('pdf_content.txt', 'w', encoding='utf-8') as f:
        f.write(text)
        
    print("PDF content written to pdf_content.txt")
        
except Exception as e:
    print(f"Error reading PDF: {e}")
