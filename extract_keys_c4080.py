import fitz
import pdfplumber
import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C4080pm.pdf"
OUTPUT_DIR = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_images\C4080"
DPI = 150

def extract_keys_optimized():
    # 1. Identify which pages we have images for (PXX.webp)
    existing_images = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.webp') and f.startswith('P')]
    print(f"Found {len(existing_images)} images to process keys for.")
    
    # Sort them by page number
    try:
        pages = sorted([int(f[1:-5]) for f in existing_images])
    except:
        print("Error parsing filenames.")
        return

    # Map manual to abs again (fast fitz scan)
    print("Mapping pages...")
    doc = fitz.open(PDF_PATH)
    manual_to_abs = {}
    
    # Fast map: check first text block for "P <Num>"
    for i in range(len(doc)):
        page = doc[i]
        try:
             # Look at top rightish area 
             # Or just full text (fitz is fast)
             text = page.get_text()
             # Simple regex
             import re
             m = re.search(r'P\s*(\d+)', text)
             if m:
                 p_num = int(m.group(1))
                 if p_num not in manual_to_abs:
                     manual_to_abs[p_num] = i
        except:
            pass
    doc.close()
    
    # 2. Extract Keys
    keys_data = {}
    print("Extracting keys (this may take a while)...")
    
    with pdfplumber.open(PDF_PATH) as pdf:
        count = 0
        total = len(pages)
        
        for p_num in pages:
            count += 1
            if p_num not in manual_to_abs:
                print(f"[{count}/{total}] Warning: P{p_num} not in PDF")
                continue
            
            abs_idx = manual_to_abs[p_num]
            page = pdf.pages[abs_idx]
            
            # Words
            words = page.extract_words()
            keys = []
            
            for w in words:
                text = w['text'].strip()
                if text.isdigit() and 1 <= len(text) <= 3:
                     # Calculate %
                    x_pct = (w['x0'] + w['x1']) / 2 / page.width * 100
                    y_pct = (w['top'] + w['bottom']) / 2 / page.height * 100
                    
                    keys.append({
                        "key": text,
                        "x": round(x_pct, 2),
                        "y": round(y_pct, 2)
                    })
            
            keys_data[str(p_num)] = keys
            
            if count % 10 == 0:
                print(f"[{count}/{total}] Processed P{p_num}...")

    # 3. Save Metadata
    # Reconstruct pages list for metadata
    pages_meta = []
    for p_num in pages:
        # Get width/height from .webp if possible, or assume A4 landscape ratio?
        # Let's read one image or just default
        # Ideally we read image dims, but to save time we assume standard.
        # Actually we can do it properly if needed, but keys_data is the main goal.
        # Let's read the image just to be safe.
        img_path = os.path.join(OUTPUT_DIR, f"P{p_num}.webp")
        # We assume existence
        pages_meta.append({
            "manual_page": p_num,
            "image": f"P{p_num}.webp"
        })

    metadata = {
        "model": "C4080",
        "pdf": "C4080pm.pdf",
        "dpi": DPI,
        "pages": pages_meta,
        "keys": keys_data
    }
    
    meta_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Done! Metadata saved to {meta_path}")

if __name__ == "__main__":
    extract_keys_optimized()
