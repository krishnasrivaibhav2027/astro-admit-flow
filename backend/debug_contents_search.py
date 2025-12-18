
import pdfplumber
import os
import re

def search_for_contents_header():
    pdf_path = os.path.join(os.path.dirname(__file__), "NCERT-Math.pdf")
    output_file = "debug_contents_found.txt"
    
    print(f"Scanning {pdf_path} for 'Contents of'...")
    
    found_context = ""
    
    if not os.path.exists(pdf_path):
        print("PDF Found: False")
        return

    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages[:20]):
            text = page.extract_text()
            if not text:
                continue
            
            # Normalize whitespace for flexible matching
            # The user sees "Contents of \n MATHEMATICS PART I"
            # So searching for "Contents of" might fail if "of" is on a newline?
            # User screenshot: "Contents of" is on one line.
            
            if "Contents of" in text:
                print(f"✅ FOUND 'Contents of' on Page {i+1}")
                found_context += f"\n--- PAGE {i+1} START ---\n"
                found_context += text
                found_context += f"\n--- PAGE {i+1} END ---\n"
            elif "Contents" in text:
                 # Backup check
                 print(f"⚠️ Found generic 'Contents' on Page {i+1}")
                 found_context += f"\n--- PAGE {i+1} (Generic Match) ---\n"
                 found_context += text
                 
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(found_context)
    print(f"Dumped context to {output_file}")

if __name__ == "__main__":
    search_for_contents_header()
