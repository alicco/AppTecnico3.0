import csv

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C12000_Final.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C12000_Ready.csv"

rows = []
with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        new_row = {
            "sensor_id": row['sensor_id'],
            "part_code": row['part_code'],
            "description": row['description'],
            "key": row['key'],
            "page": row['page']
        }
        rows.append(new_row)

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    fieldnames = ["sensor_id", "part_code", "description", "key", "page"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"Cleanup complete. Saved to {output_csv}")
