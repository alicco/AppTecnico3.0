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
    # Remove Japanese characters (Hiragana, Katakana, Kanji)
    # Ranges: \u3000-\u303f (punctuation), \u3040-\u309f (hiragana), \u30a0-\u30ff (katakana), \u4e00-\u9faf (kanji), \uff00-\uffef (fullwidth)
    return re.sub(r'[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]', '', text).strip()

def parse_parts_list(page_obj):
    text = page_obj.extract_text()
    if not text:
        return {}
    parts_map = {}
    lines = text.split('\n')
    line_pattern = re.compile(r'^(\d{1,3})\s+([A-Z0-9\-\.]{5,15})\s+(.+)$')
    for line in lines:
        line = line.strip()
        m = line_pattern.match(line)
        if m:
            key = m.group(1)
            code = m.group(2)
            desc = clean_desc(m.group(3)) # Clean output immediately
            parts_map[key] = {"code": code, "desc": desc}
    return parts_map

print(f"Starting V2 Extraction on full PDF...")
all_results = []

with pdfplumber.open(pdf_path) as pdf:
    # We scan ALL pages from 1 to end (skip 0 usually TOC)
    # Optimization: Only scan pages that actually have "PS" text?
    # Yes.
    
    # 1. First pass: Identify pages with "PS"
    # Actually, iterate all is safer.
    
    total_pages = len(pdf.pages)
    
    for i in range(total_pages):
        if i % 20 == 0: print(f"Scanning page {i+1}...")
        
        # Heuristic: Diagram Page (i) + List Page (i+1)
        # Check if Diagram has "PS"
        page = pdf.pages[i]
        text = page.extract_text()
        if not text or "PS" not in text:
            continue
            
        # Refine: Check if "PS" followed by digit exists
        if not re.search(r'PS\d+', text):
            continue
            
        # It's a candidate diagram page.
        # Check if next page exists for list
        if i + 1 >= total_pages:
            continue
            
        list_page = pdf.pages[i+1]
        
        # processing
        parts_db = parse_parts_list(list_page)
        # If parts_db empty, maybe LIST is on SAME page? 
        # Or maybe Diagram is on RIGHT (p+1) and List on LEFT (p)? (Unlikely in PDF flow)
        # For now assume Next Page.
        
        words = page.extract_words()
        ps_items = [w for w in words if "PS" in w['text']]
        numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
        
        for ps in ps_items:
            s_name = re.sub(r'[\(\)]', '', ps['text']).strip() # Normalize PS(10) -> PS10
            if not re.match(r'^PS\d+$', s_name):
                continue
            
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
                         if any(k in upper_d for k in SENSOR_KEYWORDS):
                             score = 1000
                         candidates.append({'key': key_val, 'dist': d, 'score': score, 'info': info})
            
            if candidates:
                # Sort by Score DESC, Dist ASC
                candidates.sort(key=lambda x: (-x['score'], x['dist']))
                best = candidates[0]
                
                # Filter: If best score < 1000 (no sensor keyword), imply ambiguity/low confidence
                # But keep it if it's the only close one? 
                # Let's keep it but maybe Description helps user decide.
                
                all_results.append({
                    "sensor_id": s_name,
                    "part_code": best['info']['code'],
                    "description": best['info']['desc'],
                    "key": best['key'],
                    "page": i + 1,
                    "score": best['score']
                })
            else:
                # Found sensor but no key
                 all_results.append({
                    "sensor_id": s_name,
                    "part_code": "UNKNOWN",
                    "description": "-",
                    "key": "-",
                    "page": i + 1,
                    "score": -1
                })

# Deduplication Logic
# Group by SensorID
grouped = {}
for r in all_results:
    sid = r['sensor_id']
    if sid not in grouped: grouped[sid] = []
    grouped[sid].append(r)

final_rows = []
for sid, rows in grouped.items():
    # Prioritize:
    # 1. Score > 0 (Sensor keyword found)
    # 2. Known Code (not UNKNOWN)
    
    # Sort rows by score desc, then by UNKNOWN check
    rows.sort(key=lambda x: (-x['score'], x['part_code'] == "UNKNOWN"))
    
    # Check if we have multiple VALID matches on different pages (e.g. PS9 on p235 and p245?)
    # If they refer to same part code, just pick one? 
    # Or list all? 
    # User complained about PS10 on p234 (wrong) vs p245 (right).
    # Likely p234 result was junk/ambiguous, p245 is "lampante" (score 1000).
    # So sorting by score should fix PS10.
    
    best = rows[0]
    final_rows.append(best)

# Sort by Number
final_rows.sort(key=lambda x: int(re.search(r'\d+', x['sensor_id']).group()) if re.search(r'\d+', x['sensor_id']) else 999)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page"])
    writer.writeheader()
    writer.writerows(final_rows)

print(f"Done. Saved {len(final_rows)} sensors to {output_csv}")
