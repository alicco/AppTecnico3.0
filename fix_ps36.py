import csv

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Paged.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Ultimate.csv"

# Correction Data for PS36
# From debug: Key 11, Part 9335140071, Desc "Solid State Switch"
CORRECT_PS36 = {
    "part_code": "9335140071",
    "description": "Solid State Switch",
    "key": "11"
}

print("Applying manual fix for PS36...")

rows = []
with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        if row['sensor_id'] == "PS36":
            # Apply fix
            row['part_code'] = CORRECT_PS36['part_code']
            row['description'] = CORRECT_PS36['description']
            row['key'] = CORRECT_PS36['key']
            print(f"Fixed PS36: {row}")
        
        # Ensure description is clean (user asked to remove codes like 'I 1 K')
        # My previous 'final_cleanup.py' did this for 'Ready.csv', but 'Final_Paged' was built from 'Ready'.
        # So descriptions should be clean.
        # Let's double check.
        # "Solid State Switch" -> Clean.
        # "Photo Sensor" -> Clean.
        
        rows.append(row)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Saved corrected data to {output_csv}")
