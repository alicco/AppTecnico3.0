"""
Generate WebP images from C7100 PDF diagram pages and extract Key coordinates.
Output:
- WebP images in ./pdf_images/C7100/
- JSON file with Key coordinates for overlay: ./pdf_images/C7100/keys_coords.json
"""
import fitz  # PyMuPDF
import pdfplumber
from PIL import Image
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# --- Configuration ---
PDF_PATH = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
OUTPUT_DIR = r"c:\Users\forza\Gemini\AppTecnico3.0\pdf_images\C7100"
CSV_PATH = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\Sensori_C7100.csv"
DPI = 150  # Good balance between quality and size

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_relevant_pages(csv_path):
    """Extract unique page numbers from sensor CSV."""
    pages = set()
    with open(csv_path, 'r', encoding='utf-8') as f:
        next(f)  # Skip header
        for line in f:
            parts = line.strip().split(',')
            if len(parts) >= 7:
                try:
                    page = int(parts[6])  # 'page' column
                    pages.add(page)
                except ValueError:
                    pass
    return sorted(pages)

def convert_pages_to_images(pdf_path, pages, output_dir, dpi=150):
    """Convert specified PDF pages to WebP images."""
    doc = fitz.open(pdf_path)
    generated = []
    
    # We need to map manual page numbers to absolute PDF indices
    # Manual page P1 is typically PDF page 3 (after cover, ToC)
    # But this varies. Let's extract from the PDF itself.
    
    # Strategy: For each manual page N, find the PDF page with "P N" in header
    # This is slow, so let's do it once with pdfplumber
    
    print("Mapping manual pages to PDF indices...")
    manual_to_abs = {}
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # Extract top-right header
            w = page.width
            h = page.height
            try:
                cropped = page.crop((w * 0.8, 0, w, h * 0.1))
                text = cropped.extract_text()
                if text:
                    m = re.search(r'P\s*(\d+)', text)
                    if m:
                        manual_page = int(m.group(1))
                        manual_to_abs[manual_page] = i
            except:
                pass
    
    print(f"Mapped {len(manual_to_abs)} manual pages.")
    
    # Now convert
    for manual_page in pages:
        if manual_page not in manual_to_abs:
            print(f"Warning: Manual page {manual_page} not found in PDF.")
            continue
            
        abs_idx = manual_to_abs[manual_page]
        pdf_page = doc[abs_idx]
        
        # Render at specified DPI
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = pdf_page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image and save as WebP
        img_data = pix.tobytes("png")
        pil_img = Image.open(io.BytesIO(img_data))
        img_path = os.path.join(output_dir, f"P{manual_page}.webp")
        pil_img.save(img_path, "WEBP", quality=85)
        
        generated.append({
            "manual_page": manual_page,
            "abs_page": abs_idx,
            "image": f"P{manual_page}.webp",
            "width": pix.width,
            "height": pix.height
        })
        
        print(f"Generated: P{manual_page}.webp ({pix.width}x{pix.height})")
    
    doc.close()
    return generated, manual_to_abs

def extract_key_coordinates(pdf_path, pages, manual_to_abs):
    """Extract coordinates of Key numbers on each page."""
    keys_data = {}
    
    with pdfplumber.open(pdf_path) as pdf:
        for manual_page in pages:
            if manual_page not in manual_to_abs:
                continue
                
            abs_idx = manual_to_abs[manual_page]
            page = pdf.pages[abs_idx]
            
            # Extract words
            words = page.extract_words()
            
            # Find Key numbers (1-3 digit numbers near PS labels)
            # We'll store all small numbers as potential keys
            keys = []
            for w in words:
                text = w['text'].strip()
                if text.isdigit() and 1 <= len(text) <= 3:
                    # Normalize coordinates to percentage (for responsive overlay)
                    x_pct = (w['x0'] + w['x1']) / 2 / page.width * 100
                    y_pct = (w['top'] + w['bottom']) / 2 / page.height * 100
                    
                    keys.append({
                        "key": text,
                        "x": round(x_pct, 2),
                        "y": round(y_pct, 2),
                        "x0": round(w['x0'], 1),
                        "y0": round(w['top'], 1),
                        "x1": round(w['x1'], 1),
                        "y1": round(w['bottom'], 1)
                    })
            
            keys_data[str(manual_page)] = keys
            print(f"Page {manual_page}: Found {len(keys)} key candidates")
    
    return keys_data

if __name__ == "__main__":
    print("=== C7100 PDF Image Generator ===")
    
    # Step 1: Get relevant pages from CSV
    print("\nStep 1: Reading relevant pages from CSV...")
    try:
        pages = get_relevant_pages(CSV_PATH)
        print(f"Found {len(pages)} unique pages: {pages[:10]}...")
    except FileNotFoundError:
        print(f"CSV not found at {CSV_PATH}, using fallback scan...")
        # Fallback: scan PDF for pages with PS markers
        pages = []
        with pdfplumber.open(PDF_PATH) as pdf:
            for i, p in enumerate(pdf.pages):
                text = p.extract_text()
                if text and re.search(r'\bPS\d+\b', text):
                    # Get manual page number
                    try:
                        w = p.width
                        h = p.height
                        cropped = p.crop((w * 0.8, 0, w, h * 0.1))
                        header = cropped.extract_text()
                        if header:
                            m = re.search(r'P\s*(\d+)', header)
                            if m:
                                pages.append(int(m.group(1)))
                    except:
                        pass
        pages = sorted(set(pages))
        print(f"Fallback found {len(pages)} pages with PS markers.")
    
    # Step 2: Convert pages to images
    print("\nStep 2: Converting pages to WebP images...")
    generated, manual_to_abs = convert_pages_to_images(PDF_PATH, pages, OUTPUT_DIR, DPI)
    print(f"Generated {len(generated)} images.")
    
    # Step 3: Extract key coordinates
    print("\nStep 3: Extracting Key coordinates...")
    keys_data = extract_key_coordinates(PDF_PATH, pages, manual_to_abs)
    
    # Step 4: Save metadata
    print("\nStep 4: Saving metadata...")
    
    metadata = {
        "model": "C7100",
        "pdf": "C7100pmMod.pdf",
        "dpi": DPI,
        "pages": generated,
        "keys": keys_data
    }
    
    meta_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone! Metadata saved to: {meta_path}")
    print(f"Images saved to: {OUTPUT_DIR}")
