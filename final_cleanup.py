import csv
import re

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Strict.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Ready.csv"

print("Performing final cleanup...")

# Regex to remove trailing codes: space + [one uppercase letter] + space + [digit] + ...
# e.g. "  C 1", "  I 3 h-V..."
cleanup_pattern = re.compile(r'\s+[A-Z]\s+\d+.*$')

# Also sometimes there might be specialized cases, let's look at the file.
# "Sensor Pedestal /Color   D 1" -> "D 1" matches.
# "Solid State Switch  B 1 b-..." -> "B 1 ..." matches.

rows = []
with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        desc = row['description']
        # Clean description
        new_desc = cleanup_pattern.sub('', desc).strip()
        
        # Build new row dict (excluding score)
        new_row = {
            "sensor_id": row['sensor_id'],
            "part_code": row['part_code'],
            "description": new_desc,
            "key": row['key'],
            "page": row['page']
        }
        rows.append(new_row)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    # Define new header without score
    fieldnames = ["sensor_id", "part_code", "description", "key", "page"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Cleanup complete. Saved {len(rows)} rows to {output_csv}")
