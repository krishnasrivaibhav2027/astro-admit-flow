
import pdfplumber
import os

def extract_debug_text():
    pdf_path = os.path.join(os.path.dirname(__file__), "NCERT-Math.pdf")
    print(f"Reading {pdf_path}...")
    
    if not os.path.exists(pdf_path):
        print("PDF NOT FOUND!")
        return

    text_output = ""
    with pdfplumber.open(pdf_path) as pdf:
        # Read first 15 pages (TOC is usually here)
        for i in range(min(15, len(pdf.pages))):
            page = pdf.pages[i]
            text = page.extract_text()
            text_output += f"\n--- PAGE {i+1} ---\n"
            text_output += text if text else "[NO TEXT EXTRACTED]"
            
    with open("debug_math_toc.txt", "w", encoding="utf-8") as f:
        f.write(text_output)
    
    print("Saved text to debug_math_toc.txt")

if __name__ == "__main__":
    extract_debug_text()
