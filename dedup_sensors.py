import csv

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Clean.csv"

seen = set()
rows = []

with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Key: sensor_id. If we find a new one, keep it. 
        # Ideally we'd keep the one with a CODE, but we have none.
        # So just keep first occurrence or combine pages?
        # Let's keep first occurrence per page? 
        # Actually, let's just list unique sensors and valid pages.
        # Format: sensor_id, part_code, pages (list)
        
        sid = row['sensor_id']
        if sid not in seen:
            seen.add(sid)
            rows.append(row)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "page", "raw_line"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Cleaned CSV saved to {output_csv}. Total unique sensors: {len(rows)}")
