import fitz  # PyMuPDF
import pdfplumber
from PIL import Image
import io
import json
import os
import re
import sys
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

# --- Configuration ---
PDF_PATH = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C4080pm.pdf"
OUTPUT_DIR = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_images\C4080"
CSV_PATH = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C4080pmcompleto.csv"
DPI = 150

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_relevant_pages(csv_path):
    """Extract unique page numbers from sensor CSV."""
    print(f"Scanning {csv_path}...")
    try:
        # Use pandas for robust CSV parsing with semicolon
        df = pd.read_csv(csv_path, sep=';', on_bad_lines='skip', dtype=str)
        # Normalize columns: strip spaces, lower case
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Look for 'page' column
        if 'page' in df.columns:
            # Drop NaN, convert to int where possible
            pages = df['page'].dropna().unique()
            # Filter numeric
            valid_pages = []
            for p in pages:
                if str(p).isdigit():
                    valid_pages.append(int(p))
            return sorted(list(set(valid_pages)))
        else:
            print("Column 'Page' not found in CSV.")
            return []
            
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return []

def convert_pages_to_images(pdf_path, pages, output_dir, dpi=150):
    """Convert specified PDF pages to WebP images."""
    doc = fitz.open(pdf_path)
    generated = []
    
    print("Mapping manual pages to PDF indices...")
    manual_to_abs = {}
    
    # Pre-scan for P XX headers using pdfplumber for text extraction logic
    # (Or stick to fitz for speed if reliable)
    # Using fitz for speed first
    
    for i in range(len(doc)):
        page = doc[i]
        # Crop to top-right corner where "P 1" usually is
        # Adjust crop box as needed. PDF is 842x595 (Landscape)
        # Header "AccurioPress C4080" is top Left? Page num top Right?
        w = page.rect.width
        h = page.rect.height
        
        try:
            # Look at top area
            # Rotation 90 might affect coordinates?
            # page.get_text() returns text in reading order usually.
            
            # Use blocks to find "P <Num>"
            text = page.get_text()
            # Regex for P <Num>
            # Pattern: "P\s*(\d+)"
            # Or dedicated line?
            
            matches = re.findall(r'P\s*(\d+)', text)
            if matches:
                # Usually the page number is the *last* one or isolated?
                # Sometimes "P 1" is distinct.
                # Let's verify strict patterns if possible.
                # Heuristic: the number is likely < 200.
                for m in matches:
                    p_num = int(m)
                    # Use the first one found? Or last?
                    # In manuals, header is often repeated.
                    # Page numbers usually increment. 
                    # Let's map strict P<Space><Num> or P<Num>
                    # Assuming there's only one valid "P Num" indicating the page.
                    manual_to_abs[p_num] = i
                    # Found one, break? Page might mention other pages.
                    # But usually the Page indicator is P XX.
                    # Let's trust the first specific match for now.
                    break 
        except:
            pass
            
    print(f"Mapped {len(manual_to_abs)} pages.")
    
    # Generate Images
    for manual_page in pages:
        if manual_page not in manual_to_abs:
            print(f"Skipping P{manual_page} (Not found in PDF)")
            continue
            
        abs_idx = manual_to_abs[manual_page]
        pdf_page = doc[abs_idx]
        
        # Render
        # fitz.Matrix handles DPI
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        
        # Handle Rotation? 
        # get_pixmap() SHOULD respect rotation 90 by default to appear upright
        pix = pdf_page.get_pixmap(matrix=mat)
        
        # Save
        img_data = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_data))
        
        # Save as WebP
        img_path = os.path.join(output_dir, f"P{manual_page}.webp")
        
        if os.path.exists(img_path):
            print(f"Skipping P{manual_page} (Already exists)")
            # Still append to generated list for metadata consistency (though we use dedicated script for metadata now)
            generated.append({
                "manual_page": manual_page,
                "abs_page": abs_idx,
                "image": f"P{manual_page}.webp",
                "width": 0, # Placeholder
                "height": 0
            })
            continue

        pil_img.save(img_path, "WEBP", quality=85)
        
        generated.append({
            "manual_page": manual_page,
            "abs_page": abs_idx,
            "image": f"P{manual_page}.webp",
            "width": pix.width,
            "height": pix.height
        })
        print(f"Generated P{manual_page}.webp")

    doc.close()
    return generated, manual_to_abs

def extract_key_coordinates(pdf_path, pages, manual_to_abs):
    """Extract coordinates of Key numbers."""
    keys_data = {}
    
    # Use pdfplumber for better word coordinate extraction
    with pdfplumber.open(pdf_path) as pdf:
        for manual_page in pages:
            if manual_page not in manual_to_abs:
                continue
            
            abs_idx = manual_to_abs[manual_page]
            page = pdf.pages[abs_idx]
            
            words = page.extract_words()
            keys = []
            
            for w in words:
                text = w['text'].strip()
                # Heuristic: Key is 1-3 digits. 
                # Avoid "P1", "C4080", dates etc.
                # Must be purely digits.
                if text.isdigit() and 1 <= len(text) <= 3:
                    # Normalize to %
                    x_pct = (w['x0'] + w['x1']) / 2 / page.width * 100
                    y_pct = (w['top'] + w['bottom']) / 2 / page.height * 100
                    
                    keys.append({
                        "key": text,
                        "x": round(x_pct, 2),
                        "y": round(y_pct, 2)
                    })
            
            keys_data[str(manual_page)] = keys
            
    return keys_data

if __name__ == "__main__":
    print("=== C4080 Image Generator ===")
    
    # 1. Get Pages
    pages = get_relevant_pages(CSV_PATH)
    if not pages:
        print("No pages found! Exiting.")
        sys.exit(1)
        
    print(f"Relevant pages: {len(pages)}")
    
    # 2. Images
    generated, mapping = convert_pages_to_images(PDF_PATH, pages, OUTPUT_DIR, DPI)
    
    # 3. Keys
    print("Extracting Keys...")
    keys_data = extract_key_coordinates(PDF_PATH, pages, mapping)
    
    # 4. Metadata
    metadata = {
        "model": "C4080",
        "pdf": "C4080pm.pdf",
        "dpi": DPI,
        "pages": generated,
        "keys": keys_data
    }
    
    meta_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
        
    print("Done!")
