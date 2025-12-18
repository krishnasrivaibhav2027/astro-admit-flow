
import pdfplumber
import os
import re

def analyze_pdf():
    pdf_path = os.path.join(os.path.dirname(__file__), "NCERT-Math.pdf")
    print(f"Analyzing {pdf_path}...")
    
    if not os.path.exists(pdf_path):
        print("❌ PDF NOT FOUND")
        return

    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total Pages: {len(pdf.pages)}")
        
        toc_found = False
        toc_text = ""
        
        for i, page in enumerate(pdf.pages[:15]): # Check first 15 pages
            text = page.extract_text()
            if not text:
                print(f"Page {i+1}: [NO TEXT]")
                continue
                
            clean_text = text.replace("\n", " ")[:100] # First 100 chars
            print(f"Page {i+1}: {clean_text}...")
            
            # Check for "Contents" keyword
            if re.search(r'\bContents\b', text, re.IGNORECASE):
                print(f"✅ FOUND 'Contents' on Page {i+1}!")
                toc_found = True
                # Capture this page and next 2
                toc_text += f"\n--- Page {i+1} ---\n{text}"
                if i+1 < len(pdf.pages):
                     toc_text += f"\n--- Page {i+2} ---\n{pdf.pages[i+1].extract_text()}"
                if i+2 < len(pdf.pages):
                     toc_text += f"\n--- Page {i+3} ---\n{pdf.pages[i+2].extract_text()}"
                break
        
        if toc_found:
            print("\n--- EXTRACTED TOC CONTEXT ---")
            print(toc_text[:500] + "...") # Print start
        else:
            print("❌ 'Contents' keyword NOT found in first 15 pages.")

if __name__ == "__main__":
    analyze_pdf()
