import csv
import re

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Clean.csv"

def normalize_id(sid):
    return re.sub(r'[\(\)\[\]]', '', sid).strip()

data = {}

with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        nid = normalize_id(row['sensor_id'])
        if nid not in data:
            data[nid] = []
        data[nid].append(row)

final_rows = []

for nid, rows in data.items():
    # 1. Filter out UNKNOWNs if we have valid codes
    valid_rows = [r for r in rows if r['part_code'] != "UNKNOWN"]
    
    if valid_rows:
        # We have checks, keep them. 
        # But we might still have duplicates on different pages?
        # User might want to know all pages.
        # But often it's same part.
        # Let's deduplicate by (PartCode, Page).
        seen = set()
        unique_valid = []
        for r in valid_rows:
            key = (r['part_code'], r['page'])
            if key not in seen:
                seen.add(key)
                r['sensor_id'] = nid # Use clean ID
                unique_valid.append(r)
        final_rows.extend(unique_valid)
    else:
        # Only UNKNOWNs. Keep one (or all distinct pages?)
        # Let's keep one per page to show where it was found.
        seen_pages = set()
        for r in rows:
            if r['page'] not in seen_pages:
                seen_pages.add(r['page'])
                r['sensor_id'] = nid
                final_rows.extend([r])

# Sort by Sensor ID numeric part
def sort_key(row):
    try:
        # Extract number from PS12 -> 12
        num = int(re.search(r'\d+', row['sensor_id']).group())
        return num
    except:
        return 9999

final_rows.sort(key=sort_key)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    fieldnames = ["sensor_id", "part_code", "description", "key", "page"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(final_rows)

print(f"Cleaned and Deduplicated. Saved {len(final_rows)} rows to {output_csv}")
