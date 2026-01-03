import pdfplumber

pdf_path = "docs/dipswC6100.pdf"

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        if i >= 3: break
        print(f"--- Page {i+1} ---")
        print(page.extract_text())
        print("----------------")
