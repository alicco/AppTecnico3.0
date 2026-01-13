import pdfplumber
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf"

print(f"Analyzing {pdf_path}...")

with pdfplumber.open(pdf_path) as pdf:
    print(f"Total Pages: {len(pdf.pages)}")
    
    # Check a few pages for PS markers and Page Nums
    for p_idx in [50, 100, 200]:
        if p_idx >= len(pdf.pages): continue
        
        page = pdf.pages[p_idx]
        text = page.extract_text()
        
        print(f"\n--- Page {p_idx+1} (Abs) Analysis ---")
        if "PS" in text:
            print("Found 'PS' in text.")
            # Show a sample
            matches = re.findall(r'PS\d+', text)
            print(f"Sample matches: {matches[:5]}")
        else:
            print("No 'PS' found.")

        # Check Top Right for Page Number
        width = page.width
        height = page.height
        bbox = (width * 0.8, 0, width, height * 0.1)
        cropped = page.crop(bbox)
        header = cropped.extract_text()
        print(f"Header (Top-Right): '{header.strip() if header else 'None'}'")
