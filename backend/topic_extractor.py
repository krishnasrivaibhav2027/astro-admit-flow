
import os
import json
import logging
import hashlib
import pdfplumber
import asyncio
from typing import List, Dict
from dotenv import load_dotenv
from supabase import create_client, Client

# Use existing settings manager for consistent LLM configuration
from settings_manager import settings_manager
from langchain_google_genai import ChatGoogleGenerativeAI
from prompts import topic_extraction_prompt

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

load_dotenv()

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

PDF_FILES = {
    "physics": "NCERT-Physics.pdf",
    "math": "NCERT-Math.pdf",
    "chemistry": "NCERT-Chemistry.pdf"
}

from ai_service import get_llm

# Legacy local get_llm removed. Using central one.

def calculate_pdf_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def extract_toc_text(pdf_path: str, max_search_pages: int = 300) -> str:
    """
    Advanced extraction: Scans the ENTIRE PDF (up to max_search_pages) for TOC markers.
    Aggregates ALL found TOC sections to handle merged PDFs (e.g., Part 1 + Part 2).
    """
    if not os.path.exists(pdf_path):
        logging.error(f"❌ PDF not found: {pdf_path}")
        return ""
        
    logging.info(f"📖 Deep Scanning {pdf_path} (Limit {max_search_pages} pages)...")
    import re
    
    found_contexts = []
    processed_pages = set()
    
    SEARCH_PATTERN = r'Contents(\s|\n)+(of)?|Table\s+of\s+Contents|Syllabus|Chapter\s+1|Unit\s+1'
    
    # 1. Try PDFPlumber (Primary)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            pages_to_check = min(total_pages, max_search_pages)
            
            i = 0
            while i < pages_to_check:
                if i in processed_pages:
                    i += 1
                    continue
                    
                page_text = pdf.pages[i].extract_text() or ""
                
                # Check Pattern
                match = re.search(SEARCH_PATTERN, page_text, re.IGNORECASE)
                if match:
                    logging.info(f"✅ Found Keyword '{match.group(0)}' via PLUMBER on Page {i+1}")
                    
                    # Capture Context (This Page + Next 5)
                    context_chunk = f"\n--- TOC SECTION FOUND (Page {i+1}) ---\n"
                    
                    # Determine range to capture
                    end_capture = min(i + 6, total_pages)
                    
                    for j in range(i, end_capture):
                        if j not in processed_pages:
                            text = pdf.pages[j].extract_text() or ""
                            context_chunk += f"\n--- Page {j+1} ---\n{text}"
                            processed_pages.add(j)
                    
                    found_contexts.append(context_chunk)
                    
                    # Skip ahead to avoid re-triggering on the immediate next pages 
                    # (though processed_pages set handles it, jumping is deeper optimization)
                    i = end_capture - 1 
                
                i += 1

    except Exception as e:
        logging.warning(f"⚠️ PDFPlumber failed: {e}")

    # 2. Try PyPDF (Fallback - Only if NOTHING found by Plumber)
    if not found_contexts:
        try:
            logging.info("🔄 Trying PyPDF fallback (Full Scan)...")
            import pypdf
            reader = pypdf.PdfReader(pdf_path)
            total_pages = len(reader.pages)
            pages_to_check = min(total_pages, max_search_pages)
            
            i = 0
            while i < pages_to_check:
                # We reuse processed_pages logic? No, separate run.
                page_text = reader.pages[i].extract_text() or ""
                match = re.search(SEARCH_PATTERN, page_text, re.IGNORECASE)
                if match:
                     logging.info(f"✅ Found Keyword '{match.group(0)}' via PYPDF on Page {i+1}")
                     context_chunk = f"\n--- TOC SECTION FOUND (Page {i+1}) ---\n"
                     end_capture = min(i + 6, total_pages)
                     for j in range(i, end_capture):
                         text = reader.pages[j].extract_text() or ""
                         context_chunk += f"\n--- Page {j+1} ---\n{text}"
                     found_contexts.append(context_chunk)
                     i = end_capture - 1
                i += 1
        except Exception as e:
             logging.warning(f"⚠️ PyPDF failed: {e}")

    # Results
    if found_contexts:
        final_text = "\n\n".join(found_contexts)
        logging.info(f"📚 Aggregated {len(found_contexts)} TOC contexts.")
        return final_text

    logging.warning("❌ No keywords found in deep scan. Using first 10 pages raw.")
    # 3. Last Resort
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for i in range(min(10, len(pdf.pages))):
                text += f"\n{pdf.pages[i].extract_text()}"
        return text
    except:
        return ""

async def extract_topics_for_subject(subject: str, pdf_filename: str) -> List[str]:
    """Extract topics for a single subject using LLM"""
    pdf_path = os.path.join(os.path.dirname(__file__), pdf_filename)
    
    if not os.path.exists(pdf_path):
        logging.error(f"❌ File not found: {pdf_path}")
        return []

    # 1. Calculate Hash
    current_hash = calculate_pdf_hash(pdf_path)
    logging.info(f"🔒 PDF Hash for {subject}: {current_hash[:8]}...")

    # 2. Check Idempotency (DB)
    # Check if we already have topics for this specific hash
    existing = supabase.table("topics").select("id", count="exact").eq("subject", subject).eq("pdf_hash", current_hash).execute()
    if existing.count and existing.count > 0:
        logging.info(f"⏭️ Topics already exist for this version of {subject}. Skipping extraction.")
        return ["(Existing Topics Preserved)"] 

    # 3. Get raw text from TOC area
    context_text = extract_toc_text(pdf_path)
    if not context_text:
        logging.warning(f"⚠️ No text extracted for {subject}. Skipping.")
        return []

    # 4. Invoke LLM
    llm = get_llm()
    prompt = topic_extraction_prompt.format_messages(
        subject=subject,
        context=context_text
    )
    
    logging.info(f"🤖 Sending request to Gemini for {subject}...")
    try:
        response = await llm.ainvoke(prompt)
        content = response.content.replace('```json', '').replace('```', '').strip()
        
        # Parse JSON
        data = json.loads(content)
        topics = data.get("topics", [])
        
        if topics:
            logging.info(f"✅ Extracted {len(topics)} topics for {subject}. Saving to DB...")
            
            # 5. Save to DB
            topics_to_insert = [
                {
                    "subject": subject,
                    "topic_name": t,
                    "pdf_hash": current_hash
                } for t in topics
            ]
            
            # Batch insert
            supabase.table("topics").insert(topics_to_insert).execute()
            logging.info("💾 Saved to Supabase 'topics' table.")
            
            # 6. Update topics.json (Sync)
            try:
                topics_file = os.path.join(os.path.dirname(__file__), "topics.json")
                json_data = {}
                
                if os.path.exists(topics_file):
                    with open(topics_file, 'r') as f:
                        try:
                            json_data = json.load(f)
                        except json.JSONDecodeError:
                            json_data = {}
                
                # Update subject topics
                json_data[subject.lower()] = topics
                
                with open(topics_file, 'w') as f:
                    json.dump(json_data, f, indent=4)
                    
                logging.info(f"💾 Synced {subject} topics to topics.json")
                
            except Exception as e:
                logging.error(f"⚠️ Failed to update topics.json: {e}")

        return topics
        
    except Exception as e:
        logging.error(f"❌ Error extracting topics for {subject}: {e}")
        return []

async def run_extraction() -> Dict[str, int]:
    """Run the full topic extraction process and return stats"""
    stats = {}
    
    for subject, filename in PDF_FILES.items():
        logging.info(f"\n--- Processing {subject.upper()} ---")
        topics = await extract_topics_for_subject(subject, filename)
        if topics:
            stats[subject] = len(topics)
        else:
            logging.warning(f"⚠️ Could not extract topics for {subject}")
            stats[subject] = 0
            
    return stats

async def main():
    """Main entry point CLI"""
    stats = await run_extraction()
    print("\nExtraction Summary:")
    print(json.dumps(stats, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
