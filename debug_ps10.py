import pdfplumber
import re
import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
# User says Page 245. Logic: Diagram P245, List P246?
# Or maybe Diagram P245 is index 244 using 0-based.
page_num = 245 
diagram_idx = page_num - 1
list_idx = page_num

print(f"Debugging Page {page_num} (Diagram) + {page_num+1} (List)...")

def distance(bbox1, bbox2):
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

with pdfplumber.open(pdf_path) as pdf:
    p_diagram = pdf.pages[diagram_idx]
    p_list = pdf.pages[list_idx]
    
    words = p_diagram.extract_words()
    # Find PS10
    ps10_items = [w for w in words if "PS10" in w['text']]
    print(f"Found {len(ps10_items)} 'PS10' items on diagram.")
    
    numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
    
    for ps in ps10_items:
        print(f"PS10 at {ps['x0']},{ps['top']} - {ps['text']}")
        candidates = []
        for num in numbers:
            d = distance((ps['x0'], ps['top'], ps['x1'], ps['bottom']), (num['x0'], num['top'], num['x1'], num['bottom']))
            if d < 100: # Tight radius
                candidates.append((num['text'], d))
        
        candidates.sort(key=lambda x: x[1])
        print(f"  --> Nearest numbers: {candidates}")

    # Check List
    text = p_list.extract_text()
    print("\n--- List Content Snippet ---")
    print(text[:500] if text else "No text found")
    
    # Check Key 2
    print("\n--- Searching for Key 2 ---")
    lines = text.split('\n')
    for line in lines:
        if line.strip().startswith("2 "):
            print(f"FOUND 2: {line.strip()}")
