
import os
import pdfplumber
import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from supabase import create_client, Client
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)

load_dotenv()

# Initialize Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Files to migrate
FILES = {
    "physics": "NCERT-Physics.pdf",
    "math": "NCERT-Math.pdf",
    "chemistry": "NCERT-Chemistry.pdf"
}

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text = ""
    logging.info(f"📄 Extracting text from {pdf_path}...")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if (i + 1) % 50 == 0:
                    logging.info(f"   Processed {i + 1}/{total_pages} pages...")
        logging.info(f"✅ Extracted {len(text)} characters")
        return text
    except Exception as e:
        logging.error(f"Error reading PDF {pdf_path}: {e}")
        return ""

def migrate():
    """Migrate all subjects to Supabase"""
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    
    for subject, filename in FILES.items():
        pdf_path = os.path.join(os.path.dirname(__file__), filename)
        if not os.path.exists(pdf_path):
            logging.warning(f"⚠️ File not found: {filename}. Skipping.")
            continue
            
        logging.info(f"🚀 Processing {subject.upper()}...")
        
        # 1. Extract
        raw_text = extract_text_from_pdf(pdf_path)
        if not raw_text:
            continue
            
        # 2. Split
        docs = splitter.create_documents([raw_text])
        logging.info(f"🔪 Split into {len(docs)} chunks")
        
        # 3. Add Metadata
        for doc in docs:
            doc.metadata = {"subject": subject, "source": filename}
            
        # 4. Upload to Supabase
        logging.info(f"🔮 Uploading embeddings for {subject}...")
        try:
            # Batch upload handled by LangChain usually, but for large files we might want to chunk?
            # Supabase vector store handles it.
            SupabaseVectorStore.from_documents(
                documents=docs,
                embedding=embeddings,
                client=supabase,
                table_name="documents",
                query_name="match_documents"
            )
            logging.info(f"✅ Successfully migrated {subject}")
        except Exception as e:
            logging.error(f"❌ Error uploading {subject}: {e}")

if __name__ == "__main__":
    confirm = input("This will upload embeddings to Supabase (costly operation). Continue? (y/n): ")
    if confirm.lower() == 'y':
        migrate()
    else:
        print("Cancelled.")
