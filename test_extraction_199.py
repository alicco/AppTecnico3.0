import pdfplumber
import re
import math
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
target_page = 199 # User said 199 has PS6, PS7. This is 1-based index (page 200 in 0-based? or 199 in 0-based?)
                  # Usually users refer to the printed page number. Let's assume user means PDF page number.
                  # pypdf/pdfplumber use 0-based index. So Page 199 is index 198 (or 199 if user means index).
                  # Let's inspect pages 198, 199, 200, 201 to be safe around "199".
                  # User previously saw "PS6 at page 199". Previous CSV said PS6 at page 199.
                  # So CSV page 199 is likely the PDF page number.
                  # Adjusting to 0-based index: 198.

print(f"Analyzing Page 199 (Index 198) and Page 200 (Index 199) of {pdf_path}...")

def distance(bbox1, bbox2):
    # center1
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    # center2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

with pdfplumber.open(pdf_path) as pdf:
    # Page 199 (Diagram)
    p_diagram = pdf.pages[198] 
    # Page 200 (List)
    p_list = pdf.pages[199]

    print("--- Diagram Page Words (Subset) ---")
    words = p_diagram.extract_words()
    
    ps_items = [w for w in words if "PS" in w['text']]
    numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]

    results = []

    for ps in ps_items:
        # Find closest number
        best_num = None
        min_dist = float('inf')
        
        for num in numbers:
            d_val = distance((ps['x0'], ps['top'], ps['x1'], ps['bottom']), (num['x0'], num['top'], num['x1'], num['bottom']))
            
            if d_val < min_dist:
                min_dist = d_val
                best_num = num
        
        if best_num:
            results.append({
                "sensor": ps['text'],
                "key": best_num['text'],
                "dist": min_dist
            })

    with open(r"c:\Users\forza\Gemini\AppTecnico3.0\test_report.txt", "w", encoding="utf-8") as f:
        f.write("--- Detected Links on Diagram ---\n")
        for r in results:
            f.write(f"Sensor: {r['sensor']} -> Key: {r['key']} (Dist: {r['dist']:.2f})\n")

        f.write("\n--- List Page Content (First 20 lines text) ---\n")
        text_list = p_list.extract_text()
        if text_list:
            f.write(text_list[:500] + "\n")
        
        f.write("\n--- Matching Keys ---\n")
        lines = text_list.split('\n')
        for r in results:
            key = r['key']
            for line in lines:
                if line.strip().startswith(key + " "):
                    f.write(f"MATCH for {r['sensor']} (Key {key}): {line.strip()}\n")

