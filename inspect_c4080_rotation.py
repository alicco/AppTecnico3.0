import fitz
import sys

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"c:\Users\forza\Gemini\AppTecnico3.0\FilePmCompleti\C4080pm.pdf"

try:
    doc = fitz.open(pdf_path)
    output = []
    output.append(f"PDF has {len(doc)} pages.")
    
    for i in range(min(5, len(doc))):
        page = doc[i]
        output.append(f"Page {i+1}:")
        output.append(f"  Rotation: {page.rotation}")
        output.append(f"  Rect: {page.rect}")
        # Check text orientation?
        text = page.get_text("dict", flags=11)["blocks"]
        if text:
            output.append(f"  First block: {text[0]['bbox']}")

    with open('rotation_info.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    print("Info written to rotation_info.txt")

except Exception as e:
    print(f"Error: {e}")
