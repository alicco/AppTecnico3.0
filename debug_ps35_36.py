import pdfplumber
import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
page_num = 161 # Absolute Diagram Page
idx = page_num - 1

def distance(bbox1, bbox2):
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[idx]
    words = page.extract_words()
    
    # helper to print
    def print_obj(tag, obj):
        print(f"{tag}: '{obj['text']}' at ({obj['x0']:.1f}, {obj['top']:.1f})")

    ps_items = [w for w in words if w['text'] in ["PS35", "PS36"]]
    keys = [w for w in words if w['text'] in ["20", "11"]]
    
    with open("debug_results.txt", "w", encoding="utf-8") as f:
        f.write(f"--- Page {page_num} Analysis ---\n")
        for ps in ps_items:
            f.write(f"SENSOR: '{ps['text']}' at ({ps['x0']:.1f}, {ps['top']:.1f})\n")
            ps_box = (ps['x0'], ps['top'], ps['x1'], ps['bottom'])
            
            candidates = []
            for k in keys:
                k_box = (k['x0'], k['top'], k['x1'], k['bottom'])
                d = distance(ps_box, k_box)
                candidates.append((k['text'], d))
            
            candidates.sort(key=lambda x: x[1])
            f.write(f"  Nearest keys: {candidates}\n")

        # Also check list content on next page (162)
        next_page = pdf.pages[idx+1]
        text = next_page.extract_text()
        f.write(f"\n--- List Page 162 Snippet (Keys 11, 20) ---\n")
        for line in text.split('\n'):
            if line.strip().startswith("11 ") or line.strip().startswith("20 "):
                 f.write(line.strip() + "\n")
