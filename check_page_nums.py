import pdfplumber
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
# Pages to check (1-based from CSV): 245, 199, 215
pages_to_check = [245, 199, 215]

with pdfplumber.open(pdf_path) as pdf:
    for p_num in pages_to_check:
        # absolute index = p_num - 1 (assuming CSV used 1-based absolute)
        # However, previous extraction used `i + 1` where `i` was 0-based index. Use p_num-1.
        
        idx = p_num - 1
        page = pdf.pages[idx]
        width = page.width
        height = page.height
        
        # Crop Top Right: Right 20%, Top 10%
        bbox = (width * 0.8, 0, width, height * 0.1)
        cropped = page.crop(bbox)
        text = cropped.extract_text()
        
        print(f"--- Page {p_num} (Absolute) Top Right ---")
        print(f"Text: '{text.strip() if text else 'None'}'")
        
        # Also try Extract Words to see if number is isolated
        words = cropped.extract_words()
        print(f"Words: {[w['text'] for w in words]}")
