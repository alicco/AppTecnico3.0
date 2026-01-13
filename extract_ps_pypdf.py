import pypdf
import re
import csv
import sys

# Increase CSV field limit just in case
csv.field_size_limit(sys.maxsize)

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100.csv"

print(f"Extracting PS sensors from {pdf_path}...")

# Patterns
# PS followed by digits (e.g., PS1, PS10)
ps_pattern = re.compile(r'\b(PS\d+)\b')
# Part code: typically A followed by 0-9A-Z, length 8-12, e.g. A00J123400
# Adapting from MotoriC4080: A50UR72600 (10 chars), A85CR70R33 (10 chars), AC57M10300 (10 chars), 466076020 (9 digits)
# So alphanumeric, 8-12 chars.
code_pattern = re.compile(r'\b([A-Z0-9]{8,12})\b')

extracted_data = []

try:
    reader = pypdf.PdfReader(pdf_path)
    num_pages = len(reader.pages)
    print(f"Total pages: {num_pages}")

    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text()
            if not text:
                continue
            
            lines = text.split('\n')
            for line in lines:
                # Look for PS marker
                ps_match = ps_pattern.search(line)
                if ps_match:
                    sensor_id = ps_match.group(1)
                    
                    # Look for Code in the SAME line
                    # We iterate matches to find the one that looks like a part code
                    # (Code usually distinct from PS id and random short numbers)
                    code_match = code_pattern.search(line)
                    part_code = "UNKNOWN"
                    
                    # Ensure code is not the PS id itself (unlikely due to patterns) and not just a page number
                    # We find all matches and pick the best candidate
                    candidates = code_pattern.findall(line)
                    
                    valid_candidates = [c for c in candidates if c != sensor_id and not c.isdigit()] # Pure digits might be existing codes, but often mixed. Motori example: 466076020. So pure digits valid if length > 8.
                    
                    # Refine candidate logic: pure digits > 8 chars OR alphanumeric > 8 chars
                    final_candidates = []
                    for c in candidates:
                        if c == sensor_id: continue
                        if re.match(r'^\d{1,4}$', c): continue # Skip page numbers or item numbers
                        final_candidates.append(c)
                    
                    if final_candidates:
                        part_code = final_candidates[0] # Pick first valid looking code
                    
                    # Save context
                    extracted_data.append({
                        "sensor_id": sensor_id,
                        "part_code": part_code,
                        "page": i + 1,
                        "raw_line": line.strip()
                    })

        except Exception as e:
            print(f"Error reading page {i+1}: {e}")

    # Write to CSV
    # Headers: sensor_id, part_code, page, raw_line
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "page", "raw_line"])
        writer.writeheader()
        writer.writerows(extracted_data)

    print(f"Extraction complete. Found {len(extracted_data)} items. Saved to {output_csv}")

except Exception as e:
    print(f"Fatal error: {e}")
