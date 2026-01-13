import pdfplumber
import csv
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\C7100pmMod.pdf"
input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Ready.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Paged.csv"

def get_manual_page(page_obj):
    # Crop Top Right: Right 20%, Top 10%
    width = page_obj.width
    height = page_obj.height
    bbox = (width * 0.8, 0, width, height * 0.1)
    
    try:
        cropped = page_obj.crop(bbox)
        text = cropped.extract_text()
        if text:
            # Look for "P {number}" or just numbers
            # Observed: "P 122", "P 99"
            m = re.search(r'P\s*(\d+)', text)
            if m:
                return m.group(1)
            # Fallback: maybe just digits?
            digits = re.findall(r'\d+', text)
            if digits:
                return digits[-1] # formatting often "Date ... PageNum"
    except Exception as e:
        pass
    return None

print("Replacing page numbers...")

rows = []
with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Optimize: Group by absolute page to avoid reopening/reprocessing same page multiple times
page_map = {}
unique_pages = set(row['page'] for row in rows)

with pdfplumber.open(pdf_path) as pdf:
    for str_p in unique_pages:
        try:
            abs_p = int(str_p)
            pdf_idx = abs_p - 1 # 1-based to 0-based
            
            p_obj = pdf.pages[pdf_idx]
            manual_num = get_manual_page(p_obj)
            
            if manual_num:
                page_map[str_p] = manual_num
                print(f"Mapped Abs {str_p} -> Manual {manual_num}")
            else:
                page_map[str_p] = f"Abs({str_p})" # Fallback
                print(f"Mapped Abs {str_p} -> Failed (kept absolute)")
        except Exception as e:
            print(f"Error mapping {str_p}: {e}")
            page_map[str_p] = str_p

# Update rows
for row in rows:
    old_p = row['page']
    if old_p in page_map:
        row['page'] = page_map[old_p]

# Write Output
with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["sensor_id", "part_code", "description", "key", "page"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Done. Saved to {output_csv}")
