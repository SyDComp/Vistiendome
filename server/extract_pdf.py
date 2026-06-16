import pypdf
import os

pdf_path = "../Propuesta_vistiendome.pdf"
output_path = "propuesta_text.txt"

if not os.path.exists(pdf_path):
    print(f"Error: {pdf_path} not found")
    exit(1)

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n\n"
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Successfully extracted text to {output_path}")
except Exception as e:
    print(f"An error occurred: {e}")
