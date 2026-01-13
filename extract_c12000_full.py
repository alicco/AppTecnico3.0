import pypdf
import pdfplumber
import re
import math
import csv
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C12000pmMod.pdf"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C12000_Final.csv"

SENSOR_KEYWORDS = ["SENSOR", "SWITCH", "PHOTO", "DETECT"]

def distance(bbox1, bbox2):
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

def clean_desc(text):
    # Remove Japanese
    text = re.sub(r'[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]', '', text)
    # Remove trailing codes (e.g. "I 1 K...", "10 ", etc if at end)
    # Pattern: space + uppercase + space + digit...
    text = re.sub(r'\s+[A-Z]\s+\d+.*$', '', text)
    return text.strip()

def get_manual_page(page_obj):
    width = page_obj.width
    height = page_obj.height
    bbox = (width * 0.8, 0, width, height * 0.1)
    try:
        cropped = page_obj.crop(bbox)
        text = cropped.extract_text()
        if text:
            m = re.search(r'P\s*(\d+)', text)
            if m: return m.group(1)
            # Fallback for just digits
            digits = re.findall(r'\d+', text)
            if digits: return digits[-1]
    except: pass
    return None

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

print("Phase 1: Identifying Pages (pypdf)...")
target_pages = [] # List of (DiagramIndex, ManualPageStr)
try:
    reader = pypdf.PdfReader(pdf_path)
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text()
            if text and re.search(r'\bPS\d+\b', text):
                target_pages.append(i)
        except: pass
except Exception as e:
    print(f"pypdf error: {e}")

print(f"Found {len(target_pages)} candidate diagram pages.")

print("Phase 2: Extracting Sensors (pdfplumber)...")
all_results = []
list_cache = {}

with pdfplumber.open(pdf_path) as pdf:
    for i, p_idx in enumerate(target_pages):
        if i % 10 == 0: print(f"Processing {i+1}/{len(target_pages)} (Page {p_idx+1})...")
        
        if p_idx >= len(pdf.pages): continue
        p_diagram = pdf.pages[p_idx]
        
        # Determine Manual Page NOW
        manual_page = get_manual_page(p_diagram) or f"Abs({p_idx+1})"
        
        # List Page (Next)
        l_idx = p_idx + 1
        if l_idx >= len(pdf.pages): continue
        
        if l_idx not in list_cache:
            list_cache[l_idx] = parse_parts_list(pdf.pages[l_idx])
        parts_db = list_cache[l_idx]
        
        words = p_diagram.extract_words()
        ps_items = [w for w in words if "PS" in w['text']]
        numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
        
        for ps in ps_items:
            # Similarity to C7100: Ignore (PS...)
            if "(" in ps['text'] or ")" in ps['text']: continue
            
            s_name = ps['text'].strip()
            if not re.match(r'^PS\d+$', s_name): continue
            
            ps_box = (ps['x0'], ps['top'], ps['x1'], ps['bottom'])
            
            candidates = []
            for num in numbers:
                 key_val = num['text']
                 if key_val in parts_db:
                     d = distance(ps_box, (num['x0'], num['top'], num['x1'], num['bottom']))
                     if d < 300: # Increased radius slightly just in case
                         info = parts_db[key_val]
                         upper_d = info['desc'].upper()
                         score = 0
                         if any(k in upper_d for k in SENSOR_KEYWORDS): score = 1000
                         candidates.append({'key': key_val, 'dist': d, 'score': score, 'info': info})
            
            if candidates:
                candidates.sort(key=lambda x: (-x['score'], x['dist']))
                best = candidates[0]
                
                # Strict Filter: Only keep Score 1000?
                # C7100 Final Logic: Yes, we dropped everything else.
                # Let's keep strict here too.
                if best['score'] >= 1000:
                    all_results.append({
                        "sensor_id": s_name,
                        "part_code": best['info']['code'],
                        "description": best['info']['desc'],
                        "key": best['key'],
                        "page": manual_page,
                        "score": best['score']
                    })
            # Else ignored (no sensor nearby)

# Deduplication
print("Deduplicating...")
grouped = {}
for r in all_results:
    # Use SensorID + Page as unique? 
    # Or Global Sensor ID?
    # C7100 was Global.
    # But C12000 might have PS1 in Section A and PS1 in Section B?
    # Usually Konica ID 'PS1' is unique globally.
    # But duplicate listings exist.
    sid = r['sensor_id']
    if sid not in grouped: grouped[sid] = []
    grouped[sid].append(r)

final_rows = []
for sid, rows in grouped.items():
    # Pick best (highest score, valid match)
    # Since we only added score 1000, all are good.
    # Pick the one with valid code (all should have parts_db match).
    # If multiple valid, pick first? Or look at page?
    # Let's sort by page number (manual) if possible?
    # Hard to sort strings "P 50".
    # Just take first.
    final_rows.append(rows[0])

# Sort by Number
final_rows.sort(key=lambda x: int(re.search(r'\d+', x['sensor_id']).group()) if re.search(r'\d+', x['sensor_id']) else 999)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page", "score"])
    writer.writeheader()
    writer.writerows(final_rows)

print(f"Done. Saved {len(final_rows)} sensors to {output_csv}")
