import re
import csv
import os

# --- Configuration ---
DUMP_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\sections_dump.txt"

FILES_TO_PROCESS = [
    {
        "model": "C7100",
        "csv_path": r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\Sensori_C7100_Ultimate.csv",
        "start_marker": "=== C7100 PAGE 2 & 3 ===",
        "end_marker": "=== C12000 PAGE 2 & 3 ==="
    },
    {
        "model": "C12000",
        "csv_path": r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C12000_Ready.csv",
        "start_marker": "=== C12000 PAGE 2 & 3 ===",
        "end_marker": None # End of file
    }
]

def clean_jp(text):
    # Remove Japanese characters
    text = re.sub(r'[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]', '', text)
    return text.strip()

def parse_dump(dump_path):
    with open(dump_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    maps = {} # model -> { page_str: section_name }

    for config in FILES_TO_PROCESS:
        model = config["model"]
        start = config["start_marker"]
        end = config["end_marker"]
        
        s_idx = content.find(start)
        if s_idx == -1:
            print(f"Warning: Marker {start} not found.")
            continue
            
        if end:
            e_idx = content.find(end)
            block = content[s_idx:e_idx]
        else:
            block = content[s_idx:]
            
        # Parse Block
        # Logic: 
        # Look for line starting with "(\d+)  (EnglishName) (Japanese) P..."
        # Or just "(\d+) (EnglishName)..."
        # Then capture "P(\d+)" tokens in that line and subsequent lines until next numbered line.
        
        section_map = {}
        current_section = "Unknown"
        lines = block.split('\n')
        
        current_pages = []
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            # Check for new section header: "1 External Parts..."
            # Regex: Start with Number + Space + Text
            match_header = re.match(r'^(\d+)\s+([A-Z][a-zA-Z\s\(\)\/]+)', line)
            
            if match_header:
                # Extract Name
                raw_name = match_header.group(2).strip()
                # If name ends with "Section", keep it. 
                # Sometimes it hits Japanese? "External Parts Section 外装部"
                # My clean_jp function helps but regex `[A-Z]...` might catch specific english only?
                # "External Parts Section" matches. "External Parts" also.
                # Just take the matched group 2.
                
                current_section = raw_name
                # Remove "Section" word if redundant? User output example "Duplex Section" kept it. I will keep it.
                
                # Check for pages on SAME line
                pages = re.findall(r'P\s*(\d+)', line)
                if pages:
                    for p in pages: section_map[p] = current_section
            
            else:
                # Continuation line? Check for P numbers
                pages = re.findall(r'P\s*(\d+)', line)
                if pages and current_section != "Unknown":
                    for p in pages: section_map[p] = current_section

        maps[model] = section_map
        print(f"[{model}] Mapped {len(section_map)} pages to sections.")
        
    return maps

def update_csvs(maps):
    for config in FILES_TO_PROCESS:
        model = config["model"]
        csv_path = config["csv_path"]
        
        if not os.path.exists(csv_path):
            print(f"Skipping {model}: {csv_path} not found.")
            continue
            
        print(f"Updating {model} ({csv_path})...")
        
        temp_rows = []
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            # Existing columns: sensor_id, part_code, description, key, page
            # Desired columns: model, sensor_id, part_code, description, section, key, page
            
            for row in reader:
                page_raw = row['page']
                # Determine section
                # Try exact match first
                s_name = maps[model].get(page_raw, "Unknown")
                
                new_row = {
                    "model": model,
                    "sensor_id": row['sensor_id'],
                    "part_code": row['part_code'],
                    "description": row['description'],
                    "section": s_name,
                    "key": row['key'],
                    "page": row['page']
                }
                temp_rows.append(new_row)
        
        # Write back
        fieldnames = ["model", "sensor_id", "part_code", "description", "section", "key", "page"]
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(temp_rows)
            
        print(f"Updated {len(temp_rows)} rows for {model}.")

if __name__ == "__main__":
    maps = parse_dump(DUMP_FILE)
    update_csvs(maps)
