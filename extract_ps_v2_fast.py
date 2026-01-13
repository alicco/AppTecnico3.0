import pypdf
import pdfplumber
import re
import math
import csv
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_v2.csv"

SENSOR_KEYWORDS = ["SENSOR", "SWITCH", "PHOTO", "DETECT"]

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

print("Phase 1: Fast Scan with pypdf...")
target_pages = []
try:
    reader = pypdf.PdfReader(pdf_path)
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text()
            if text and re.search(r'\bPS\d+\b', text):
                target_pages.append(i) # 0-based
        except:
            pass
except Exception as e:
    print(f"pypdf error: {e}")

print(f"Found {len(target_pages)} candidate pages.")

print("Phase 2: Deep Extraction with pdfplumber...")
all_results = []

with pdfplumber.open(pdf_path) as pdf:
    # Pre-parse lists? No, do on demand.
    # Note: target_pages are Diagram pages. List is likely at p+1.
    
    # Cache lists to avoid re-parsing if multiple diagrams refer to same list (unlikely but possible)
    list_cache = {}
    
    for i, p_idx in enumerate(target_pages):
        if i % 5 == 0: print(f"Processing candidate {i+1}/{len(target_pages)} (Page {p_idx+1})...")
        
        # Diagram Page
        if p_idx >= len(pdf.pages): continue
        p_diagram = pdf.pages[p_idx]
        
        # List Page (Next)
        l_idx = p_idx + 1
        if l_idx >= len(pdf.pages): continue
        
        if l_idx not in list_cache:
            p_list = pdf.pages[l_idx]
            list_cache[l_idx] = parse_parts_list(p_list)
        
        parts_db = list_cache[l_idx]
        
        words = p_diagram.extract_words()
        ps_items = [w for w in words if "PS" in w['text']]
        numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
        
        for ps in ps_items:
            s_name = re.sub(r'[\(\)]', '', ps['text']).strip()
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
                    "page": p_idx + 1,
                    "score": best['score']
                })
            else:
                 all_results.append({
                    "sensor_id": s_name,
                    "part_code": "UNKNOWN",
                    "description": "-",
                    "key": "-",
                    "page": p_idx + 1,
                    "score": -1
                })

# Deduplication
grouped = {}
for r in all_results:
    sid = r['sensor_id']
    if sid not in grouped: grouped[sid] = []
    grouped[sid].append(r)

final_rows = []
for sid, rows in grouped.items():
    # Prefer score > 0
    # Prefer recently discussed pages? No, just best match.
    rows.sort(key=lambda x: (-x['score'], x['part_code'] == "UNKNOWN"))
    final_rows.append(rows[0])

final_rows.sort(key=lambda x: int(re.search(r'\d+', x['sensor_id']).group()) if re.search(r'\d+', x['sensor_id']) else 999)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page"])
    writer.writeheader()
    writer.writerows(final_rows)

print(f"Done. Saved {len(final_rows)} sensors to {output_csv}")
