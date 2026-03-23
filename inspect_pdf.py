import pypdf
import os

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\SectionC5080pm.pdf"

try:
    reader = pypdf.PdfReader(pdf_path)
    print(f"Number of pages: {len(reader.pages)}")
    
    # Extract text from first few pages to identify the Table of Contents or mapping structure
    for i in range(min(5, len(reader.pages))):
        print(f"\n--- PDF Page {i+1} ---")
        print(reader.pages[i].extract_text())
        
except Exception as e:
    print(f"Error reading PDF: {e}")
