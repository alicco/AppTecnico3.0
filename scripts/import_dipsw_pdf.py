import pdfplumber
import re
import json
import requests
import sys
import argparse

# --- Parsing Logic (Adapted from parse_dipsw.py) ---

def clean_text(text):
    if not text: return None
    return text.strip()

def parse_settings(text):
    if not text: return (None, None)
    text = text.replace('\n', ' ')
    
    match0 = re.search(r'(?:^|•)\s*0:\s*(.*?)(?:•|$)', text)
    match1 = re.search(r'(?:^|•)\s*1:\s*(.*?)(?:•|$)', text)
    
    setting0 = None
    setting1 = None

    if match0: setting0 = clean_text(match0.group(1))
    if match1: setting1 = clean_text(match1.group(1))
    
    if not setting0 and not setting1:
        return clean_text(text), None
        
    return setting0, setting1

def process_pdf(pdf_path, model_name):
    json_rows = []
    
    print(f"Extracting from {pdf_path} for model {model_name}...")
    
    with pdfplumber.open(pdf_path) as pdf:
        current_sw = None
        
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            
            for table in tables:
                for row in table:
                    # Filter empty or short rows
                    if not row or len(row) < 4: continue
                    
                    # Skip headers
                    r0 = str(row[0]) if row[0] else ""
                    r1 = str(row[1]) if row[1] else ""
                    
                    if "Bit" in r1: continue
                    if "[1]" in r0 or "[5]" in r0: continue
                    
                    # Parse SW Number
                    if r0:
                        sw_clean = re.sub(r'\D', '', r0)
                        if sw_clean:
                            current_sw = int(sw_clean)
                    
                    if current_sw is None: continue
                    
                    # Parse Bit
                    if not r1 or not re.match(r'^\d+$', r1): continue
                    bit_num = int(r1)
                    
                    # Parse Function
                    func_name = clean_text(row[2]) if len(row) > 2 else None
                    if not func_name or func_name == "Function": continue
                    
                    # Parse Settings
                    settings_raw = str(row[3]) if len(row) > 3 and row[3] else ""
                    set0, set1 = parse_settings(settings_raw)
                    
                    # Setup row object
                    val_def = None
                    # Columns vary, default usually 6 or 4 depending on table
                    # Heuristic: verify which col looks like default
                    # In parse_dipsw.py: index 6 or 4
                    if len(row) >= 7 and row[6]:
                        val_def = clean_text(row[6])
                    elif len(row) >= 5 and row[4]:
                         val_def = clean_text(row[4])

                    row_obj = {
                        "model_name": model_name,
                        "switch_number": current_sw,
                        "bit_number": bit_num,
                        "function_name": func_name,
                        "setting_0": set0,
                        "setting_1": set1,
                        "default_val": val_def
                    }
                    json_rows.append(row_obj)
                    
                    # Multi-bit expansion
                    if settings_raw:
                        # e.g. "1-7=" inside settings
                        range_matches = re.findall(rf'{current_sw}-(\d+)=', settings_raw)
                        if range_matches:
                            max_ref = max(int(m) for m in range_matches)
                            if max_ref > bit_num:
                                for b in range(bit_num + 1, max_ref + 1):
                                    ref_text = f"See SW {current_sw}-{bit_num}"
                                    ex_obj = {
                                        "model_name": model_name,
                                        "switch_number": current_sw,
                                        "bit_number": b,
                                        "function_name": ref_text,
                                        "setting_0": ref_text,
                                        "setting_1": None,
                                        "default_val": val_def
                                    }
                                    json_rows.append(ex_obj)
    
    # --- MANUAL PATCHES ---
    # Inject known missing switches that PDF extraction missed
    
    # Patch for C7100/C7090 SW 3-0
    if "C7100" in model_name or "C7090" in model_name:
        # Check if 3-0 exists and remove it to ensure we use our full-text version
        json_rows = [r for r in json_rows if not (r['switch_number'] == 3 and r['bit_number'] == 0)]
        
        print("Injecting/Overwriting DipSW 3-0 for C7100/C7090")
        json_rows.append({
            "model_name": model_name,
            "switch_number": 3,
            "bit_number": 0,
            "function_name": "PF Air-blow adjustment\n\nSpecify the setting to '1' so that it enables the air blow adjustment without feeding sheets when a jam occurs due to the paper feed from PF.\n\n<When confirming how much the paper is floated and performing the air-blow adjustment in the halt condition after a jam>\n• Procedure\nOn the Machine screen, select [Adjustment] - [PFU Air Assist Adjustment] to select the tray that needs the adjustment. Select [Manual]. By pressing [Start] on the displayed screen, the air starts blowing. Then, change each setting as needed. Press [Stop] or [Close] when the air level is proper.\n• Adjustable items\n   • Lead Edge Air Level Setting (Following the setting changes, the air level changes)\n   • Side Air Level Setting (Following the configuration changes, the air level changes)\n\n<When performing the air-blow adjustment without canceling the job after clearing the jam>\n• Procedure\nAfter you clear the jam, press 'Paper Setting' on the screen where 'Press [Start] to restart' is shown. Select the tray that needs the adjustment and select [Change Setting] - [Air-blow]. Change each setting as needed and press [OK].\n\nNote\n• Blow-out of the air cannot be checked.\n• Adjustable items\n   • Lead Edge Air Level Setting\n   • Side Air Level Setting",
            "setting_0": "Not display the air-blow adjustment button",
            "setting_1": "Display the air-blow adjustment button",
            "default_val": "0"
        })

    # Patch for C6100/C6080 SW 1-5, 1-6, 1-7
    if "C6100" in model_name or "C6080" in model_name:
        # Remove existing partial entries if any
        json_rows = [r for r in json_rows if not (r['switch_number'] == 1 and r['bit_number'] in [5, 6, 7])]
        
        print(f"Injecting DipSW 1-5, 1-6, 1-7 for {model_name}")
        
        full_desc = (
            "Number of the allowed print quantity after the machine reaches the maintenance count\n\n"
            "Combination Table (Bit 1-7 | 1-6 | 1-5):\n"
            "0 | 0 | 0  : 1,000 Prints\n"
            "0 | 0 | 1  : 2,000 Prints\n"
            "0 | 1 | 0  : 3,000 Prints\n"
            "0 | 1 | 1  : 4,000 Prints\n"
            "1 | 0 | 0  : 5,000 Prints\n"
            "1 | 0 | 1  : 1,000 Prints\n"
            "Note: See service manual for defaults."
        )
        
        for bit in [5, 6, 7]:
            json_rows.append({
                "model_name": model_name,
                "switch_number": 1,
                "bit_number": bit,
                "function_name": full_desc,
                "setting_0": "See Combination Table in Function Description",
                "setting_1": "See Combination Table in Function Description",
                "default_val": "0"
            })

    return json_rows

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", help="Path to PDF")
    parser.add_argument("models", help="Comma separated model names")
    args = parser.parse_args()
    
    models = [m.strip() for m in args.models.split(',')]
    
    for model in models:
        rows = process_pdf(args.pdf, model)
        print(f"Parsed {len(rows)} switches for {model}")
        
        if not rows:
            print("No rows found! check parsing usage.")
            continue

        # Upload
        url = "http://localhost:8080/api/import-dipsw"
        try:
            r = requests.post(url, json=rows)
            if r.status_code == 200:
                print(f"SUCCESS: Uploaded for {model}")
            else:
                print(f"FAILED: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"ERROR connecting to API: {e}")

if __name__ == "__main__":
    main()
