import json
import re

input_file = "dipsw_data.json"
output_sql = "init_dipswitches.sql"

def clean_text(text):
    if not text: return None
    return text.replace("'", "''").strip() # Escape SQL quotes

def parse_settings(text):
    if not text: return (None, None)
    
    # Normalize
    text = text.replace('\n', ' ')
    
    match0 = re.search(r'(?:^|•)\s*0:\s*(.*?)(?:•|$)', text)
    match1 = re.search(r'(?:^|•)\s*1:\s*(.*?)(?:•|$)', text)
    
    setting0 = None
    setting1 = None

    if match0: setting0 = clean_text(match0.group(1))
    if match1: setting1 = clean_text(match1.group(1))
    
    # If standard parsing failed to find BOTH boolean states, 
    # and the text is long/complex, just return the whole blob as setting_0
    if not setting0 and not setting1:
        return clean_text(text), None
        
    return setting0, setting1

try:
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    sql_statements = []
    sql_statements.append("CREATE TABLE IF NOT EXISTS dip_switches (")
    sql_statements.append("    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),")
    sql_statements.append("    model_name TEXT NOT NULL,")
    sql_statements.append("    switch_number INTEGER NOT NULL,")
    sql_statements.append("    bit_number INTEGER NOT NULL,")
    sql_statements.append("    function_name TEXT,")
    sql_statements.append("    setting_0 TEXT,")
    sql_statements.append("    setting_1 TEXT,")
    sql_statements.append("    default_val TEXT,")
    sql_statements.append("    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
    sql_statements.append(");")
    sql_statements.append("")

    json_rows = []
    current_sw = None
    
    for page in data:
        # print(f"Processing Page {page['page']}")
        if not page['tables']: continue
        
        for table in page['tables']:
            for row in table:
                # Row structure usually: [SW, Bit, Func, Set, Def1, Def2, Def3]
                # length 7 usually
                if len(row) < 4: continue
                
                # Check if header
                if row[1] == "Bit" or row[1] == "Bit number (0 to 7)": continue
                if row[0] == "[1]" or row[0] == "[5]": continue # Header junk
                
                # Parse SW
                sw_raw = row[0]
                if sw_raw:
                    # Clean "1" or "[1]"
                    sw_clean = re.sub(r'\D', '', str(sw_raw))
                    if sw_clean:
                        current_sw = int(sw_clean)
                
                if current_sw is None: continue
                
                # Parse Bit
                bit_raw = row[1]
                if not bit_raw or not re.match(r'^\d+$', str(bit_raw)): continue
                bit_num = int(bit_raw)
                
                # Parse Function
                func_name = clean_text(row[2])
                
                if current_sw == 250 and bit_num == 0:
                    print(f"DEBUG SW 250-0: Raw='{row}' Func='{func_name}'")

                # FILTER: Skip if function is empty or "Function" header
                # We allow "-" as it represents reserved/unused switches that users expect to see
                if not func_name or func_name == "Function":
                    if current_sw == 250: print("DEBUG SW 250 Skipped due to func filter")
                    continue
                
                # Parse Settings
                settings_raw = row[3]
                set0, set1 = parse_settings(settings_raw)
                
                # --- Multi-bit Logic Start ---
                extra_bits = []
                if settings_raw:
                    # Look for patterns like "1-7=" or "1-7:0" which imply this bit governs others
                    # Pattern matching "current_sw - other_bit ="
                    # e.g. "1-7=" where current_sw is 1
                    range_matches = re.findall(rf'{current_sw}-(\d+)=', settings_raw)
                    if range_matches:
                        max_ref = max(int(m) for m in range_matches)
                        if max_ref > bit_num:
                            # This bit covers up to max_ref
                            for b in range(bit_num + 1, max_ref + 1):
                                extra_bits.append(b)
                # --- Multi-bit Logic End ---

                val_def = None
                if len(row) >= 7 and row[6]:
                    val_def = clean_text(row[6])
                elif len(row) >= 5 and row[4]:
                     val_def = clean_text(row[4])
                
                # Common fields
                model = "Konica Minolta C4080" 
                
                # 1. Add CURRENT row
                val_func_sql = f"'{func_name}'" if func_name else "NULL"
                val_s0_sql = f"'{set0}'" if set0 else "NULL"
                val_s1_sql = f"'{set1}'" if set1 else "NULL"
                val_def_sql = f"'{val_def}'" if val_def else "NULL"
                
                sql = f"INSERT INTO dip_switches (model_name, switch_number, bit_number, function_name, setting_0, setting_1, default_val) VALUES ('{model}', {current_sw}, {bit_num}, {val_func_sql}, {val_s0_sql}, {val_s1_sql}, {val_def_sql});"
                sql_statements.append(sql)

                row_obj = {
                    "model_name": model,
                    "switch_number": current_sw,
                    "bit_number": bit_num,
                    "function_name": func_name,
                    "setting_0": set0,
                    "setting_1": set1,
                    "default_val": val_def
                }
                json_rows.append(row_obj)
                
                # 2. Add EXTRA rows (auto-filled)
                for b_extra in extra_bits:
                    ref_text = f"See SW {current_sw}-{bit_num} for combined settings"
                    
                    # For extra bits, we use a simple reference
                    ex_obj = {
                        "model_name": model,
                        "switch_number": current_sw,
                        "bit_number": b_extra,
                        "function_name": ref_text + f" ({func_name[:50]}...)" if func_name else ref_text,
                        "setting_0": ref_text,
                        "setting_1": None,
                        "default_val": val_def # Assume same default? Or unknown. Let's keep same.
                    }
                    json_rows.append(ex_obj)
                    
                    # Also append optional SQL
                    sql_ex = f"INSERT INTO dip_switches (model_name, switch_number, bit_number, function_name, setting_0, setting_1, default_val) VALUES ('{model}', {current_sw}, {b_extra}, '{ex_obj['function_name']}', '{ex_obj['setting_0']}', NULL, {val_def_sql});"
                    sql_statements.append(sql_ex)


    with open(output_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
        
    with open("dipsw_rows.json", "w", encoding="utf-8") as f:
        json.dump(json_rows, f, indent=2)

    print(f"Generated {len(sql_statements)} SQL statements in {output_sql}")
    print(f"Generated {len(json_rows)} JSON rows in dipsw_rows.json")

    with open(output_sql, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))
        
    print(f"Generated {len(sql_statements)} SQL statements in {output_sql}")

except Exception as e:
    print(f"Error: {e}")
