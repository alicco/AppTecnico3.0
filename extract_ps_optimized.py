import pypdf
import re
import csv
import sys
import time

csv.field_size_limit(sys.maxsize)

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100.csv"

ps_pattern = re.compile(r'\b(PS\d+)\b')
code_pattern = re.compile(r'\b([A-Z0-9]{8,12})\b')

print(f"Starting optimized extraction from {pdf_path}...")

try:
    reader = pypdf.PdfReader(pdf_path)
    num_pages = len(reader.pages)
    print(f"Total pages: {num_pages}")

    # Create CSV with header
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "page", "raw_line"])
        writer.writeheader()

    count = 0
    for i, page in enumerate(reader.pages):
        if i % 20 == 0:
            print(f"Processing page {i+1}/{num_pages}...")
            sys.stdout.flush()
        
        try:
            text = page.extract_text()
            if not text:
                continue
            
            lines = text.split('\n')
            rows = []
            for line in lines:
                ps_match = ps_pattern.search(line)
                if ps_match:
                    sensor_id = ps_match.group(1)
                    
                    matches = code_pattern.findall(line)
                    part_code = "UNKNOWN"
                    valid_candidates = []
                    for c in matches:
                         if c != sensor_id and not re.match(r'^\d{1,4}$', c):
                             valid_candidates.append(c)
                    
                    if valid_candidates:
                        part_code = valid_candidates[0]
                    
                    rows.append({
                        "sensor_id": sensor_id,
                        "part_code": part_code,
                        "page": i + 1,
                        "raw_line": line.strip()
                    })
            
            if rows:
                with open(output_csv, "a", newline="", encoding="utf-8") as f:
                    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "page", "raw_line"])
                    writer.writerows(rows)
                count += len(rows)

        except Exception as e:
            print(f"Error on page {i+1}: {e}")

    print(f"Done. Found {count} items.")

except Exception as e:
    print(f"Fatal error: {e}")
