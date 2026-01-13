import pdfplumber
import re
import math
import csv
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Clean.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Refined.csv"

SENSOR_KEYWORDS = ["SENSOR", "SWITCH", "PHOTO", "DETECT"]

# 1. Get List of Target Pages
target_pages = set()
try:
    with open(input_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                p = int(row['page'])
                target_pages.add(p)
            except: pass
except:
    pass

# ADD PAGE 245 (User Fix)
target_pages.add(245)
# ADD PAGE 235 (To check duplication)
target_pages.add(235)

sorted_pages = sorted(list(target_pages))
print(f"Targeting {len(sorted_pages)} pages: {sorted_pages}")

def distance(bbox1, bbox2):
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

def clean_desc(text):
    return re.sub(r'[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]', '', text).strip()

def parse_parts_list(page_obj):
    text = page_obj.extract_text()
    if not text: return {}
    parts_map = {}
    lines = text.split('\n')
    line_pattern = re.compile(r'^(\d{1,3})\s+([A-Z0-9\-\.]{5,15})\s+(.+)$')
    for line in lines:
        line = line.strip()
        m = line_pattern.match(line)
        if m:
            key = m.group(1)
            code = m.group(2)
            desc = clean_desc(m.group(3))
            parts_map[key] = {"code": code, "desc": desc}
    return parts_map

all_results = []

with pdfplumber.open(pdf_path) as pdf:
    # Processing
    # We assume 'page' in CSV means Diagram Page (1-based)
    
    total_pages = len(pdf.pages)
    
    for page_num in sorted_pages:
        # Pagenum is 1-based index of Diagram
        d_idx = page_num - 1
        l_idx = page_num # Next page for list
        
        if l_idx >= total_pages: continue
        
        p_diagram = pdf.pages[d_idx]
        p_list = pdf.pages[l_idx]
        
        parts_db = parse_parts_list(p_list)
        words = p_diagram.extract_words()
        
        ps_items = [w for w in words if "PS" in w['text']]
        numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
        
        for ps in ps_items:
            # Filter out (PSxx) as they are harness pointers, not sensors
            if "(" in ps['text'] or ")" in ps['text']:
                continue

            s_name = ps['text'].strip()
            if not re.match(r'^PS\d+$', s_name): continue
            
            ps_box = (ps['x0'], ps['top'], ps['x1'], ps['bottom'])
            candidates = []
            
            for num in numbers:
                 key_val = num['text']
                 if key_val in parts_db:
                     d = distance(ps_box, (num['x0'], num['top'], num['x1'], num['bottom']))
                     if d < 200:
                         info = parts_db[key_val]
                         upper_d = info['desc'].upper()
                         score = 0
                         if any(k in upper_d for k in SENSOR_KEYWORDS): score = 1000
                         candidates.append({'key': key_val, 'dist': d, 'score': score, 'info': info})
            
            if candidates:
                candidates.sort(key=lambda x: (-x['score'], x['dist']))
                best = candidates[0]
                all_results.append({
                    "sensor_id": s_name,
                    "part_code": best['info']['code'],
                    "description": best['info']['desc'],
                    "key": best['key'],
                    "page": page_num,
                    "score": best['score']
                })
            else:
                 all_results.append({
                    "sensor_id": s_name,
                    "part_code": "UNKNOWN",
                    "description": "-",
                    "key": "-",
                    "page": page_num,
                    "score": -1
                })

# Deduplication (Keep best PS10, etc.)
grouped = {}
for r in all_results:
    sid = r['sensor_id']
    if sid not in grouped: grouped[sid] = []
    grouped[sid].append(r)

final_rows = []
for sid, rows in grouped.items():
    # Sort by Score DESC, then valid code
    rows.sort(key=lambda x: (-x['score'], x['part_code'] == "UNKNOWN"))
    final_rows.append(rows[0])

final_rows.sort(key=lambda x: int(re.search(r'\d+', x['sensor_id']).group()) if re.search(r'\d+', x['sensor_id']) else 999)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page", "score"])
    writer.writeheader()
    writer.writerows(final_rows)

print(f"Refined extraction complete. Saved to {output_csv}")
