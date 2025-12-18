
import pdfplumber
import os

def dump_math_start():
    pdf_path = os.path.join(os.path.dirname(__file__), "NCERT-Math.pdf")
    print(f"Dumping first 10 pages of {pdf_path}...")
    
    output = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i in range(min(10, len(pdf.pages))):
            text = pdf.pages[i].extract_text()
            output += f"\n\n--- PAGE {i+1} ---\n{text}\n"
            
    with open("math_dump.txt", "w", encoding="utf-8") as f:
        f.write(output)
    print("Dumped to math_dump.txt")

if __name__ == "__main__":
    dump_math_start()
