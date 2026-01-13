import pdfplumber
import re
import math
import csv
import sys

# Force UTF-8 for any print output
sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Clean.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final.csv"

# Keywords to identify a "Sensor" key in the description
SENSOR_KEYWORDS = ["SENSOR", "SWITCH", "PHOTO", "DETECT"]
# Keywords to EXCLUDE (optional, based on user input about Actuators, but user said "Photo Sensor" vs "Actuator")
# If "Actuator" is close, we prefer "Sensor".
# We will score candidates.

print(f"Starting Final Extraction...")

def distance(bbox1, bbox2):
    # bbox: (x0, top, x1, bottom)
    c1x = (bbox1[0] + bbox1[2]) / 2
    c1y = (bbox1[1] + bbox1[3]) / 2
    c2x = (bbox2[0] + bbox2[2]) / 2
    c2y = (bbox2[1] + bbox2[3]) / 2
    return math.hypot(c2x - c1x, c2y - c1y)

def parse_parts_list(page_obj):
    """
    Extracts a map of {Key: {Code, Description, FullLine}} from a parts list page.
    Heuristic: Lines starting with a small number (Key), then Part Code, then Desc.
    """
    text = page_obj.extract_text()
    if not text:
        return {}
    
    parts_map = {}
    lines = text.split('\n')
    
    # Regex for a table row:
    # ^(\d{1,3})\s+([A-Z0-9]{8,12})\s+(.+)$
    # Note: Sometimes there is no code or weird formatting.
    # User example: "3 9335140071 Solid State Switch ..."
    
    line_pattern = re.compile(r'^(\d{1,3})\s+([A-Z0-9\-\.]{5,15})\s+(.+)$')
    
    for line in lines:
        line = line.strip()
        m = line_pattern.match(line)
        if m:
            key = m.group(1)
            code = m.group(2)
            desc = m.group(3)
            parts_map[key] = {
                "code": code,
                "desc": desc,
                "raw": line
            }
    return parts_map

# Load target pages from CSV
target_pages = set()
with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            p = int(row['page'])
            target_pages.add(p)
        except:
            pass

sorted_pages = sorted(list(target_pages))
print(f"Processing {len(sorted_pages)} unique pages: {sorted_pages}")

final_results = []

with pdfplumber.open(pdf_path) as pdf:
    for page_num in sorted_pages:
        # PDF Index
        diagram_idx = page_num - 1
        list_idx = page_num # "Pagina dopo"
        
        if list_idx >= len(pdf.pages):
            print(f"Warning: List page {list_idx} out of range (Diagram Page {page_num})")
            continue
            
        print(f"Processing PDF Page {page_num} (Diagram) + {page_num+1} (List)...")
        
        try:
            p_diagram = pdf.pages[diagram_idx]
            p_list = pdf.pages[list_idx]
            
            # 1. Parse List
            parts_db = parse_parts_list(p_list)
            
            # 2. Analyze Diagram
            words = p_diagram.extract_words()
            
            # Find all PS sensors and Numbers
            ps_items = [w for w in words if "PS" in w['text']]
            numbers = [w for w in words if w['text'].isdigit() and len(w['text']) <= 3]
            
            for ps in ps_items:
                sensor_name = ps['text']
                # Clean sensor name (remove parens if any, though "PS" check handles)
                # Ensure it really is PS\d+
                if not re.search(r'PS\d+', sensor_name):
                    continue
                
                # Find nearby keys
                candidates = []
                ps_box = (ps['x0'], ps['top'], ps['x1'], ps['bottom'])
                
                for num in numbers:
                    key_val = num['text']
                    num_box = (num['x0'], num['top'], num['x1'], num['bottom'])
                    dist = distance(ps_box, num_box)
                    
                    if dist < 200: # Search radius
                        # Check if this key exists in DB
                        if key_val in parts_db:
                            part_info = parts_db[key_val]
                            desc_upper = part_info['desc'].upper()
                            
                            # Scoring:
                            # 0: Base
                            # +100: "SENSOR", "SWITCH", "PHOTO"
                            # -50: "ACTUATOR" (unless it also has sensor keywords?)
                            # Prefer closer distance
                            
                            score = 0
                            is_sensor = any(k in desc_upper for k in SENSOR_KEYWORDS)
                            
                            if is_sensor:
                                score += 1000
                            
                            candidates.append({
                                "key": key_val,
                                "dist": dist,
                                "score": score,
                                "info": part_info
                            })
                
                # Select best candidate
                # Sort by Score DESC, then Dist ASC
                if candidates:
                    candidates.sort(key=lambda x: (-x['score'], x['dist']))
                    best = candidates[0]
                    
                    # Only accept if it looks like a sensor or is very close?
                    # User logic: "find the matches similar to sensor".
                    # If best score is high (contains sensor keyword), take it.
                    # If best score is low (no sensor keyword), maybe take it if very close?
                    # Let's enforce the keyword match if possible.
                    
                    final_part_code = "UNKNOWN"
                    final_desc = "UNKNOWN"
                    final_key = "-"
                    
                    if best['score'] >= 1000:
                        final_part_code = best['info']['code']
                        final_desc = best['info']['desc']
                        final_key = best['key']
                    else:
                        # Fallback: if very close (<50) and no other sensors around?
                        # User was specific about description matching.
                        # Let's mark as "AMBIGUOUS" or leave UNKNOWN if no sensor keyword found.
                        # But maybe "Photo Interrupter"? "Photo" is in keywords.
                        final_desc = f"[NO_MATCHing_DESC] Nearest Key {best['key']}: {best['info']['desc']}"
                    
                    final_results.append({
                        "sensor_id": sensor_name,
                        "part_code": final_part_code,
                        "description": final_desc,
                        "key": final_key,
                        "page": page_num
                    })
                else:
                     final_results.append({
                        "sensor_id": sensor_name,
                        "part_code": "UNKNOWN",
                        "description": "No Key Found nearby",
                        "key": "-",
                        "page": page_num
                    })

        except Exception as e:
            print(f"Error on page {page_num}: {e}")

# Write Final CSV
with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page"])
    writer.writeheader()
    writer.writerows(final_results)

print(f"Completed. Saved {len(final_results)} rows to {output_csv}")
