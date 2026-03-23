import pandas as pd
import re

INPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"
OUTPUT_FILE = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C5070pm_ready.csv"

# Page to Section Mapping (Derived from PDF)
# Format: (StartPage, EndPage, SectionName)
# ranges are inclusive
SECTION_MAPPING = [
    (1, 4, "External Parts"),
    (5, 13, "Frame Section"),
    (14, 16, "Operation Panel Section"),
    (17, 20, "Scanner Section"),
    (21, 21, "Write Section"),
    (22, 22, "Charging Section"),
    (23, 23, "Photo Conductor Section"),
    (24, 25, "Developing Section"),
    (26, 30, "Toner Supply Section"),
    (31, 34, "Toner Collection Section"),
    (35, 41, "Intermediate Transfer Section"),
    (42, 42, "Secondary Transfer Section"),
    (43, 43, "Color Resist Section"),
    (44, 54, "Fusing Section"),
    (55, 60, "Process Section"),
    (61, 67, "Paper Feed Section (Tray 1)"),
    (68, 74, "Paper Feed Section (Tray 2)"),
    (75, 75, "Paper Feed Driving Section"),
    (76, 76, "Tray Driving Section"),
    (77, 81, "Drum Driving Section"),
    (82, 84, "Vertical Conveyance Section"),
    (85, 108, "Duplex/Reverse Section"),
    (109, 109, "Paper Exit/Charge Control Section"),
    (110, 111, "Paper Exit Section"),
    (112, 114, "Charge Control Section"),
    (115, 119, "Rear Electrical Section"),
    (120, 999, "Wiring")
]

def get_section_for_page(page_str):
    try:
        # Extract number from string (e.g. "P1" -> 1, "1" -> 1)
        # Handle cases where page might be non-numeric if any (though inspection showed numbers)
        # The CSV has page column as "1", "2" etc based on previous inspection view.
        if pd.isna(page_str):
            return ""
        
        page_val = str(page_str).strip()
        # Extract first integer found (in case of weird formats)
        match = re.search(r'\d+', page_val)
        if not match:
            return ""
        
        page_num = int(match.group(0))
        
        for start, end, name in SECTION_MAPPING:
            if start <= page_num <= end:
                return name
        
        return "Unknown Section"
        
    except Exception:
        return ""

def assign_sections():
    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE, sep=';', on_bad_lines='skip', dtype=str)
        
        print("Assigning sections based on page numbers...")
        # Apply mapping
        df['section_name'] = df['page_number'].apply(get_section_for_page)
        
        # Check for unmapped pages
        unmapped = df[df['section_name'] == 'Unknown Section']
        if not unmapped.empty:
            print(f"WARNING: {len(unmapped)} rows could not be mapped to a section.")
            print("Unmapped pages:", unmapped['page_number'].unique())
        else:
            print("All rows mapped successfully.")

        # Save
        print(f"Saving to {OUTPUT_FILE}...")
        df.to_csv(OUTPUT_FILE, index=False, sep=';')
        print("Done!")
        
        # Preview
        print("\nPreview:")
        print(df[['page_number', 'section_name']].head())
        print(df[['page_number', 'section_name']].tail())

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    assign_sections()
