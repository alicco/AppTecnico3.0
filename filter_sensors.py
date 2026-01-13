import csv

input_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Refined.csv"
output_csv = r"c:\Users\forza\Gemini\AppTecnico3.0\Sensori_C7100_Final_Strict.csv"

print("Filtering non-sensor matches...")
count = 0
dropped = 0

with open(input_csv, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

valid_rows = []
for row in rows:
    try:
        score = int(row['score'])
        if score >= 1000:
            valid_rows.append(row)
            count += 1
        else:
            dropped += 1
            # print(f"Dropping {row['sensor_id']} - {row['description']}")
    except:
        pass

with open(output_csv, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(valid_rows)

print(f"Saved {count} valid sensors. Dropped {dropped} non-sensor matches.")
